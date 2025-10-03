import { SessionManager } from './services/SessionManager';
import { LogCollector } from './services/LogCollector';
import { ApiClient } from './services/ApiClient';

class BackgroundService {
  private sessionManager: SessionManager;
  private logCollector: LogCollector;
  private apiClient: ApiClient;

  constructor() {
    this.sessionManager = new SessionManager();
    this.logCollector = new LogCollector();
    this.apiClient = new ApiClient();
  }

  public initialize(): void {
    console.log('AIテストパートナー: Background service initialized');
    
    // 拡張機能のインストール時
    chrome.runtime.onInstalled.addListener(() => {
      this.handleInstall();
    });

    // タブの更新時
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // メッセージの受信
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
  }

  private handleInstall(): void {
    console.log('AIテストパートナー: Extension installed');
    // 初期設定やデフォルト値の設定
  }

  private handleTabUpdate(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void {
    if (changeInfo.status === 'complete' && tab.url) {
      // ページ読み込み完了時の処理
      this.logCollector.startCollecting(tabId);
    }
  }

  private handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): void {
    switch (message.type) {
      case 'START_SESSION':
        this.handleStartSession(message, sendResponse);
        break;
      case 'STOP_SESSION':
        this.handleStopSession(message, sendResponse);
        break;
      case 'TOGGLE_SESSION':
        this.handleToggleSession(message, sendResponse);
        break;
      case 'GET_SESSION_STATUS':
        this.handleGetSessionStatus(sendResponse);
        break;
      case 'TAKE_SCREENSHOT':
        this.handleTakeScreenshot(message, sendResponse);
        break;
      case 'FLAG_EVENT':
        this.handleFlagEvent(message, sendResponse);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private async handleStartSession(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const sessionId = await this.sessionManager.startSession();
      sendResponse({ success: true, sessionId });
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async handleStopSession(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const sessionData = await this.sessionManager.stopSession();
      await this.apiClient.saveSession(sessionData);
      sendResponse({ success: true, sessionData });
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async handleToggleSession(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const isActive = await this.sessionManager.isActive();
      if (isActive) {
        await this.handleStopSession(message, sendResponse);
      } else {
        await this.handleStartSession(message, sendResponse);
      }
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async handleGetSessionStatus(sendResponse: (response?: any) => void): Promise<void> {
    try {
      const isActive = await this.sessionManager.isActive();
      const sessionData = await this.sessionManager.getCurrentSession();
      sendResponse({ success: true, isActive, sessionData });
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async handleTakeScreenshot(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const screenshot = await this.captureScreenshot();
      const screenshotId = await this.apiClient.uploadScreenshot(screenshot);
      sendResponse({ success: true, screenshotId });
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async handleFlagEvent(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      await this.logCollector.flagEvent(message.eventId, message.note);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async captureScreenshot(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(dataUrl);
        }
      });
    });
  }
}

// サービスを初期化
const backgroundService = new BackgroundService();
backgroundService.initialize();
