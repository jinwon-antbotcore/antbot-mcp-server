import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { existsSync, readFileSync, mkdirSync } from "fs";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import { parseStringPromise } from 'xml2js';
import { CONFIG } from './constants.js';
import { logger } from './logger.js';
import { ProjectParameter, ParsedXmlProject, ParsedXmlArgument, ProjectInfo } from './types.js';

/**
 * ZIP 파일을 임시 디렉토리에 압축 해제
 * @param zipPath - 압축 파일 경로
 * @returns 압축 해제된 디렉토리 경로
 * @throws McpError - 압축 해제 실패 시
 */
export async function extractZip(zipPath: string): Promise<string> {
  try {
    logger.debug(`ZIP 파일 압축 해제 시작: ${zipPath}`);
    
    const zip = new AdmZip(zipPath);
    const zipName = path.basename(zipPath, '.zip');
    const extractPath = path.join(os.tmpdir(), zipName);
    
    mkdirSync(extractPath, { recursive: true });
    zip.extractAllTo(extractPath, true);

    logger.debug(`ZIP 파일 압축 해제 완료: ${extractPath}`);
    return extractPath;
  } catch (error) {
    logger.error(`ZIP 파일 압축 해제 실패`, error as Error);
    throw new McpError(ErrorCode.InternalError, `ZIP 파일 압축 해제 실패: ${(error as Error).message}`);
  }
} 

/**
 * antConf.xml 파일을 파싱하여 프로젝트 정보를 추출합니다.
 * @param antConfPath - antConf.xml 파일 경로
 * @returns 파싱된 프로젝트 정보
 * @throws Error - 파싱 실패 시
 */
export async function parseProjectInfo(antConfPath: string): Promise<ProjectInfo> {
  try {
    logger.debug(`프로젝트 정보 파싱 시작: ${antConfPath}`);
    
    if (!existsSync(antConfPath)) {
      throw new Error(`antConf.xml 파일이 존재하지 않습니다: ${antConfPath}`);
    }

    const xmlContent = readFileSync(antConfPath, 'utf8');
    
    // XML을 JSON으로 파싱
    const result = await parseStringPromise(xmlContent, {
      explicitArray: false,
      ignoreAttrs: false,
      trim: true
    }) as { Project: ParsedXmlProject };
    
    const project = result.Project;
    
    // PolicyArgumentList 파싱
    const policyArgs = project.PolicyArgumentList?.PolicyArgument || [];
    
    // 배열이 아닌 경우 배열로 변환 (단일 요소인 경우)
    const argumentsArray: ParsedXmlArgument[] = Array.isArray(policyArgs) ? policyArgs : [policyArgs];
    
    // 필수/선택 매개변수 분리
    const { requiredParameters, optionalParameters } = parseParameters(argumentsArray);
    
    const projectInfo: ProjectInfo = {
      name: project.Name,
      description: project.Desc,
      main: project.Main,
      argumentBasedMode: project.ArgumentBasedMode === 'Y',
      headlessMode: project.HeadlessMode === 'Y',
      requiredParameters,
      optionalParameters,
    };

    logger.debug(`프로젝트 정보 파싱 완료: ${project.Name}`);
    return projectInfo;
  } catch (error) {
    logger.error(`antConf.xml 파싱 실패`, error as Error);
    throw new Error(`antConf.xml 파싱 실패: ${(error as Error).message}`);
  }
}

/**
 * XML 매개변수 배열을 필수/선택 매개변수로 분리합니다.
 * @param argumentsArray - XML에서 파싱된 매개변수 배열
 * @returns 필수/선택 매개변수 객체
 */
function parseParameters(argumentsArray: ParsedXmlArgument[]): {
  requiredParameters: ProjectParameter[];
  optionalParameters: ProjectParameter[];
} {
  const requiredParameters: ProjectParameter[] = [];
  const optionalParameters: ProjectParameter[] = [];
  
  argumentsArray.forEach(arg => {
    const paramInfo: ProjectParameter = {
      id: arg.Id,
      displayName: arg.DisplayName,
      description: arg.Description,
      type: arg.Type,
      direction: arg.Direction,
      mandatory: arg.Mandatory === 'True',
      defaultValue: arg.InputValue || null
    };
    
    if (paramInfo.mandatory) {
      requiredParameters.push(paramInfo);
    } else {
      optionalParameters.push(paramInfo);
    }
  });

  return { requiredParameters, optionalParameters };
}

/**
 * 프로젝트 정보를 요약 문자열로 포맷팅합니다.
 * @param projectInfo - 프로젝트 정보
 * @returns 포맷팅된 요약 문자열
 */
export function formatParameterSummary(projectInfo: ProjectInfo): string {
  let summary = `프로젝트: ${projectInfo.name}\n`;
  
  if (projectInfo.description) {
    summary += `설명: ${projectInfo.description}\n`;
  }
  
  summary += '\n';
  
  if (projectInfo.requiredParameters.length > 0) {
    summary += "필수 매개변수:\n";
    projectInfo.requiredParameters.forEach(param => {
      summary += `- ${param.displayName} (${param.id}): ${param.description}\n`;
    });
  }
  
  if (projectInfo.optionalParameters.length > 0) {
    summary += "\n선택 매개변수:\n";
    projectInfo.optionalParameters.forEach(param => {
      summary += `- ${param.displayName} (${param.id}): ${param.description}`;
      if (param.defaultValue) {
        summary += ` (기본값: ${param.defaultValue})`;
      }
      summary += '\n';
    });
  }
  
  return summary;
}

/**
 * antConf.xml 파일 경로의 유효성을 검사합니다.
 * @param projectPath - 프로젝트 경로
 * @returns antConf.xml 파일의 전체 경로
 * @throws McpError - 파일이 존재하지 않는 경우
 */
export function validateAntConfPath(projectPath: string): string {
  const antConfPath = path.join(projectPath, CONFIG.FILES.ANT_CONF_FILE);
  
  if (!existsSync(antConfPath)) {
    throw new McpError(
      ErrorCode.InternalError, 
      `파일 다운로드 실패: 압축 경로에 ${CONFIG.FILES.ANT_CONF_FILE} 파일이 존재하지 않습니다.`
    );
  }
  
  return antConfPath;
}