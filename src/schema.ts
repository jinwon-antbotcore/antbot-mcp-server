import { z } from "zod";

// 프로젝트 시작 스키마
export const startProjectSchema = z.object({
  projectId: z.string().min(1, "프로젝트 ID는 필수입니다."),
});

// 프로젝트 실행 스키마
export const runProjectSchema = z.object({
  projectId: z.string().min(1, "프로젝트 ID는 필수입니다."),
  projectPath: z.string().min(1, "프로젝트 경로는 필수입니다."),
  parameters: z.record(z.string(), z.any()).optional(),
});

// 스키마 타입 추출
export type StartProjectRequest = z.infer<typeof startProjectSchema>;
export type RunProjectRequest = z.infer<typeof runProjectSchema>;