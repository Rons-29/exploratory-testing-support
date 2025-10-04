import { SessionManager } from './SessionManager';
import { LogData, LogLevel } from '@/shared/types/LogTypes';

export class DevToolsService {
  private sessionManager: SessionManager;
  private isConnected = false;
  private tabId: number | null = null;
  private debuggerAttached = false;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  public async connect(tabId: number): Promise<boolean> {
    try {
      this.tabId = tabId;
      
      // DevTools Protocolに接続
      await chrome.debugger.attach({ tabId }, '1.3');
      this.debuggerAttached = true;
      
      // イベントリスナーを設定
      this.setupEventListeners();
      
      // 必要なドメインを有効化
      await this.enableDomains();
      
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to DevTools:', error);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.debuggerAttached && this.tabId) {
      try {
        await chrome.debugger.detach({ tabId: this.tabId });
        this.debuggerAttached = false;
      } catch (error) {
        console.error('Failed to detach debugger:', error);
      }
    }
    
    this.isConnected = false;
    this.tabId = null;
  }

  public async captureScreenshot(): Promise<string | null> {
    if (!this.isConnected || !this.tabId) {
      throw new Error('DevTools not connected');
    }

    try {
      const response = await this.sendCommand('Page.captureScreenshot', {
        format: 'png',
        quality: 90
      });

      return response.data;
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      return null;
    }
  }

  public async getConsoleMessages(): Promise<any[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      const response = await this.sendCommand('Runtime.getConsoleMessages');
      return response.messages || [];
    } catch (error) {
      console.error('Failed to get console messages:', error);
      return [];
    }
  }

  public async getNetworkLogs(): Promise<any[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      const response = await this.sendCommand('Network.getResponseBody', {});
      return response || [];
    } catch (error) {
      console.error('Failed to get network logs:', error);
      return [];
    }
  }

  public async evaluateExpression(expression: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('DevTools not connected');
    }

    try {
      const response = await this.sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true
      });

      return response.result;
    } catch (error) {
      console.error('Failed to evaluate expression:', error);
      throw error;
    }
  }

  public async getDOMSnapshot(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('DevTools not connected');
    }

    try {
      const response = await this.sendCommand('DOMSnapshot.captureSnapshot', {
        computedStyles: ['display', 'visibility', 'opacity']
      });

      return response;
    } catch (error) {
      console.error('Failed to get DOM snapshot:', error);
      throw error;
    }
  }

  public async getPerformanceMetrics(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('DevTools not connected');
    }

    try {
      const response = await this.sendCommand('Performance.getMetrics');
      return response.metrics || [];
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  private async enableDomains(): Promise<void> {
    const domains = [
      'Runtime',
      'Console',
      'Network',
      'Page',
      'DOM',
      'DOMSnapshot',
      'Performance'
    ];

    for (const domain of domains) {
      try {
        await this.sendCommand(`${domain}.enable`);
      } catch (error) {
        console.warn(`Failed to enable ${domain}:`, error);
      }
    }
  }

  private setupEventListeners(): void {
    chrome.debugger.onEvent.addListener((source, method, params) => {
      if (source.tabId !== this.tabId) return;

      this.handleDevToolsEvent(method, params);
    });
  }

  private async handleDevToolsEvent(method: string, params: any): Promise<void> {
    try {
      switch (method) {
        case 'Console.messageAdded':
          await this.handleConsoleMessage(params.message);
          break;
        case 'Network.responseReceived':
          await this.handleNetworkResponse(params);
          break;
        case 'Network.loadingFailed':
          await this.handleNetworkError(params);
          break;
        case 'Runtime.exceptionThrown':
          await this.handleRuntimeException(params);
          break;
        case 'Page.loadEventFired':
          await this.handlePageLoad(params);
          break;
        case 'Page.frameNavigated':
          await this.handleFrameNavigation(params);
          break;
      }
    } catch (error) {
      console.error('Error handling DevTools event:', error);
    }
  }

  private async handleConsoleMessage(message: any): Promise<void> {
    const logData: LogData = {
      id: this.generateId(),
      level: this.mapConsoleLevel(message.level),
      message: message.text,
      args: message.args?.map((arg: any) => JSON.stringify(arg)) || [],
      timestamp: new Date().toISOString(),
      url: message.url || window.location.href,
      stack: message.stackTrace?.callFrames?.map((frame: any) => 
        `${frame.functionName} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`
      ).join('\n'),
      metadata: {
        type: 'console',
        source: message.source,
        lineNumber: message.line,
        columnNumber: message.column
      }
    };

    await this.sessionManager.addEvent({
      type: 'console',
      timestamp: logData.timestamp,
      data: logData
    });
  }

  private async handleNetworkResponse(params: any): Promise<void> {
    const logData: LogData = {
      id: this.generateId(),
      level: params.response.status >= 400 ? LogLevel.ERROR : LogLevel.INFO,
      message: `${params.response.method} ${params.response.url} - ${params.response.status}`,
      args: [params],
      timestamp: new Date().toISOString(),
      url: window.location.href,
      metadata: {
        type: 'network',
        method: params.response.method,
        status: params.response.status,
        url: params.response.url,
        responseTime: params.response.timing?.receiveHeadersEnd - params.response.timing?.requestStart
      }
    };

    await this.sessionManager.addEvent({
      type: 'network',
      timestamp: logData.timestamp,
      data: logData
    });
  }

  private async handleNetworkError(params: any): Promise<void> {
    const logData: LogData = {
      id: this.generateId(),
      level: LogLevel.ERROR,
      message: `Network error: ${params.errorText}`,
      args: [params],
      timestamp: new Date().toISOString(),
      url: window.location.href,
      metadata: {
        type: 'error',
        errorText: params.errorText,
        requestId: params.requestId
      }
    };

    await this.sessionManager.addEvent({
      type: 'network_error',
      timestamp: logData.timestamp,
      data: logData
    });
  }

  private async handleRuntimeException(params: any): Promise<void> {
    const logData: LogData = {
      id: this.generateId(),
      level: LogLevel.ERROR,
      message: `Runtime exception: ${params.exceptionDetails.text}`,
      args: [params],
      timestamp: new Date().toISOString(),
      url: window.location.href,
      stack: params.exceptionDetails.stackTrace?.callFrames?.map((frame: any) => 
        `${frame.functionName} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`
      ).join('\n'),
      metadata: {
        type: 'error',
        exceptionId: params.exceptionDetails.exceptionId,
        lineNumber: params.exceptionDetails.lineNumber,
        columnNumber: params.exceptionDetails.columnNumber
      }
    };

    await this.sessionManager.addEvent({
      type: 'runtime_exception',
      timestamp: logData.timestamp,
      data: logData
    });
  }

  private async handlePageLoad(params: any): Promise<void> {
    const logData: LogData = {
      id: this.generateId(),
      level: LogLevel.INFO,
      message: 'Page loaded',
      args: [params],
      timestamp: new Date().toISOString(),
      url: window.location.href,
      metadata: {
        type: 'console',
        loadTime: params.timestamp
      }
    };

    await this.sessionManager.addEvent({
      type: 'page_load',
      timestamp: logData.timestamp,
      data: logData
    });
  }

  private async handleFrameNavigation(params: any): Promise<void> {
    const logData: LogData = {
      id: this.generateId(),
      level: LogLevel.INFO,
      message: `Frame navigated to: ${params.frame.url}`,
      args: [params],
      timestamp: new Date().toISOString(),
      url: window.location.href,
      metadata: {
        type: 'console',
        frameId: params.frame.id,
        url: params.frame.url
      }
    };

    await this.sessionManager.addEvent({
      type: 'frame_navigation',
      timestamp: logData.timestamp,
      data: logData
    });
  }

  private async sendCommand(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.tabId) {
        reject(new Error('No tab ID'));
        return;
      }

      chrome.debugger.sendCommand(
        { tabId: this.tabId },
        method,
        params,
        (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  private mapConsoleLevel(level: string): LogLevel {
    const levelMap: { [key: string]: LogLevel } = {
      'error': LogLevel.ERROR,
      'warning': LogLevel.WARN,
      'info': LogLevel.INFO,
      'log': LogLevel.LOG,
      'debug': LogLevel.DEBUG
    };

    return levelMap[level] || LogLevel.LOG;
  }

  private generateId(): string {
    return `devtools_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
