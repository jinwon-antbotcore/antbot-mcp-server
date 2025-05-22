import path from "path";
import os from "os";
import { writeFile } from "fs/promises";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

const URL_Base = 'http://antbot.co.kr:1090';

// ✅ MCP 도구에서 사용하는 API 엔드포인트 상수 정의
export const API_ENDPOINTS = {
    PROJECT_LIST: URL_Base + '/api/WebService/Project/List',
    PROJECT_DOWNLOAD: URL_Base + '/api/WebService/Download/WorkflowSource'
} as const;

/**
 * ✅ 공통 API 호출 함수 (POST + JSON)
 * @param url 호출할 API URL
 * @param requestData 요청 바디에 포함될 JSON 객체
 * @returns 응답 결과 (파싱된 JSON 객체)
 * @throws McpError - HTTP 상태코드가 실패거나 네트워크 오류일 경우
 */
export async function fetchApi<T = any>(url: string, requestData: any): Promise<T> {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new McpError(ErrorCode.InternalError, `API 호출 실패: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        throw new McpError(ErrorCode.InternalError, `API 호출 중 오류 발생: ${error}`);
    }
}

/**
 * ✅ 파일을 Temp 디렉토리에 저장
 * @param url 다운로드할 URL
 * @param requestData 요청 JSON
 * @returns 저장된 파일의 전체 경로
 * @throws McpError - 다운로드 실패 시
 */
export async function downloadFile(url: string, requestData: any): Promise<string> {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    });

    if (!response.ok) {
        throw new McpError(ErrorCode.InternalError, `파일 다운로드 실패: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    // 파일명 파싱 → OS 임시 폴더 경로에 저장
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = getFilenameFromDisposition(contentDisposition);
    const tempPath = path.join(os.tmpdir(), filename);

    await writeFile(tempPath, Buffer.from(buffer));
    return tempPath;
}

/**
 * ✅ Content-Disposition 헤더에서 filename 추출
 * @param disposition Content-Disposition 헤더 값
 * @returns 추출된 파일명 (없으면 기본값 반환)
 */
function getFilenameFromDisposition(disposition: string | null): string {
    if (!disposition) return 'download.zip';

    // RFC 5987 형식 대응: filename*=UTF-8''파일명
    const encodedMatch = disposition.match(/filename\*\s*=\s*UTF-8''([^;\n]*)/i);
    if (encodedMatch) {
        return decodeURIComponent(encodedMatch[1]);
    }

    // 일반 형식: filename="파일명"
    const match = disposition.match(/filename="?([^"]+)"?/i);
    return match ? match[1] : 'download.zip';
}
