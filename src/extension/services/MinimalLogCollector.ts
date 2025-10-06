import { SessionManager } from './SessionManager';
import { LogData, LogLevel } from '../../shared/types/LogTypes';

export class MinimalLogCollector {
  private sessionManager: SessionManager;
  private isCollecting: boolean = false;
  private originalConsole: { 
    error: (...args: any[]) => void;
  } = {} as any;
  private errorBuffer: LogData[] = [];
  private maxBufferSize = 20; // バッファサイズを最小限に
  private flushInterval = 15000; // フラッシュ間隔を延長

  constructor() {
    this.sessionManager = new SessionManager();
    this.originalConsole = {
      error: console.error
    };
  }

  public async startCollecting(tabId: number): Promise<void> {
    if (this.isCollecting) return;

    this.isCollecting = true;
    
    // 最小限：エラーログのみ監視
    this.setupMinimalErrorMonitoring();
    
    // 定期的なフラッシュ
    this.startFlushTimer();
  }

  public async stopCollecting(): Promise<void> {
    if (!this.isCollecting) return;

    this.isCollecting = false;
    
    try {
      // コンソールを復元
      this.restoreConsole();
      
      // 残りのログをフラッシュ
      await this.flushLogs();
      
      // タイマーを停止
      this.stopFlushTimer();
    } catch (error) {
      // エラーは無視（軽量化のため）
    }
  }

  private setupMinimalErrorMonitoring(): void {
    // エラーログのみ監視
    console.error = (...args: any[]) => {
      this.collectErrorLog(args);
      this.originalConsole.error.apply(console, args);
    };

    // グローバルエラーハンドラー（最小限）
    window.addEventListener('error', (event) => {
      try {
        this.collectErrorLog([event.message, event.filename, event.lineno]);
      } catch (e) {
        // エラーは無視
      }
    });

    // 未処理のPromise拒否（最小限）
    window.addEventListener('unhandledrejection', (event) => {
      try {
        this.collectErrorLog([event.reason?.message || String(event.reason)]);
      } catch (e) {
        // エラーは無視
      }
    });
  }

  private restoreConsole(): void {
    console.error = this.originalConsole.error;
  }

  private collectErrorLog(args: any[]): void {
    if (!this.isCollecting) return;

    const logData: LogData = {
      id: this.generateId(),
      level: LogLevel.ERROR,
      message: args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' '),
      args: args,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      stack: this.getStackTrace()
    };

    this.errorBuffer.push(logData);

    // バッファサイズをチェック
    if (this.errorBuffer.length >= this.maxBufferSize) {
      this.flushLogs();
    }
  }

  private getStackTrace(): string {
    try {
      throw new Error();
    } catch (e) {
      return (e as Error).stack?.split('\n').slice(0, 3).join('\n') || '';
    }
  }

  private generateId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private startFlushTimer(): void {
    setInterval(async () => {
      if (this.errorBuffer.length > 0) {
        await this.flushLogs();
      }
    }, this.flushInterval);
  }

  private stopFlushTimer(): void {
    // タイマーを停止（実装は簡略化）
  }

  private async flushLogs(): Promise<void> {
    if (this.errorBuffer.length === 0) return;

    try {
      const logsToFlush = [...this.errorBuffer];
      this.errorBuffer = [];

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
