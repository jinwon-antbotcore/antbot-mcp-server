# AntBot MCP Server

**AntBot MCP Server**는 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 기반의 TypeScript 서버로, AI 기반 RPA 플랫폼인 AntBot과의 연동을 위해 설계되었습니다.  
이 서버는 MCP 클라이언트와 상호작용하며, AntBot 프로젝트 관리 및 실행을 위한 도구들을 제공합니다.

## ✨ 주요 기능

- **MCP Tool 서버 인터페이스** 구현
- **AntBot 프로젝트 목록 조회** (`Get_AntBot_Project_List`)
- **프로젝트 상세 정보 조회** (`Get_AntBot_Project_Info`) - 매개변수 정보 포함
- **프로젝트 실행** (`Run_AntBot_Project`) - 매개변수 전달 지원
- **자동 설정 관리** - AntBot Robot 설정 파일에서 자동으로 설정 로드
- **프로젝트 캐싱** - 성능 최적화를 위한 프로젝트 정보 캐싱
- **로깅 시스템** - 상세한 로그 기록 및 디버깅 지원
- **TypeScript 기반** 모듈형 구조

## 🏗️ 아키텍처

### 프로젝트 구조
```
src/
├── index.ts              # MCP 서버 진입점 및 메인 클래스
├── projectService.ts     # 프로젝트 관리 비즈니스 로직
├── api.ts               # 외부 API 호출 유틸리티
├── config.ts            # 설정 관리 및 검증
├── fileUtils.ts         # 파일 처리 유틸리티 (ZIP, XML 파싱)
├── logger.ts            # 로깅 시스템
├── schema.ts            # Zod 기반 입력 검증 스키마
├── types.ts             # TypeScript 타입 정의
└── constants.ts         # 상수 정의
```

### 핵심 컴포넌트

1. **McpServer 클래스** (`index.ts`)
   - MCP 서버 인스턴스 관리
   - 요청 핸들러 설정
   - 에러 처리 및 로깅

2. **ProjectService 클래스** (`projectService.ts`)
   - 프로젝트 목록 조회
   - 프로젝트 정보 파싱 (antConf.xml)
   - 프로젝트 다운로드 및 실행
   - 캐싱 시스템

3. **설정 관리** (`config.ts`)
   - AntBot Robot 설정 파일 자동 로드
   - 필수 설정 검증
   - 동적 설정 관리

## 🛠️ 설치 및 빌드

### 전제 조건
- **Node.js** v16 이상 (권장: LTS 버전)
- **AntBot Robot** 설치 및 매니저 연동 완료
- **AntBot Robot 설정 파일** 존재: `%APPDATA%\Roaming\AntBotRobot\AntBot_Robot.exe.config`

### 설치
```bash
# 프로젝트 클론
git clone <repository-url>
cd antbot-mcp-server

# 의존성 설치
npm install

# 빌드
npm run build

# 또는 클린 빌드 (기존 빌드 파일 삭제 후 재빌드)
npm run cleanbuild
```

## 🧩 MCP 도구 구성

### 1. Get_AntBot_Project_List
AntBot 매니저에서 사용 가능한 프로젝트 목록을 조회합니다.

```json
{
  "name": "Get_AntBot_Project_List",
  "description": "Returns a list of antbot projects.",
  "inputSchema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

**응답 예시:**
```json
{
  "projects": [
    {
      "projectId": "PR000000298",
      "projectName": "웹 스크래핑 프로젝트",
      "description": "웹사이트에서 데이터를 수집하는 프로젝트"
    }
  ]
}
```

### 2. Get_AntBot_Project_Info
특정 프로젝트의 상세 정보와 실행에 필요한 매개변수를 조회합니다.

```json
{
  "name": "Get_AntBot_Project_Info",
  "description": "Get project information including required parameters",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" }
    },
    "required": ["projectId"]
  }
}
```

**응답 예시:**
```json
{
  "projectId": "PR000000298",
  "projectPath": "C:\\temp\\project_298\\antConf.xml",
  "name": "웹 스크래핑 프로젝트",
  "description": "웹사이트에서 데이터를 수집하는 프로젝트",
  "requiredParameters": [
    {
      "name": "url",
      "type": "string",
      "description": "스크래핑할 웹사이트 URL"
    }
  ],
  "optionalParameters": [
    {
      "name": "timeout",
      "type": "number",
      "description": "타임아웃 시간 (초)",
      "defaultValue": 30
    }
  ],
  "parameterSummary": "필수: url (string) | 선택: timeout (number, 기본값: 30)"
}
```

### 3. Run_AntBot_Project
프로젝트를 실행합니다. 먼저 `Get_AntBot_Project_Info`를 호출하여 프로젝트 정보를 확인해야 합니다.

```json
{
  "name": "Run_AntBot_Project",
  "description": "Run the project with required parameters",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "projectPath": { "type": "string" },
      "parameters": {
        "type": "object",
        "additionalProperties": true
      }
    },
    "required": ["projectId", "projectPath"]
  }
}
```

**사용 예시:**
```json
{
  "projectId": "PR000000298",
  "projectPath": "C:\\temp\\project_298\\antConf.xml",
  "parameters": {
    "url": "https://example.com",
    "timeout": 60
  }
}
```

## 🔧 주요 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run build` | TypeScript 컴파일 및 실행 권한 설정 |
| `npm run clean` | 빌드 디렉토리 삭제 |
| `npm run cleanbuild` | 클린 후 재빌드 |
| `npm run watch` | 파일 변경 감지 시 자동 빌드 |
| `npm run inspector` | MCP Inspector로 테스트 실행 |

## 🧪 테스트 방법

### 1. MCP Inspector 사용
```bash
# MCP Inspector 설치
npm install -g @modelcontextprotocol/inspector

# 서버 테스트
npm run inspector
```

### 2. 테스트 시나리오
1. **프로젝트 목록 조회**: `Get_AntBot_Project_List` 호출
2. **프로젝트 정보 조회**: `Get_AntBot_Project_Info` 호출 (projectId 필요)
3. **프로젝트 실행**: `Run_AntBot_Project` 호출 (projectId, projectPath, parameters 필요)

## 🧠 Claude Desktop 연동

### 전제 조건
- Claude Desktop 설치 완료
- AntBot Robot 매니저 연동 완료
- MCP Inspector로 서버 정상 동작 확인

### 등록 방법

#### 방법 1: Claude Desktop GUI
1. Claude Desktop 실행
2. 설정 → 개발자 → 설정편집
3. `%APPDATA%\Roaming\Claude\claude_desktop_config.json` 파일 편집

#### 방법 2: 직접 설정
```json
{
  "mcpServers": {
    "antbot-mcp-server": {
      "command": "node",
      "args": ["C:\\path\\to\\antbot-mcp-server\\build\\index.js"]
    }
  }
}
```

### ⚠️ 중요: Claude Desktop 재시작
설정 변경 후 **반드시 Claude Desktop을 완전히 종료하고 재시작**해야 합니다:
1. 시스템 트레이에서 Claude 아이콘 우클릭
2. **종료** 선택 (완전히 종료)
3. Claude Desktop 다시 실행

> 💡 **참고**: 단순히 창을 닫는 것이 아니라 트레이 아이콘을 통해 완전히 종료해야 설정이 적용됩니다.

### 사용 예시
Claude에게 다음과 같이 요청할 수 있습니다:
- "AntBot 프로젝트 목록을 보여줘"
- "PR000000298 프로젝트의 정보를 알려줘"
- "PR000000298 프로젝트를 실행해줘"

## ⚙️ 설정 관리

### 자동 설정 로드
서버는 다음 경로의 AntBot Robot 설정 파일을 자동으로 읽어옵니다:
```
%APPDATA%\Roaming\AntBotRobot\AntBot_Robot.exe.config
```

### 필수 설정 항목
- `MANAGER_USER`: 매니저 사용자 ID
- `MANAGER_IP`: 매니저 서버 IP
- `MANAGER_PORT`: 매니저 서버 포트
- `AntBot Runner`: AntBot Runner 실행 파일 경로

### 설정 검증
서버 시작 시 필수 설정이 누락된 경우 오류를 발생시킵니다:
```
AntBot Robot에서 매니저 연동을 먼저 진행해주세요.
```

## 🔍 로깅 및 디버깅

### 로그 위치
```
%USERPROFILE%\.AntBot\Log\Develop\
```

### 로그 레벨
- **INFO**: 일반적인 작업 정보
- **DEBUG**: 상세한 디버깅 정보
- **ERROR**: 오류 정보

### 주요 로그 메시지
- 서버 초기화 및 시작
- API 호출 결과
- 프로젝트 다운로드 및 실행 상태
- 설정 검증 결과

## 📦 의존성

### 핵심 의존성
- `@modelcontextprotocol/sdk`: MCP 서버 구현
- `jsdom`: XML 설정 파일 파싱
- `adm-zip`: 프로젝트 ZIP 파일 처리
- `sudo-prompt`: 관리자 권한 실행 (필요시)

### 개발 의존성
- `typescript`: TypeScript 컴파일러
- `rimraf`: 크로스 플랫폼 디렉토리 삭제
- `@types/*`: 타입 정의

## 🚀 성능 최적화

### 캐싱 시스템
- 프로젝트 정보 캐싱 (5분)
- 중복 다운로드 방지
- API 호출 최적화

### 에러 처리
- 상세한 에러 메시지
- 재시도 로직
- Graceful degradation

## 📞 지원 및 문의

- **AntBot 관련**: ICT AX솔루션팀
- **MCP 관련**: [MCP 공식 문서](https://modelcontextprotocol.io/docs)
- **이슈 리포트**: GitHub Issues

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.
