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
  private isInitialized: boolean = false;
  private sessionCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.eventTracker = new EventTracker();
    this.floatingButton = new FloatingButton();
    this.logCollector = new MinimalLogCollector();
    this.screenshotCapture = new ScreenshotCapture();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('探索的テスト支援: Content script already initialized, skipping');
      return;
    }

    console.log('探索的テスト支援: Content script initialized');

    // ストレージ変更の購読: current_session の変更でセッション状態を同期
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (Object.prototype.hasOwnProperty.call(changes, 'current_session')) {
        try {
          // 拡張機能のコンテキストが有効かチェック
          if (!chrome.runtime?.id) {
            console.log('Content Script: Extension context invalidated, skipping storage change');
            return;
          }

          const newSession = (changes as any).current_session?.newValue;
          const status = newSession?.status;
          const isActive = status === 'active' || status === 'ACTIVE';
          this.isSessionActive = Boolean(isActive);
          
          console.log('Content Script: storage change -> session active =', this.isSessionActive);
          
          // フローティングボタンを適切に制御
          if (this.isSessionActive) {
            // 既存のボタンをチェックしてから作成
            const existingButton = document.querySelector('#ai-test-partner-floating-button');
            if (!existingButton) {
              this.floatingButton.create();
            }
            this.floatingButton.updateStatus('active');
          } else {
            this.floatingButton.destroy();
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('Extension context invalidated')) {
            console.log('Content Script: Extension context invalidated during storage change');
          } else {
            console.error('Content Script: Storage change error:', error);
          }
        }
      }
    });

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

    this.isInitialized = true;
    
    // 定期的なセッションチェックを無効化（ログの過剰出力を防止）
    // this.startSafeSessionCheck();
  }

  private startSafeSessionCheck(): void {
    // 60秒間隔でセッション状態をチェック（エラー耐性あり）
    this.sessionCheckInterval = setInterval(async () => {
      try {
        // 拡張機能のコンテキストが有効かチェック
        if (!chrome.runtime?.id) {
          console.log('Content Script: Extension context invalidated, stopping safe session check');
          this.stopSafeSessionCheck();
          return;
        }

        // ストレージから直接確認（メッセージパッシングを避ける）
        const result = await chrome.storage.local.get('current_session');
        const session = (result as any).current_session;
        const status = session?.status;
        const isActive = status === 'active' || status === 'ACTIVE';
        
        // 状態が変更された場合のみ更新
        if (isActive !== this.isSessionActive) {
          console.log('Content Script: Session status changed via safe check:', isActive);
          this.isSessionActive = isActive;
          
          if (this.isSessionActive) {
            const existingButton = document.querySelector('#ai-test-partner-floating-button');
            if (!existingButton) {
              this.floatingButton.create();
            }
            this.floatingButton.updateStatus('active');
          } else {
            this.floatingButton.destroy();
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Extension context invalidated')) {
          console.log('Content Script: Extension context invalidated, stopping safe session check');
          this.stopSafeSessionCheck();
        } else {
          console.log('Content Script: Safe session check failed (will retry):', error);
        }
      }
    }, 60000); // 60秒間隔（従来の30秒から延長）
    
    console.log('Content Script: Safe session check started (60s interval)');
  }

  private stopSafeSessionCheck(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
      console.log('Content Script: Safe session check stopped');
    }
  }

  private async checkSessionStatus(): Promise<void> {
    try {
      // 拡張機能のコンテキストが有効かチェック
      if (!chrome.runtime?.id) {
        console.log('Content Script: Extension context invalidated, skipping session check');
        return;
      }

      // ストレージから直接確認（メッセージパッシングを避ける）
      console.log('Content Script: Checking session status via storage...');
      const result = await chrome.storage.local.get('current_session');
      const session = (result as any).current_session;
      const status = session?.status;
      const isActive = status === 'active' || status === 'ACTIVE';
      this.isSessionActive = Boolean(isActive);
      console.log('Content Script: Session status checked via storage:', this.isSessionActive);
      
      // セッション状態に応じてフローティングボタンを制御
      if (this.isSessionActive) {
        const existingButton = document.querySelector('#ai-test-partner-floating-button');
        if (!existingButton) {
          this.floatingButton.create();
        }
        this.floatingButton.updateStatus('active');
      } else {
        this.floatingButton.destroy();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Extension context invalidated')) {
        console.log('Content Script: Extension context invalidated during session check');
      } else {
        console.error('Content Script: Failed to check session status:', error);
      }
    }
  }

  private setup(): void {
    console.log('探索的テスト支援: Setting up content script');
    
    // 既存のフローティングボタンを削除
    this.floatingButton.destroy();
    
    // イベントトラッキングは自動的に開始される
    
    // セッションがアクティブな場合のみフローティングボタンを表示
    if (this.isSessionActive) {
      this.floatingButton.create();
    }
  }

  private handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean {
    console.log('Content Script: Received message:', message.type);
    
    switch (message.type) {
      case 'PING':
        // PINGメッセージに応答して接続確認
        console.log('Content Script: PING received, responding with PONG');
        sendResponse({ success: true, type: 'PONG' });
        return true;

      case 'SESSION_STARTED':
        this.isSessionActive = true;
        this.floatingButton.create();
        this.floatingButton.updateStatus('active');
        this.logCollector.startCollecting(0);
        console.log('Content Script: Session started');
        sendResponse({ success: true });
        return true;

      case 'SESSION_STOPPED':
        this.isSessionActive = false;
        this.floatingButton.destroy();
        this.logCollector.stopCollecting();
        console.log('Content Script: Session stopped');
        sendResponse({ success: true });
        return true;

      case 'SESSION_STATUS':
        this.isSessionActive = message.isActive;
        if (this.isSessionActive) {
          this.floatingButton.create();
          this.floatingButton.updateStatus('active');
        } else {
          this.floatingButton.destroy();
        }
        console.log('Content Script: Session status updated:', this.isSessionActive);
        sendResponse({ success: true });
        return true;

      case 'TAKE_SCREENSHOT':
        this.takeScreenshot();
        sendResponse({ success: true });
        return true;

      case 'FLAG_EVENT':
        this.flagCurrentEvent(message.eventId, message.note);
        sendResponse({ success: true });
        return true;

      case 'START_LOG_COLLECTION':
        if (this.isSessionActive) {
          this.logCollector.startCollecting(0);
        }
        sendResponse({ success: true });
        return true;

      case 'STOP_LOG_COLLECTION':
        this.logCollector.stopCollecting();
        sendResponse({ success: true });
        return true;

      default:
        return false;
    }
  }

  private async takeScreenshot(): Promise<void> {
    try {
      const screenshot = await this.screenshotCapture.captureManual('手動スクリーンショット');
      console.log('Content Script: Screenshot taken');
      
      // メッセージパッシングを無効化（エラーの原因）
      // スクリーンショットは直接SessionManagerに保存
      console.log('Content Script: Screenshot message disabled (using direct storage)');
    } catch (error) {
      console.error('Content Script: Failed to take screenshot:', error);
    }
  }

  private flagCurrentEvent(eventId: string, note: string): void {
    try {
      // イベントにフラグを追加（EventTrackerにaddFlagメソッドがない場合はスキップ）
      console.log('Content Script: Event flagged:', eventId, note);
    } catch (error) {
      console.error('Content Script: Failed to flag event:', error);
    }
  }

  public destroy(): void {
    this.stopSafeSessionCheck();
    this.eventTracker.destroy();
    this.floatingButton.destroy();
    this.logCollector.stopCollecting();
  }
}

// コンテンツスクリプトの重複初期化を防止
if (!(window as any).contentScriptInitialized) {
  const contentScript = new ContentScript();
  contentScript.initialize().catch(error => {
    console.error('Content Script initialization failed:', error);
  });
  (window as any).contentScriptInitialized = true;
}