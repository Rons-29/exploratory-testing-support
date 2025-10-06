import { EventTracker } from './services/EventTracker';
import { OptimizedEventTracker } from './services/OptimizedEventTracker';
import { FloatingButton } from './ui/FloatingButton';
import { LogCollector } from './services/LogCollector';
import { LightweightLogCollector } from './services/LightweightLogCollector';

class ContentScript {
  private eventTracker: EventTracker;
  private optimizedEventTracker: OptimizedEventTracker;
  private floatingButton: FloatingButton;
  private logCollector: LogCollector;
  private lightweightLogCollector: LightweightLogCollector;
  private isSessionActive: boolean = false;
  private useLightweightMode: boolean = true; // 軽量モードをデフォルトに
  private useOptimizedEvents: boolean = true; // 最適化されたイベント追跡を使用

  constructor() {
    this.eventTracker = new EventTracker();
    this.optimizedEventTracker = new OptimizedEventTracker();
    this.floatingButton = new FloatingButton();
    this.logCollector = new LogCollector();
    this.lightweightLogCollector = new LightweightLogCollector();
  }

  public async initialize(): Promise<void> {
    // 初期化時にセッション状態を確認
    await this.checkSessionStatus();

    // ページ読み込み完了後に初期化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }

    // メッセージの受信
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });

    // ストレージ変更の購読: current_session の変更でセッション状態を同期
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (Object.prototype.hasOwnProperty.call(changes, 'current_session')) {
        const newSession = (changes as any).current_session?.newValue;
        const status = newSession?.status;
        const isActive = status === 'active' || status === 'ACTIVE';
        this.isSessionActive = Boolean(isActive);
        
        try {
          if (this.isSessionActive) {
            // セッションがアクティブな場合のみフローティングボタンを表示
            this.floatingButton.create();
            this.floatingButton.updateStatus('active');
          } else {
            // セッションが非アクティブな場合はフローティングボタンを非表示
            this.floatingButton.destroy();
          }
        } catch (e) {
          // エラーは無視（軽量化のため）
        }
      }
    });
  }

  private async checkSessionStatus(): Promise<void> {
    // メッセージ送信を無効化してストレージベースに変更（エラーの原因）
    try {
      const result = await chrome.storage.local.get('current_session');
      const session = (result as any).current_session;
      const status = session?.status;
      const isActive = status === 'active' || status === 'ACTIVE';
      this.isSessionActive = Boolean(isActive);
      
      if (this.isSessionActive) {
        // セッションがアクティブな場合のみフローティングボタンを表示
        this.floatingButton.create();
        this.floatingButton.updateStatus('active');
      } else {
        // セッションが非アクティブな場合はフローティングボタンを非表示
        this.floatingButton.destroy();
      }
    } catch (e) {
      // エラー時は非アクティブ状態として扱う
      this.isSessionActive = false;
      this.floatingButton.destroy();
    }
  }

  private setup(): void {
    // フローティングボタンは状態に応じて表示（無条件作成は削除）
    // セッション状態を確認してから表示する
    this.checkSessionStatus();

    // イベントトラッキングを開始
    this.startEventTracking();

    // コンソールログの監視を開始
    this.startConsoleMonitoring();

    // ネットワーク監視を開始
    this.startNetworkMonitoring();
  }

  private startEventTracking(): void {
    // クリックイベント
    document.addEventListener('click', event => {
      console.log('Content Script: Click event detected, isSessionActive =', this.isSessionActive);
      if (this.isSessionActive) {
        console.log('Content Script: Saving click log...');
        this.eventTracker.trackClick(event);
        this.saveLog('click', `クリック: ${(event.target as Element)?.tagName}`, {
          target: (event.target as Element)?.tagName,
          x: (event as MouseEvent).clientX,
          y: (event as MouseEvent).clientY,
        });
      } else {
        console.log('Content Script: Session not active, skipping click log');
      }
    });

    // キーボードイベント
    document.addEventListener('keydown', event => {
      if (this.isSessionActive) {
        this.eventTracker.trackKeydown(event);
        this.saveLog('keydown', `キー入力: ${event.key}`, {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        });
      }
    });

    // マウス移動イベント
    document.addEventListener('mousemove', event => {
      if (this.isSessionActive) {
        this.eventTracker.trackMouseMove(event);
      }
    });

    // フォーカスイベント
    document.addEventListener('focusin', event => {
      if (this.isSessionActive) {
        this.eventTracker.trackFocus(event);
      }
    });

    // ページ遷移イベント
    window.addEventListener('beforeunload', () => {
      if (this.isSessionActive) {
        this.eventTracker.trackPageUnload();
      }
    });
  }

  private startConsoleMonitoring(): void {
    // コンソールログの監視
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      if (this.isSessionActive) {
        this.eventTracker.trackConsoleLog('log', args);
        this.saveLog('console', `ログ: ${args.join(' ')}`, {
          level: 'log',
          args: args,
        });
      }
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      if (this.isSessionActive) {
        this.eventTracker.trackConsoleLog('error', args);
        this.saveLog('error', `エラー: ${args.join(' ')}`, {
          level: 'error',
          args: args,
        });
      }
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      if (this.isSessionActive) {
        this.eventTracker.trackConsoleLog('warn', args);
        this.saveLog('console', `警告: ${args.join(' ')}`, {
          level: 'warn',
          args: args,
        });
      }
      originalWarn.apply(console, args);
    };
  }

  private startNetworkMonitoring(): void {
    // Fetch APIの監視
    const originalFetch = window.fetch;
    const self = this;

    window.fetch = async function (...args) {
      const startTime = Date.now();
      const url = args[0] instanceof Request ? args[0].url : args[0];
      const method = args[0] instanceof Request ? args[0].method : args[1]?.method || 'GET';

      try {
        const response = await originalFetch.apply(this, args);
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (self.isSessionActive) {
          self.saveLog('network', `ネットワークリクエスト: ${method} ${url}`, {
            url: url,
            method: method,
            status: response.status,
            statusText: response.statusText,
            duration: duration,
            headers: Object.fromEntries(response.headers.entries()),
            timestamp: startTime,
          });
        }

        return response;
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (self.isSessionActive) {
          self.saveLog('network_error', `ネットワークエラー: ${method} ${url}`, {
            url: url,
            method: method,
            error: error instanceof Error ? error.message : String(error),
            duration: duration,
            timestamp: startTime,
          });
        }

        throw error;
      }
    };

    // XMLHttpRequestの監視
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ) {
      (this as any)._testMethod = method;
      (this as any)._testUrl = url.toString();
      (this as any)._testStartTime = Date.now();
      return originalXHROpen.call(this, method, url, async, username, password);
    };

    XMLHttpRequest.prototype.send = function (body?: any) {
      const xhr = this as any;
      const method = xhr._testMethod;
      const url = xhr._testUrl;
      const startTime = xhr._testStartTime;

      xhr.addEventListener('loadend', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (self.isSessionActive) {
          self.saveLog('network', `XHRリクエスト: ${method} ${url}`, {
            url: url,
            method: method,
            status: xhr.status,
            statusText: xhr.statusText,
            duration: duration,
            responseType: xhr.responseType,
            timestamp: startTime,
          });
        }
      });

      xhr.addEventListener('error', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (self.isSessionActive) {
          self.saveLog('network_error', `XHRエラー: ${method} ${url}`, {
            url: url,
            method: method,
            error: 'Network error',
            duration: duration,
            timestamp: startTime,
          });
        }
      });

      return originalXHRSend.call(this, body);
    };
  }

  private handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean {
    switch (message.type) {
      case 'PING':
        // Background scriptからの接続確認に応答
        sendResponse({ success: true });
        return true;
      case 'SESSION_STATUS':
        this.isSessionActive = message.isActive;
        if (this.isSessionActive) {
          // セッションがアクティブな場合のみフローティングボタンを表示
          this.floatingButton.create();
          this.floatingButton.updateStatus('active');
        } else {
          // セッションが非アクティブな場合はフローティングボタンを非表示
          this.floatingButton.destroy();
        }
        console.log('Content Script: Session status updated:', this.isSessionActive);
        return true;
      case 'SESSION_STARTED':
        this.isSessionActive = true;
        // セッション開始時はフローティングボタンを表示
        this.floatingButton.create();
        this.floatingButton.updateStatus('active');
        // 軽量版LogCollectorを使用
        if (this.useLightweightMode) {
          this.lightweightLogCollector.startCollecting(0);
        } else {
          this.logCollector.startCollecting(0);
        }
        console.log('Content Script: Session started');
        return true;
      case 'SESSION_STOPPED':
        this.isSessionActive = false;
        this.floatingButton.updateStatus('inactive');
        // セッション停止時はフローティングボタンを非表示にする
        this.floatingButton.destroy();
        // 軽量版LogCollectorを使用
        if (this.useLightweightMode) {
          this.lightweightLogCollector.stopCollecting();
        } else {
          this.logCollector.stopCollecting();
        }
        console.log('Content Script: Session stopped');
        return true;
      case 'START_LOG_COLLECTION':
        this.logCollector.startCollecting(0);
        return true;
      case 'TOGGLE_SESSION':
        this.toggleSession();
        return true;
      case 'TAKE_SCREENSHOT':
        this.takeScreenshot();
        return true;
      case 'FLAG_CURRENT_EVENT':
        this.flagCurrentEvent();
        return true;
      case 'FLAG_EVENT':
        this.logCollector.flagEvent(message.eventId, message.note);
        return true;
      case 'SAVE_SESSION':
        this.saveSessionToApi(message.sessionData, sendResponse);
        return true; // 非同期処理のため
      default:
        console.log('Unknown message type:', message.type);
        return false;
    }
  }

  private toggleSession(): void {
    chrome.runtime.sendMessage({
      type: this.isSessionActive ? 'STOP_SESSION' : 'START_SESSION',
    });
  }

  private takeScreenshot(): void {
    chrome.runtime.sendMessage({
      type: 'TAKE_SCREENSHOT',
    });
    this.saveLog('screenshot', 'スクリーンショットを撮影しました', {
      url: window.location.href,
      timestamp: Date.now(),
    });
  }

  private flagCurrentEvent(): void {
    const lastEvent = this.eventTracker.getLastEvent();
    if (lastEvent) {
      const note = prompt('フラグのメモを入力してください:') || '';
      chrome.runtime.sendMessage({
        type: 'FLAG_EVENT',
        eventId: lastEvent.id,
        note: note,
      });
      this.saveLog('flag', `フラグを設定: ${note}`, {
        eventId: lastEvent.id,
        note: note,
        url: window.location.href,
      });
    }
  }

  private async saveSessionToApi(
    sessionData: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      console.log('Content: Saving session to API:', sessionData);
      const response = await fetch('http://localhost:3001/api/sessions/extension', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      const result = await response.json();
      console.log('Content: API response:', result);
      sendResponse({ success: true, result });
    } catch (error) {
      console.error('Content: API save failed:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async saveLog(type: string, message: string, details?: unknown): Promise<void> {
    try {
      console.log('Content Script: saveLog called with type =', type, 'message =', message);
      const entry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        message,
        timestamp: Date.now(),
        details,
        url: window.location.href,
      };
      console.log('Content Script: Sending SAVE_LOG message with entry:', entry);
      try {
        const response = await chrome.runtime.sendMessage({ type: 'SAVE_LOG', entry });
        console.log('Content Script: SAVE_LOG message sent successfully, response:', response);
      } catch (error) {
        console.error('Content Script: Failed to send SAVE_LOG message:', error);
      }
    } catch (error) {
      console.error('Content Script: Failed to delegate save log:', error);
    }
  }
}

// コンテンツスクリプトを初期化
const contentScript = new ContentScript();
contentScript.initialize().catch(error => {
  console.error('Content Script initialization failed:', error);
});
