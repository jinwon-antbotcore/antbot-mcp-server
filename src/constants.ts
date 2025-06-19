import path from 'path';
import os from 'os';

export const CONFIG = {
  CACHE: {
    INFO_DURATION: 5 * 60 * 1000, // 5분
  },
  FILES: {
    DEFAULT_DOWNLOAD_NAME: 'download.zip',
    ANT_CONF_FILE: 'antConf.xml',
  },
  RUNNER: {
    COMMAND_MODE: 'mcprun',
    NAME: 'AntBot Runner',
  },
  API: {
    RETRY_COUNT: 3,
    TIMEOUT: 30000, // 30초
  }
} as const;

export const SYSTEM_PATHS = {
  ANT_BOT_LOG: path.join(os.homedir(), '.AntBot', 'Log', 'Develop'),
  ANT_BOT_CONFIG: path.join(os.homedir(), 'AppData', 'Roaming', 'AntBotRobot', 'AntBot_Robot.exe.config')
} as const;

export const CONFIG_KEYS = {
  MANAGER_USER: 'MANAGER_USER',
  ANT_BOT_RUNNER: 'AntBot Runner',
  MANAGER_IP: 'MANAGER_IP',
  MANAGER_PORT: 'MANAGER_PORT',
} as const;