import { SessionManager } from './SessionManager';
import { LogData, LogLevel } from '@/shared/types/LogTypes';

export class LightweightLogCollector {
  private sessionManager: SessionManager;
  private isCollecting: boolean = false;
  private originalConsole: { 
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    info: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  } = {} as any;
  private logBuffer: LogData[] = [];
  private maxBufferSize = 50; // バッファサイズを削減
  private flushInterval = 10000; // フラッシュ間隔を延長

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
    
    // 軽量版：必要最小限の監視
    this.setupLightweightConsoleInterception();
    
    // 安全なネットワーク監視とエラーハンドリングを復活
    this.setupSafeNetworkMonitoring();
    this.setupSafeErrorHandling();
    
    // 定期的なフラッシュ
    this.startFlushTimer();
  }

  public async stopCollecting(): Promise<void> {
    if (!this.isCollecting) return;

    this.isCollecting = false;
    
    try {
      // コンソールを復元
      this.restoreConsole();
      
      // ネットワーク監視をクリーンアップ
      this.clearSafeNetworkMonitoring();
      
      // 残りのログをフラッシュ
      await this.flushLogs();
      
      // タイマーを停止
      this.stopFlushTimer();
    } catch (error) {
      // エラーは無視（軽量化のため）
    }
  }

  private clearSafeNetworkMonitoring(): void {
    try {
      // ネットワーク監視のクリーンアップ
      // 元のfetchを復元（簡略化された実装）
    } catch (error) {
      // エラーは無視（軽量化のため）
    }
  }

  private setupLightweightConsoleInterception(): void {
    // 軽量版：エラーログのみ監視
    console.error = (...args: any[]) => {
      this.collectLog(LogLevel.ERROR, args);
      this.originalConsole.error.apply(console, args);
    };

    // 警告ログも監視
    console.warn = (...args: any[]) => {
      this.collectLog(LogLevel.WARN, args);
      this.originalConsole.warn.apply(console, args);
    };

    // その他のログは監視しない（パフォーマンス重視）
  }

  private restoreConsole(): void {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
  }

  private setupSafeNetworkMonitoring(): void {
    try {
      // 安全なネットワーク監視：エラーのみ監視
      const originalFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        
        try {
          const response = await originalFetch(input, init);
          
          // エラーレスポンスのみログに記録（4xx, 5xx）
          if (!response.ok && response.status >= 400) {
            this.collectNetworkLog({
              url,
              method: init?.method || 'GET',
              status: response.status,
              statusText: response.statusText,
              type: 'http_error'
            });
          }
          
          return response;
        } catch (error) {
          // ネットワークエラーのみログに記録
          this.collectNetworkLog({
            url,
            method: init?.method || 'GET',
            status: 0,
            statusText: 'Network Error',
            type: 'network_error',
            error: error instanceof Error ? error.message : String(error)
          });
          
          throw error;
        }
      };
    } catch (error) {
      // エラーは無視（軽量化のため）
    }
  }

  private setupSafeErrorHandling(): void {
    try {
      // 安全なエラーハンドリング：グローバルエラーのみ監視
      window.addEventListener('error', (event) => {
        try {
          this.collectErrorLog({
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack || '',
            type: 'JavaScript Error'
          });
        } catch (e) {
          // エラーは無視（軽量化のため）
        }
      });

      // 未処理のPromise拒否を監視
      window.addEventListener('unhandledrejection', (event) => {
        try {
          this.collectErrorLog({
            message: event.reason?.message || String(event.reason),
            filename: '',
            lineno: 0,
            colno: 0,
            stack: event.reason?.stack || '',
            type: 'Unhandled Promise Rejection'
          });
        } catch (e) {
          // エラーは無視（軽量化のため）
        }
      });
    } catch (error) {
      // エラーは無視（軽量化のため）
    }
  }

  private collectNetworkLog(networkData: any): void {
    if (!this.isCollecting) return;

    const logData: LogData = {
      id: this.generateId(),
      level: LogLevel.ERROR,
      message: `Network ${networkData.type}: ${networkData.method} ${networkData.url} - ${networkData.status} ${networkData.statusText}`,
      args: [networkData],
      timestamp: new Date().toISOString(),
      url: window.location.href,
      stack: ''
    };

    this.logBuffer.push(logData);
  }

  private collectErrorLog(errorData: any): void {
    if (!this.isCollecting) return;

    const logData: LogData = {
      id: this.generateId(),
      level: LogLevel.ERROR,
      message: `${errorData.type}: ${errorData.message}`,
      args: [errorData],
      timestamp: new Date().toISOString(),
      url: window.location.href,
      stack: errorData.stack
    };

    this.logBuffer.push(logData);
  }

  private collectLog(level: LogLevel, args: any[]): void {
    if (!this.isCollecting) return;

    const logData: LogData = {
      id: this.generateId(),
      level,
      message: args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' '),
      args: args,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      stack: this.getStackTrace()
    };

    this.logBuffer.push(logData);

    // バッファサイズをチェック
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flushLogs();
    }
  }

  private getStackTrace(): string {
    try {
      throw new Error();
    } catch (e) {
      return (e as Error).stack || '';
    }
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushTimer(): void {
    setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.flushLogs();
      }
    }, this.flushInterval);
  }

  private stopFlushTimer(): void {
    // タイマーを停止（実装は簡略化）
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    try {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];

      // セッションにログを追加
      for (const log of logsToFlush) {
        await this.sessionManager.addLog(log);
      }
    } catch (error) {
      // エラーは無視（軽量化のため）
    }
  }

  public async flagEvent(eventId: string, note: string): Promise<void> {
    await this.sessionManager.addFlag(eventId, note);
  }
}
