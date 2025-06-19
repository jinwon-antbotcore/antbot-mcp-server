import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { existsSync, readFileSync } from "fs";
import { JSDOM } from 'jsdom';
import { SYSTEM_PATHS, CONFIG_KEYS } from './constants.js';
import { logger } from './logger.js';
import { AppConfig } from './types.js';

/**
 * 설정 파일에서 특정 키의 값을 읽어옵니다.
 * @param key - 읽어올 설정 키
 * @returns 설정 값 (없으면 빈 문자열)
 */
export function getRobotConfig(key: string): string {
  try {
    if (!existsSync(SYSTEM_PATHS.ANT_BOT_CONFIG)) {
      throw new McpError(ErrorCode.InternalError, '설정 파일을 찾을 수 없습니다.');
    }

    const xmlContent = readFileSync(SYSTEM_PATHS.ANT_BOT_CONFIG, 'utf-8');
    const dom = new JSDOM(xmlContent, { contentType: 'text/xml' });
    const xmlDoc = dom.window.document;
    
    const appSettings = xmlDoc.getElementsByTagName('appSettings')[0];
    if (!appSettings) {
      throw new McpError(ErrorCode.InternalError, '설정 파일에서 appSettings를 찾을 수 없습니다.');
    }

    const addElements = appSettings.getElementsByTagName('add');
    
    for (let i = 0; i < addElements.length; i++) {
      const element = addElements[i];
      if (element.getAttribute('key') === key) {
        return element.getAttribute('value') || '';
      }
    }
    
    return '';
  } catch (error) {
    logger.error(`설정 파일 읽기 실패: ${key}`, error as Error);
    return '';
  }
}

/**
 * 애플리케이션 설정을 검증하고 반환합니다.
 * @returns 검증된 설정 객체
 * @throws McpError - 필수 설정이 누락된 경우
 */
export function validateAndGetConfig(): AppConfig {
  const sysUserId = getRobotConfig(CONFIG_KEYS.MANAGER_USER);
  const runnerPath = getRobotConfig(CONFIG_KEYS.ANT_BOT_RUNNER);
  const managerIp = getRobotConfig(CONFIG_KEYS.MANAGER_IP);
  const managerPort = getRobotConfig(CONFIG_KEYS.MANAGER_PORT);

  if (!sysUserId || !runnerPath || !managerIp || !managerPort) {
    throw new McpError(
      ErrorCode.InternalError, 
      'AntBot Robot에서 매니저 연동을 먼저 진행해주세요.'
    );
  }

  const config: AppConfig = {
    sysUserId,
    runnerPath,
    apiBaseUrl: `${managerIp}:${managerPort}`
  };

  logger.info('설정 검증 완료');
  return config;
}