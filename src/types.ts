// API 응답 타입들
export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
  }
  
  export interface ProjectListItem {
    projectId: string;
    name: string;
    description?: string;
    lastModified: string;
  }
  
  export interface ProjectVersion {
    versionNo: string;
    createdAt: string;
    description?: string;
  }
  
  export interface ProjectListResponse {
    projects: ProjectListItem[];
  }
  
  export interface VersionListResponse extends Array<ProjectVersion> {}
  
  // 프로젝트 매개변수 타입
  export interface ProjectParameter {
    id: string;
    displayName: string;
    description: string;
    type: string;
    direction: string;
    mandatory: boolean;
    defaultValue: string | null;
  }
  
  // 프로젝트 정보 타입
  export interface ProjectInfo {
    name: string;
    description: string;
    main: string;
    argumentBasedMode: boolean;
    headlessMode: boolean;
    requiredParameters: ProjectParameter[];
    optionalParameters: ProjectParameter[];
  }
  
  // 캐시 엔트리 타입
  export interface CacheEntry {
    checkedAt: number;
    projectPath: string;
    projectInfo: ProjectInfo;
  }
  
  // XML 파싱 타입들
  export interface ParsedXmlProject {
    Name: string;
    Desc: string;
    Main: string;
    ArgumentBasedMode: string;
    HeadlessMode: string;
    PolicyArgumentList?: {
      PolicyArgument: ParsedXmlArgument | ParsedXmlArgument[];
    };
  }
  
  export interface ParsedXmlArgument {
    Id: string;
    DisplayName: string;
    Description: string;
    Type: string;
    Direction: string;
    Mandatory: string;
    InputValue: string;
  }
  
  // 설정 타입
  export interface AppConfig {
    sysUserId: string;
    runnerPath: string;
    apiBaseUrl: string;
  }
  
  // 툴 실행 인자 타입
  export interface RunProjectArgs {
    projectId: string;
    projectPath: string;
    parameters?: Record<string, any>;
  }