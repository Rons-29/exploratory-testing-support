import { EventTracker } from './services/EventTracker';
import { FloatingButton } from './ui/FloatingButton';
import { MinimalLogCollector } from './services/MinimalLogCollector';
import { ScreenshotCapture } from './services/ScreenshotCapture';

class ContentScript {
  private eventTracker: EventTracker;
  private floatingButton: FloatingButton;
  private logCollector: MinimalLogCollector;
  private screenshotCapture: ScreenshotCapture;
  private isSessionActive: boolean = false;

  constructor() {
    this.eventTracker = new EventTracker();
    this.floatingButton = new FloatingButton();
    this.logCollector = new MinimalLogCollector();
    this.screenshotCapture = new ScreenshotCapture();
  }

  public async initialize(): Promise<void> {
    console.log('探索的テスト支援: Content script initialized');

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
          this.floatingButton.updateSessionStatus(this.isSessionActive);
        } catch (e) {
          // no-op
        }
        console.log('Content Script: storage change -> session active =', this.isSessionActive);
      }
    });
  }

  private async checkSessionStatus(): Promise<void> {
    try {
      console.log('Content Script: Checking session status via message...');
      const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATUS' });
      console.log('Content Script: GET_SESSION_STATUS response:', response);
      if (response && response.success) {
        this.isSessionActive = response.isActive;
        console.log('Content Script: Session status checked via message:', this.isSessionActive);
        this.floatingButton.updateSessionStatus(this.isSessionActive);
        return;
      }
    } catch (error) {
      console.error('Content Script: Failed to check session status via message:', error);
    }
    // フォールバック: 直接ストレージからセッションを確認
    try {
      console.log('Content Script: Checking session status via storage...');
      const result = await chrome.storage.local.get('current_session');
      console.log('Content Script: Storage result:', result);
      const session = (result as any).current_session;
      const status = session?.status;
      const isActive = status === 'active' || status === 'ACTIVE';
      this.isSessionActive = Boolean(isActive);
      this.floatingButton.updateSessionStatus(this.isSessionActive);
      console.log(
        'Content Script: Fallback session status =',
        this.isSessionActive,
        'status =',
        status
      );
    } catch (e) {
      console.error('Content Script: Fallback session status check failed:', e);
    }
  }

  private setup(): void {
    // フローティングボタンを追加
    this.floatingButton.create();

    // イベントトラッキングを開始
    this.startEventTracking();

    // コンソールログの監視を開始（軽量版）
    this.startLightweightConsoleMonitoring();

    // ネットワーク監視を開始（軽量版）
    this.startLightweightNetworkMonitoring();
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

  private startLightweightConsoleMonitoring(): void {
    // 軽量版：エラーログのみ監視（MinimalLogCollectorが処理）
    // ここでは追加の監視は行わない
  }

  private startLightweightNetworkMonitoring(): void {
    // 軽量版：エラーのみ監視
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

        // エラーレスポンスのみログに記録
        if (self.isSessionActive && !response.ok && response.status >= 400) {
          self.saveLog('network_error', `ネットワークエラー: ${method} ${url}`, {
            url: url,
            method: method,
            status: response.status,
            statusText: response.statusText,
            duration: duration,
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
        this.floatingButton.updateSessionStatus(message.isActive);
        console.log('Content Script: Session status updated:', this.isSessionActive);
        return true;
      case 'SESSION_STARTED':
        this.isSessionActive = true;
        this.floatingButton.updateStatus('active');
        this.logCollector.startCollecting(0); // tabIdは不要
        console.log('Content Script: Session started');
        return true;
      case 'SESSION_STOPPED':
        this.isSessionActive = false;
        this.floatingButton.updateStatus('inactive');
        this.logCollector.stopCollecting();
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

  private async takeScreenshot(): Promise<void> {
    try {
      await this.screenshotCapture.captureManual('手動スクリーンショット');
      this.saveLog('screenshot', 'スクリーンショットを撮影しました', {
        url: window.location.href,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
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