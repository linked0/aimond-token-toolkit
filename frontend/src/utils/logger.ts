/**
 * Logger utility with configurable log levels
 * Provides structured logging with different levels and optional debug mode
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  component?: string;
}

class Logger {
  private currentLevel: LogLevel;
  private isDevelopment: boolean;
  private componentName?: string;

  constructor(componentName?: string) {
    this.componentName = componentName;
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Set log level based on environment
    this.currentLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    
    // Allow override via environment variable
    const envLogLevel = process.env.REACT_APP_LOG_LEVEL;
    if (envLogLevel) {
      this.currentLevel = parseInt(envLogLevel) as LogLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLevel;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      component: this.componentName,
    };
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatMessage(level, message, data);
    
    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.ERROR:
        console.error(`[${entry.component || 'App'}] ${message}`, data || '');
        break;
      case LogLevel.WARN:
        console.warn(`[${entry.component || 'App'}] ${message}`, data || '');
        break;
      case LogLevel.INFO:
        console.info(`[${entry.component || 'App'}] ${message}`, data || '');
        break;
      case LogLevel.DEBUG:
        console.log(`[${entry.component || 'App'}] ${message}`, data || '');
        break;
    }
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  // Specialized logging methods for common patterns
  transactionStart(action: string, txHash?: string): void {
    this.info(`🚀 Starting ${action}${txHash ? ` (${txHash.slice(0, 8)}...)` : ''}`);
  }

  transactionSuccess(action: string, txHash?: string): void {
    this.info(`✅ ${action} completed successfully${txHash ? ` (${txHash.slice(0, 8)}...)` : ''}`);
  }

  transactionError(action: string, error: any, txHash?: string): void {
    this.error(`❌ ${action} failed${txHash ? ` (${txHash.slice(0, 8)}...)` : ''}`, error);
  }

  dataFetch(action: string, count?: number): void {
    this.info(`📊 ${action}${count !== undefined ? `: ${count} items` : ''}`);
  }

  networkInfo(network: string, chainId: string): void {
    this.info(`🌐 Connected to ${network} (Chain ID: ${chainId})`);
  }

  beneficiaryExtraction(txHash: string, method: string, address?: string): void {
    this.debug(`🔍 Extracting beneficiary from ${method}`, { txHash: txHash.slice(0, 8), address });
  }

  beneficiaryFound(method: string, address: string): void {
    this.debug(`✅ Found beneficiary via ${method}: ${address}`);
  }

  beneficiaryFallback(txHash: string, fallback: string): void {
    this.warn(`⚠️ Using fallback for transaction ${txHash.slice(0, 8)}: ${fallback}`);
  }
}

// Create a default logger instance
export const logger = new Logger();

// Factory function to create component-specific loggers
export const createLogger = (componentName: string): Logger => {
  return new Logger(componentName);
};

// LogLevel is already exported above as part of the enum declaration