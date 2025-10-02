import { SessionManager } from './SessionManager';
import { LogData, LogLevel } from '@/shared/types/LogTypes';

export class LogCollector {
  private sessionManager: SessionManager;
  private originalConsole: {
    log: typeof console.log;
    error: typeof console.error;
    warn: typeof console.warn;
    info: typeof console.info;
    debug: typeof console.debug;
  };
  private networkLogs: LogData[] = [];
  private isCollecting = false;

  constructor() {
    this.sessionManager = new SessionManager();
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };
  }

  public async startCollecting(tabId: number): Promise<void> {
    if (this.isCollecting) return;

    this.isCollecting = true;
    this.setupConsoleInterception();
    this.setupNetworkMonitoring();
    this.setupErrorHandling();
  }

  public async stopCollecting(): Promise<void> {
    if (!this.isCollecting) return;

    this.isCollecting = false;
    this.restoreConsole();
    this.clearNetworkMonitoring();
  }

  public async flagEvent(eventId: string, note: string): Promise<void> {
    await this.sessionManager.addFlag(eventId, note);
  }

  private setupConsoleInterception(): void {
    // コンソールログのインターセプト
    console.log = (...args: any[]) => {
      this.collectLog(LogLevel.LOG, args);
      this.originalConsole.log.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.collectLog(LogLevel.ERROR, args);
      this.originalConsole.error.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.collectLog(LogLevel.WARN, args);
      this.originalConsole.warn.apply(console, args);
    };

    console.info = (...args: any[]) => {
      this.collectLog(LogLevel.INFO, args);
      this.originalConsole.info.apply(console, args);
    };

    console.debug = (...args: any[]) => {
      this.collectLog(LogLevel.DEBUG, args);
      this.originalConsole.debug.apply(console, args);
    };
  }

  private restoreConsole(): void {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
  }

  private setupNetworkMonitoring(): void {
    // Fetch APIの監視
    const originalFetch = window.fetch;
    window.fetch = async (...args: any[]) => {
      const startTime = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        this.collectNetworkLog({
          method: 'GET',
          url: typeof url === 'string' ? url : url.url,
          status: response.status,
          statusText: response.statusText,
          duration: endTime - startTime,
          success: response.ok
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        
        this.collectNetworkLog({
          method: 'GET',
          url: typeof url === 'string' ? url : url.url,
          status: 0,
          statusText: 'Network Error',
          duration: endTime - startTime,
          success: false,
          error: error.message
        });
        
        throw error;
      }
    };

    // XMLHttpRequestの監視
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method: string, url: string, ...args: any[]) {
      (this as any)._method = method;
      (this as any)._url = url;
      (this as any)._startTime = performance.now();
      
      return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(data?: any) {
      const xhr = this as any;
      
      xhr.addEventListener('loadend', () => {
        const endTime = performance.now();
        
        this.collectNetworkLog({
          method: xhr._method,
          url: xhr._url,
          status: xhr.status,
          statusText: xhr.statusText,
          duration: endTime - xhr._startTime,
          success: xhr.status >= 200 && xhr.status < 400
        });
      });
      
      return originalXHRSend.apply(this, [data]);
    };
  }

  private clearNetworkMonitoring(): void {
    // ネットワーク監視のクリーンアップは複雑なため、
    // 実際の実装ではより詳細な管理が必要
  }

  private setupErrorHandling(): void {
    // グローバルエラーハンドラー
    window.addEventListener('error', (event) => {
      this.collectErrorLog({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack || '',
        type: 'JavaScript Error'
      });
    });

    // Promise rejection ハンドラー
    window.addEventListener('unhandledrejection', (event) => {
      this.collectErrorLog({
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack || '',
        type: 'Unhandled Promise Rejection'
      });
    });
  }

  private async collectLog(level: LogLevel, args: any[]): Promise<void> {
    if (!this.isCollecting) return;

    const logData: LogData = {
      id: this.generateLogId(),
      level,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '),
      args: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      stack: this.getStackTrace()
    };

    await this.sessionManager.addEvent({
      type: 'console',
      timestamp: logData.timestamp,
      data: logData
    });
  }

  private async collectNetworkLog(networkData: {
    method: string;
    url: string;
    status: number;
    statusText: string;
    duration: number;
    success: boolean;
    error?: string;
  }): Promise<void> {
    if (!this.isCollecting) return;

    const logData: LogData = {
      id: this.generateLogId(),
      level: networkData.success ? LogLevel.INFO : LogLevel.ERROR,
      message: `${networkData.method} ${networkData.url} - ${networkData.status} ${networkData.statusText}`,
      args: [networkData],
      timestamp: new Date().toISOString(),
      url: window.location.href,
      metadata: {
        type: 'network',
        method: networkData.method,
        status: networkData.status,
        duration: networkData.duration,
        success: networkData.success
      }
    };

    await this.sessionManager.addEvent({
      type: 'network',
      timestamp: logData.timestamp,
      data: logData
    });
  }

  private async collectErrorLog(errorData: {
    message: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    stack?: string;
    type: string;
  }): Promise<void> {
    if (!this.isCollecting) return;

    const logData: LogData = {
      id: this.generateLogId(),
      level: LogLevel.ERROR,
      message: `${errorData.type}: ${errorData.message}`,
      args: [errorData],
      timestamp: new Date().toISOString(),
      url: window.location.href,
      metadata: {
        type: 'error',
        filename: errorData.filename,
        lineno: errorData.lineno,
        colno: errorData.colno,
        stack: errorData.stack
      }
    };

    await this.sessionManager.addEvent({
      type: 'error',
      timestamp: logData.timestamp,
      data: logData
    });
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStackTrace(): string {
    const stack = new Error().stack;
    return stack ? stack.split('\n').slice(2, 5).join('\n') : '';
  }
}
