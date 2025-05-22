
# AntBot-MCP-Server

**AntBot-MCP-Server**는 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 기반의 TypeScript 서버 구현체로, AI 기반 RPA 플랫폼인 AntBot과의 연동을 위해 설계되었습니다.  
이 서버는 MCP 도구 명세에 따라 MCP 클라이언트와 상호작용하며, 도구 목록 조회 및 프로젝트 실행과 같은 커스텀 툴을 제공합니다.

## ✨ 주요 기능

- MCP Tool 서버 인터페이스 구현
- 도구 목록(`ListTools`) 및 도구 실행(`CallTool`) 핸들링
- 사용자 정의 스키마 기반 검증 (Zod 기반)
- TypeScript 기반 모듈형 구조
- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) 0.6.0 사용
- Inspector 도구 연동 지원

---

## 📁 프로젝트 구조

```
├── src/
│   ├── index.ts           # MCP 서버 진입점
│   ├── api.ts             # 외부 API 호출 유틸리티
│   └── schema.ts          # zod 기반의 Input Schema 정의
├── build/                 # 컴파일된 JS 파일 (ts to js)
├── package.json           # 의존성 및 실행 스크립트 정의
├── tsconfig.json          # TypeScript 컴파일 설정
└── README.md
```

---

## 🛠️ 설치 및 빌드
 - Node.js 설치
 - 최소 Node.js v14 이상 설치 필요 (권장: LTS 버전)
 - 설치: https://nodejs.org/
```bash
# 프로젝트 경로로 이동
cd 다운로드 경로

# Dependency 패키지 설치
npm install

# 빌드
npm run build
```
---

## 🧩 MCP 툴 구성

### 🔍 ListTools
서버는 MCP Inspector에서 `ListTools` 요청 시 다음과 같은 도구를 반환합니다:

```json
[
  {
    "name": "Get_AntBot_Project_List",
    "description": "Returns a list of antbot projects.",
    "inputSchema": { "type": "object", "properties": {}, "required": [] }
  },
  {
    "name": "Run_AntBot_Project",
    "description": "Run the project with the project ID provided by the user.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": { "type": "string" }
      },
      "required": ["projectId"]
    }
  }
]
```

### ⚙️ CallTool
- `Run_AntBot_Project`: 사용자로부터 전달받은 `projectId`를 기반으로 AntBot 매니저의 실행 API 호출
- `Get_AntBot_Project_List`: 사용 가능한 프로젝트 목록 반환 (구현 필요 시 API 연동)

---

## 🔧 주요 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run build` | TypeScript 빌드 및 실행 권한 부여 (`chmod +x`) |
| `npm run watch` | 변경 감지 기반 빌드 |
| `npm run inspector` | MCP Inspector로 테스트 실행 |

---

## 🧪 테스트 방법

1. [Model Context Protocol Inspector](https://modelcontextprotocol.io/docs/tools/inspector) 설치:
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

2. 실행:
   ```bash
   cd {다운로드 경로}/MCP-Server
   npm run inspector
   ```

3. 브라우저에서 Inspector UI가 열리며, 툴 호출 테스트 가능

---

## 🧠 Claude Desktop 연동 방법

본 MCP 서버를 **Claude Desktop**에 도구로 등록하여 Claude Agent가 직접 호출할 수 있도록 설정할 수 있습니다.

### 📍 전제 조건

- Claude Desktop 설치 완료
- MCP Inspector로 서버가 정상 작동하는 것 확인 (`npm run inspector`)
- `build/index.js` 빌드 완료 상태

---

### ⚙️ 등록 절차 (GUI 또는 수동 설정)

#### 방법 1: Claude Desktop GUI에서 등록

1. Claude Desktop 실행
2. 왼쪽 상단 버튼 클릭(三) > **파일** > **설정**
3. "개발자" 항목 클릭 > **설정편집** 버튼 클릭
4. **`%APPDATA%\Roaming\Claude\`경로의 **claude_desktop_config.json** 연 후, 아래와 같이 입력 후 저장
```json
{
	"mcpServers": {
	  "antbot-mcp-server": {
		"command":"node",
		"args":[
			"{다운로드 경로}\\build\\index.js"
		]
	  }
	}
}
```
5. Claude 재시작 (**Tray-Icon을 통한 완전 종료 필요**)
---

### ✅ 확인 방법

- Claude Desktop에서 `"AntBot-MCP-Server"`라는 이름으로 도구가 노출되는지 확인
- ![image](https://github.com/user-attachments/assets/6f5957da-e09d-4b9d-aa2f-b79e75c13d11)

- Claude에게 다음처럼 명령:
  > `antbot 프로젝트 목록을 알려줘`, `PR000000298 프로젝트를 실행해줘`

## 📦 의존성

```json
"dependencies": {
  "@modelcontextprotocol/sdk": "0.6.0"
},
"devDependencies": {
  "@types/node": "^20.11.24",
  "typescript": "^5.3.3"
}
```

---

## 🔐 라이선스

MIT License  
본 프로젝트는 무료 오픈소스로 자유롭게 확장 및 수정이 가능합니다.

---

## 📞 문의

본 프로젝트 또는 AntBot 관련 문의사항은 ICT AX솔루션팀 또는 MCP 공식 문서를 참고해 주세요.  
문서 링크: [https://modelcontextprotocol.io/docs](https://modelcontextprotocol.io/docs)
