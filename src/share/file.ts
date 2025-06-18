import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { existsSync, readFileSync, mkdirSync } from "fs";
import path from "path";
import { stderr } from "process";
import os from "os";
import AdmZip from "adm-zip";
import { JSDOM } from 'jsdom';

// AntBot 경로 상수
export const SYSTEM_PATHS = {
    ANT_BOT_LOG: path.join(os.homedir(), '.AntBot', 'Log', 'Develop'),
    ANT_BOT_CONFIG: path.join(os.homedir(), 'AppData', 'Roaming', 'AntBotRobot', 'AntBot_Robot.exe.config')
} as const;

/**
 * ZIP 파일을 임시 디렉토리에 압축 해제
 * @param zipPath - 압축 파일 경로
 * @returns 압축 해제된 디렉토리 경로
 */
export async function extractZip(zipPath: string): Promise<string> {
    try {
        const zip = new AdmZip(zipPath);
        const zipName = path.basename(zipPath, '.zip');
        const extractPath = path.join(os.tmpdir(), zipName);
        mkdirSync(extractPath, { recursive: true });

        // ZIP 파일 압축 해제
        zip.extractAllTo(extractPath, true);

        return extractPath;
    } catch (error) {
        throw new McpError(ErrorCode.InternalError, `ZIP 파일 압축 해제 실패: ${error}\n`);
    }
} 

// 설정 파일에서 MANAGER_USER 값을 읽어오는 함수
export function getRobotConfig(key: string): string {
    try {
      if (!existsSync(SYSTEM_PATHS.ANT_BOT_CONFIG)) {
        throw new McpError(ErrorCode.InternalError, '설정 파일을 찾을 수 없습니다.\n');
      }
  
      const xmlContent = readFileSync(SYSTEM_PATHS.ANT_BOT_CONFIG, 'utf-8');
      const dom = new JSDOM(xmlContent, { contentType: 'text/xml' });
      const xmlDoc = dom.window.document;
      
      const appSettings = xmlDoc.getElementsByTagName('appSettings')[0];
      if (!appSettings) {
        throw new McpError(ErrorCode.InternalError, '설정 파일에서 appSettings를 찾을 수 없습니다.\n');
      }

      const addElements = appSettings.getElementsByTagName('add');
      
      for (let i = 0; i < addElements.length; i++) {
        const element = addElements[i];
        if (element.getAttribute('key') === key) {
          return element.getAttribute('value') || '';
        }
      }
      
      return ''; // 기본값
    } catch (error) {
      stderr.write(`설정 파일 읽기 실패: ${error}\n`);
      return ''; // 에러 발생 시 기본값 반환
    }
  }