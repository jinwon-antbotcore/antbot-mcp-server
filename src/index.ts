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
import { extractZip } from "./share/zip.js";
import WinReg from 'winreg';
import path from "path";
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { stderr } from "process";

// mcp server 생성
const server = new Server({
  name: "mcp-server",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {}
  }
});

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
          const requestData = {
              SysUserId: 'admin',
          };
          stderr.write(`Get_AntBot_Project_List 요청 : ${requestData}`);
          const data = await fetchApi(API_ENDPOINTS.PROJECT_LIST, requestData);

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

          // download project
          const requestData = {
              SysUserId: 'admin',
              ProjectId: projectId,
              VersionNo: '1',
          };

          stderr.write(`Download 요청: SysUserId=${requestData.SysUserId}, ProjectId=${requestData.ProjectId}, VersionNo=${requestData.VersionNo}\n`);

          const projectPath = await downloadFile(API_ENDPOINTS.PROJECT_DOWNLOAD, requestData);
          
          // 압축해제
          const unzipPath = await extractZip(projectPath);
          const xmlPath = path.join(unzipPath, 'antConf.xml');
          if (!existsSync(xmlPath)) {
              throw new McpError(ErrorCode.InternalError, '파일 다운로드 실패: 압축 경로에 antConf.xml 파일이 존재하지 않습니다.');
          }

          // run project
          const robotInstallPath = await getInstallPath();
          const runnerPath = path.join(
              path.dirname(robotInstallPath),
              'Runner',
              'AntBot Runner.exe'
          );

          if (robotInstallPath === "" || runnerPath === "") {
              throw new McpError(ErrorCode.InternalError, 'Robot install path not found');
          }

          const args = [ xmlPath, 'mcprun' ];

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
              throw new McpError(ErrorCode.InternalError, `Runner 실행 실패: ${spawnError.message}`);
          }

          return ({
              toolResult: {
                  result: 'yes',
                  message: 'AntBot Runner 실행 성공'
              }
          })

      } catch (e: any) {
          throw new McpError(ErrorCode.InternalError, e.message);
      }
  }

  throw new McpError(ErrorCode.MethodNotFound, 'Method(Tool) not found');
});

function getInstallPath(): Promise<string> {
  const regKey = new WinReg({
    hive: WinReg.HKLM,
    key: '\\SOFTWARE\\AntBotRobot'
  });

  return new Promise((resolve, reject) => {
    regKey.get('InstallPath', (err, item) => {
      if (err) {
        reject(new Error('\\SOFTWARE\\AntBotRobot reg key not found'));
      } else {
        resolve(item.value);
      }
    });
  });
}

// mcp server 실행 (stdio 통신)
const transport = new StdioServerTransport();
await server.connect(transport);