import { EventTracker } from './services/EventTracker';
import { FloatingButton } from './ui/FloatingButton';

class ContentScript {
  private eventTracker: EventTracker;
  private floatingButton: FloatingButton;
  private isSessionActive: boolean = false;

  constructor() {
    this.eventTracker = new EventTracker();
    this.floatingButton = new FloatingButton();
  }

  public initialize(): void {
    console.log('AIテストパートナー: Content script initialized');
    
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
  }

  private setup(): void {
    // フローティングボタンを追加
    this.floatingButton.create();
    
    // イベントトラッキングを開始
    this.startEventTracking();
    
    // コンソールログの監視を開始
    this.startConsoleMonitoring();
  }

  private startEventTracking(): void {
    // クリックイベント
    document.addEventListener('click', (event) => {
      if (this.isSessionActive) {
        this.eventTracker.trackClick(event);
      }
    });

    // キーボードイベント
    document.addEventListener('keydown', (event) => {
      if (this.isSessionActive) {
        this.eventTracker.trackKeydown(event);
      }
    });

    // マウス移動イベント
    document.addEventListener('mousemove', (event) => {
      if (this.isSessionActive) {
        this.eventTracker.trackMouseMove(event);
      }
    });

    // フォーカスイベント
    document.addEventListener('focusin', (event) => {
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
      }
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      if (this.isSessionActive) {
        this.eventTracker.trackConsoleLog('error', args);
      }
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      if (this.isSessionActive) {
        this.eventTracker.trackConsoleLog('warn', args);
      }
      originalWarn.apply(console, args);
    };
  }

  private handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): void {
    switch (message.type) {
      case 'SESSION_STARTED':
        this.isSessionActive = true;
        this.floatingButton.updateStatus('active');
        break;
      case 'SESSION_STOPPED':
        this.isSessionActive = false;
        this.floatingButton.updateStatus('inactive');
        break;
      case 'TOGGLE_SESSION':
        this.toggleSession();
        break;
      case 'TAKE_SCREENSHOT':
        this.takeScreenshot();
        break;
      case 'FLAG_CURRENT_EVENT':
        this.flagCurrentEvent();
        break;
    }
  }

  private toggleSession(): void {
    chrome.runtime.sendMessage({
      type: this.isSessionActive ? 'STOP_SESSION' : 'START_SESSION'
    });
  }

  private takeScreenshot(): void {
    chrome.runtime.sendMessage({
      type: 'TAKE_SCREENSHOT'
    });
  }

  private flagCurrentEvent(): void {
    const lastEvent = this.eventTracker.getLastEvent();
    if (lastEvent) {
      chrome.runtime.sendMessage({
        type: 'FLAG_EVENT',
        eventId: lastEvent.id,
        note: prompt('フラグのメモを入力してください:') || ''
      });
    }
  }
}

// コンテンツスクリプトを初期化
const contentScript = new ContentScript();
contentScript.initialize();
