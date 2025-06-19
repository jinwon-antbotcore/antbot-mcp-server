import { stderr } from 'process';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

class Logger {
  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  private log(level: LogLevel, message: string, error?: Error): void {
    const timestamp = this.getCurrentTimestamp();
    const errorMessage = error ? ` - ${error.message}` : '';
    stderr.write(`[${level}] ${timestamp}: ${message}${errorMessage}\n`);
  }

  debug(message: string): void {
    this.log(LogLevel.DEBUG, message);
  }

  info(message: string): void {
    this.log(LogLevel.INFO, message);
  }

  warn(message: string): void {
    this.log(LogLevel.WARN, message);
  }

  error(message: string, error?: Error): void {
    this.log(LogLevel.ERROR, message, error);
  }
}

export const logger = new Logger();