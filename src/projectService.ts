import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import sudo from 'sudo-prompt';
import { CONFIG } from './constants.js';
import { logger } from './logger.js';
import { createApiEndpoints, fetchApi, downloadFile } from './api.js';
import { extractZip, parseProjectInfo, formatParameterSummary, validateAntConfPath } from './fileUtils.js';
import { 
  AppConfig, 
  CacheEntry, 
  ProjectInfo, 
  ProjectListResponse, 
  VersionListResponse,
  RunProjectArgs 
} from './types.js';

/**
 * 프로젝트 서비스 클래스
 */
export class ProjectService {
  private readonly config: AppConfig;
  private readonly apiEndpoints: ReturnType<typeof createApiEndpoints>;
  private readonly projectInfoCache = new Map<string, CacheEntry>();

  constructor(config: AppConfig) {
    this.config = config;
    this.apiEndpoints = createApiEndpoints(config.apiBaseUrl);
  }

  /**
   * 프로젝트 목록을 조회합니다.
   * @returns 프로젝트 목록
   */
  async getProjectList(): Promise<ProjectListResponse> {
    try {
      logger.debug('프로젝트 목록 조회 시작');
      
      const data = await fetchApi<ProjectListResponse>(this.apiEndpoints.PROJECT_LIST, {
        SysUserId: this.config.sysUserId,
      });

      logger.info(`프로젝트 목록 조회 완료: ${data.projects?.length || 0}개`);
      return data;
    } catch (error) {
      logger.error('프로젝트 목록 조회 실패', error as Error);
      throw new McpError(
        ErrorCode.InternalError, 
        `프로젝트 목록 조회 실패: ${(error as Error).message}`
      );
    }
  }

  /**
   * 프로젝트 정보를 조회합니다.
   * @param projectId - 프로젝트 ID
   * @returns 프로젝트 상세 정보
   */
  async getProjectInfo(projectId: string): Promise<{
    projectId: string;
    projectPath: string;
    name: string;
    description: string;
    requiredParameters: any[];
    optionalParameters: any[];
    parameterSummary: string;
  }> {
    try {
      logger.debug(`프로젝트 정보 조회 시작: ${projectId}`);

      // 최신 버전 조회
      const versionNo = await this.getLatestVersionNumber(projectId);
      
      // 프로젝트 다운로드
      const projectPath = await this.downloadProject(projectId, versionNo);
      
      // 압축 해제 및 파싱
      const unzipPath = await extractZip(projectPath);
      const antConfPath = validateAntConfPath(unzipPath);
      const parseResult = await parseProjectInfo(antConfPath);
      
      const result = {
        projectId: projectId,
        projectPath: antConfPath,
        name: parseResult.name,
        description: parseResult.description,
        requiredParameters: parseResult.requiredParameters,
        optionalParameters: parseResult.optionalParameters,
        parameterSummary: formatParameterSummary(parseResult)
      };

      // 캐시에 저장
      this.updateProjectInfoCache(projectId, antConfPath, result);
      
      logger.info(`프로젝트 정보 조회 완료: ${parseResult.name}`);
      return result;
    } catch (error) {
      logger.error(`프로젝트 정보 조회 실패: ${projectId}`, error as Error);
      throw error;
    }
  }

  /**
   * 프로젝트를 실행합니다.
   * @param args - 실행 인자
   */
  async runProject(args: RunProjectArgs): Promise<{ result: string; message: string; }> {
    const { projectId, projectPath, parameters = {} } = args;

    try {
      logger.debug(`프로젝트 실행 시작: ${projectId}`);

      // 프로젝트 정보 캐시 확인
      this.validateProjectExecution(projectId);

      // AntBot Runner 실행
      await this.executeAntBotRunner(projectPath, parameters);

      const message = 'AntBot Runner 실행 요청을 전송했습니다.';
      logger.info(`프로젝트 실행 완료: ${projectId} - ${message}`);
      
      return {
        result: 'success',
        message
      };
    } catch (error) {
      logger.error(`프로젝트 실행 실패: ${projectId}`, error as Error);
      throw new McpError(ErrorCode.InternalError, (error as Error).message);
    }
  }

  /**
   * 프로젝트 정보 캐시가 유효한지 확인합니다.
   * @param projectId - 프로젝트 ID
   * @returns 캐시가 유효하면 true
   */
  private hasValidProjectInfo(projectId: string): boolean {
    const cached = this.projectInfoCache.get(projectId);
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.checkedAt) < CONFIG.CACHE.INFO_DURATION;
  }

  /**
   * 프로젝트 실행 전 유효성을 검사합니다.
   * @param projectId - 프로젝트 ID
   * @throws McpError - 캐시된 프로젝트 정보가 없는 경우
   */
  private validateProjectExecution(projectId: string): void {
    if (!this.hasValidProjectInfo(projectId)) {
      throw new McpError(
        ErrorCode.InvalidRequest, 
        `프로젝트 실행 전에 먼저 Get_AntBot_Project_Info를 호출하여 프로젝트 정보를 확인해주세요. (Project ID: ${projectId})`
      );
    }
  }

  /**
   * 최신 버전 번호를 조회합니다.
   * @param projectId - 프로젝트 ID
   * @returns 최신 버전 번호
   */
  private async getLatestVersionNumber(projectId: string): Promise<string> {
    const versionList = await fetchApi<VersionListResponse>(this.apiEndpoints.PROJECT_VERSION_LIST, {
      SysUserId: this.config.sysUserId,
      ProjectId: projectId,
    });

    if (!versionList || versionList.length === 0) {
      throw new McpError(ErrorCode.InternalError, '프로젝트 버전 정보를 찾을 수 없습니다.');
    }

    return versionList[versionList.length - 1]?.versionNo || '1';
  }

  /**
   * 프로젝트를 다운로드합니다.
   * @param projectId - 프로젝트 ID
   * @param versionNo - 버전 번호
   * @returns 다운로드된 파일 경로
   */
  private async downloadProject(projectId: string, versionNo: string): Promise<string> {
    const requestData = {
      SysUserId: this.config.sysUserId,
      ProjectId: projectId,
      VersionNo: versionNo,
    };

    logger.debug(`다운로드 요청: ${JSON.stringify(requestData)}`);
    return await downloadFile(this.apiEndpoints.PROJECT_DOWNLOAD, requestData);
  }

  /**
   * AntBot Runner를 실행합니다.
   * @param projectPath - 프로젝트 경로
   * @param parameters - 실행 매개변수
   */
  private async executeAntBotRunner(projectPath: string, parameters: Record<string, any>): Promise<void> {
    const runnerArgs = [projectPath, CONFIG.RUNNER.COMMAND_MODE];

    // parameters 객체를 base64로 인코딩해서 추가
    if (Object.keys(parameters).length > 0) {
      const parametersJson = JSON.stringify(parameters);
      const parametersBase64 = Buffer.from(parametersJson, 'utf8').toString('base64');
      runnerArgs.push(parametersBase64);
    }

    const command = `"${this.config.runnerPath}" ${runnerArgs.map(arg => `"${arg}"`).join(' ')}`;
    const options = { name: CONFIG.RUNNER.NAME };

    logger.debug(`Runner 실행 명령: ${command}`);

    return new Promise((resolve, reject) => {
      sudo.exec(command, options, (error: any) => {
        if (error) {
          logger.error('Runner 실행 실패', error);
          reject(new Error(`Runner 실행 실패: ${error.message}`));
        } else {
          logger.debug('Runner 실행 성공');
          resolve();
        }
      });
    });
  }

  /**
   * 프로젝트 정보 캐시를 업데이트합니다.
   * @param projectId - 프로젝트 ID
   * @param projectPath - 프로젝트 경로
   * @param projectInfo - 프로젝트 정보
   */
  private updateProjectInfoCache(projectId: string, projectPath: string, projectInfo: any): void {
    this.projectInfoCache.set(projectId, {
      checkedAt: Date.now(),
      projectPath,
      projectInfo
    });
    
    logger.debug(`프로젝트 정보 캐시 업데이트: ${projectId}`);
  }
}