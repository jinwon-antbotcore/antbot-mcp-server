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

/**
 * MCP 서버 메인 클래스
 */
class McpServer {
  private readonly server: Server;
  private readonly projectService: ProjectService;

  constructor() {
    // 설정 검증 및 로드
    const config = validateAndGetConfig();
    
    // 프로젝트 서비스 초기화
    this.projectService = new ProjectService(config);
    
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
async function main(): Promise<void> {
  try {
    const mcpServer = new McpServer();
    await mcpServer.start();
  } catch (error) {
    logger.error('애플리케이션 시작 실패', error as Error);
    process.exit(1);
  }
}

// 애플리케이션 실행
main().catch((error) => {
  logger.error('처리되지 않은 오류', error);
  process.exit(1);
});