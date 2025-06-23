import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

// 내부 모듈 임포트
import { validateAndGetConfig } from "./config.js";
import { logger } from "./logger.js";
import { ProjectService } from "./projectService.js";
import { startProjectSchema, runProjectSchema } from "./schema.js";
import { LogService } from "./logService.js";

/**
 * MCP 서버 메인 클래스
 */
class McpServer {
  private readonly server: Server;
  private readonly projectService: ProjectService;
  private readonly logService: LogService;

  constructor() {
    // 설정 검증 및 로드
    const config = validateAndGetConfig();
    
    // 서비스 초기화
    this.projectService = new ProjectService(config);
    this.logService = new LogService();
    
    // MCP 서버 생성
    this.server = new Server({
      name: "antbot-mcp-server",
      version: "1.0.0",
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.setupHandlers();
    logger.info('MCP 서버 초기화 완료');
  }

  /**
   * 요청 핸들러들을 설정합니다.
   */
  private setupHandlers(): void {
    this.setupToolListHandler();
    this.setupToolCallHandler();
  }

  /**
   * 툴 목록 조회 핸들러를 설정합니다.
   */
  private setupToolListHandler(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('툴 목록 조회 요청');
      
      return {
        tools: [
          {
            name: 'Get_AntBot_Project_List',
            description: 'Returns a list of antbot projects.',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'Get_AntBot_Project_Info',
            description: 'Get project information including required parameters',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: { type: 'string' }
              },
              required: ['projectId']
            }
          },
          {
            name: 'Run_AntBot_Project',
            description: 'Run the project with required parameters',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: { type: 'string' },
                projectPath: { type: 'string' },
                parameters: { 
                  type: 'object',
                  additionalProperties: true
                }
              },
              required: ['projectId', 'projectPath']
            }
          },
          {
            name: 'Get_Last_Mcprun_Log',
            description: 'Returns the last 100 lines of the latest mcprun log.',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        ]
      };
    });
  }

  /**
   * 툴 호출 핸들러를 설정합니다.
   */
  private setupToolCallHandler(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.debug(`툴 호출 요청: ${name}`);

      try {
        switch (name) {
          case 'Get_AntBot_Project_List':
            return await this.handleGetProjectList();
            
          case 'Get_AntBot_Project_Info':
            return await this.handleGetProjectInfo(args);
            
          case 'Run_AntBot_Project':
            return await this.handleRunProject(args);
            
          case 'Get_Last_Mcprun_Log':
            return await this.handleGetLastLog();
            
          default:
            throw new McpError(ErrorCode.MethodNotFound, `지원하지 않는 메서드입니다: ${name}`);
        }
      } catch (error) {
        logger.error(`툴 호출 실패: ${name}`, error as Error);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(ErrorCode.InternalError, (error as Error).message);
      }
    });
  }

  /**
   * 프로젝트 목록 조회를 처리합니다.
   */
  private async handleGetProjectList() {
    const data = await this.projectService.getProjectList();
    return { toolResult: data };
  }

  /**
   * 프로젝트 정보 조회를 처리합니다.
   */
  private async handleGetProjectInfo(args: any) {
    const parsed = startProjectSchema.parse(args);
    const result = await this.projectService.getProjectInfo(parsed.projectId);
    return { toolResult: result };
  }

  /**
   * 프로젝트 실행을 처리합니다.
   */
  private async handleRunProject(args: any) {
    const parsed = runProjectSchema.parse(args);
    const result = await this.projectService.runProject(parsed);
    return { toolResult: result };
  }

  /**
   * MCP를 통한 최신 Runner 실행 로그의 마지막 100줄을 반환합니다.
   */
  private async handleGetLastLog() {
    logger.debug('최신 mcprun 로그 조회 시작');
    const result = await this.logService.getLastRunnerLog(100);
    logger.info(`로그 반환: ${result.fileName} - ${result.content.split('\n').length}줄`);
    return { toolResult: result };
  }

  /**
   * 서버를 시작합니다.
   */
  async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info('MCP 서버 시작 완료');
    } catch (error) {
      logger.error('MCP 서버 시작 실패', error as Error);
      throw error;
    }
  }
}

/**
 * 애플리케이션 진입점
 */
function main(): void {
  try {
    const mcpServer = new McpServer();
    mcpServer.start();
  } catch (error) {
    logger.error('애플리케이션 시작 실패', error as Error);
    process.exit(1);
  }
}

main();