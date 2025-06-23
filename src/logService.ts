import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { logger } from './logger.js';

/**
 * 로그 서비스 - mcprun 로그 tail 제공 및 로깅 강화
 */
export class LogService {
  /**
   * 가장 최근 mcprun 로그의 마지막 N줄을 반환합니다.
   * @param lines 반환할 줄 수 (기본 100)
   */
  async getLastRunnerLog(lines: number = 100): Promise<{ fileName: string; content: string; }> {
    const logDir = path.join(os.homedir(), '.AntBot', 'Log', 'Develop');
    logger.debug(`로그 디렉터리 스캔: ${logDir}`);

    try {
      const files = await fs.promises.readdir(logDir);
      const mcprunFiles = files.filter((f) => /^mcprun_\d{14}\.log$/i.test(f));

      if (mcprunFiles.length === 0) {
        logger.warn('mcprun 로그 파일을 찾을 수 없습니다.');
        throw new Error('mcprun 로그 파일을 찾을 수 없습니다.');
      }

      // 파일명 역순 정렬(최신이 앞)
      mcprunFiles.sort((a, b) => b.localeCompare(a));
      const latest = mcprunFiles[0];
      const fullPath = path.join(logDir, latest);

      logger.info(`최신 mcprun 로그 파일 확인: ${latest}`);

      const content = await fs.promises.readFile(fullPath, 'utf8');
      const contentLines = content.split(/\r?\n/);
      const tailLines = contentLines.slice(-lines).join('\n');

      logger.debug(`로그 추출 완료 (마지막 ${lines}줄)`);
      logger.debug(`--- log start ---\n${tailLines}\n--- log end ---`);

      return { fileName: latest, content: tailLines };
    } catch (error) {
      logger.error('로그 tail 추출 실패', error as Error);
      throw error;
    }
  }
} 