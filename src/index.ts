import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { startProjectSchema } from "./share/schema.js";
import { API_ENDPOINTS, downloadFile, fetchApi } from "./share/api.js";
import path from "path";
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { stderr } from "process";
import { extractZip, getRobotConfig } from "./share/file.js";

// mcp server 생성
const server = new Server({
  name: "mcp-server",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {}
  }
});

// 설정 파일에서 값을 읽어옴
const sysUserId = getRobotConfig('MANAGER_USER');
const runnerPath = getRobotConfig('AntBot Runner');

if (sysUserId === "" || runnerPath === "") {
  throw new McpError(ErrorCode.InternalError, 'AntBot Robot에서 매니저 연동을 먼저 진행해주세요.\n');
}

// 툴 목록 조회
server.setRequestHandler(ListToolsRequestSchema, async () => {
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
                name: 'Run_AntBot_Project',
                description: 'Run the project with the project ID provided by the user.',
                inputSchema: {
                type: 'object',
                properties: {
                    projectId: { type: 'string' },
                },
                required: ['projectId']
                }
            }
        ]
    };
  });
  
// 툴 요청 처리
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'Get_AntBot_Project_List') {
      try {
          const data = await fetchApi(API_ENDPOINTS.PROJECT_LIST, {
            SysUserId: sysUserId,
          });

          return ({
              toolResult: data
          })

      } catch (e: any) {
        throw new Error(e.message);
      }
  }
  if (request.params.name === 'Run_AntBot_Project') {
      try {
          var parsed = startProjectSchema.parse(request.params.arguments);
          var projectId = parsed.projectId;

          // projectId 기반으로 project 버전 조회
          var versionNo = '1';
          const versionList = await fetchApi(API_ENDPOINTS.PROJECT_VERSION_LIST, {
            SysUserId: sysUserId,
            ProjectId: projectId,
          });
          versionNo = versionList[versionList.length - 1]?.versionNo;

          // 다운로드 요청
          const requestData = {
              SysUserId: sysUserId,
              ProjectId: projectId,
              VersionNo: versionNo,
          };

          stderr.write(`Download 요청: SysUserId=${requestData.SysUserId}, ProjectId=${requestData.ProjectId}, VersionNo=${requestData.VersionNo}\n`);

          const projectPath = await downloadFile(API_ENDPOINTS.PROJECT_DOWNLOAD, requestData);
          
          // 다운받은 프로젝트(.zip) 압축해제
          const unzipPath = await extractZip(projectPath);
          const antConfPath = path.join(unzipPath, 'antConf.xml');
          if (!existsSync(antConfPath)) {
              throw new McpError(ErrorCode.InternalError, '파일 다운로드 실패: 압축 경로에 antConf.xml 파일이 존재하지 않습니다.\n');
          }

          // run project
          const args = [ antConfPath, 'mcprun' ];

          try
          {
              const runner = spawn(runnerPath, args, {
                  detached: true,
                  stdio: 'ignore',
                  windowsHide: false,
              });

              runner.unref();
          }
          catch (spawnError: any) {
              throw new McpError(ErrorCode.InternalError, `Runner 실행 실패: ${spawnError.message}\n`);
          }

          return ({
              toolResult: {
                  result: 'yes',
                  message: 'AntBot Runner 실행 성공'
              }
          })

      } catch (e: any) {
          throw new McpError(ErrorCode.InternalError, e.message + '\n');
      }
  }

  throw new McpError(ErrorCode.MethodNotFound, 'Method(Tool) not found\n');
});

// mcp server 실행 (stdio 통신)
const transport = new StdioServerTransport();
await server.connect(transport);