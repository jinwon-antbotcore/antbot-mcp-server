import AdmZip from 'adm-zip';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

/**
 * ZIP 파일을 임시 디렉토리에 압축 해제
 * @param zipPath - 압축 파일 경로
 * @returns 압축 해제된 디렉토리 경로
 */
export async function extractZip(zipPath: string): Promise<string> {
    try {
        const zip = new AdmZip(zipPath);
        const zipName = path.basename(zipPath, '.zip');
        const extractPath = path.join(os.tmpdir(), zipName);
        fs.mkdirSync(extractPath, { recursive: true });

        // ZIP 파일 압축 해제
        zip.extractAllTo(extractPath, true);

        return extractPath;
    } catch (error) {
        throw new McpError(ErrorCode.InternalError, `ZIP 파일 압축 해제 실패: ${error}`);
    }
} 