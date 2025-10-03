import { SessionManager } from './services/SessionManager';
import { ApiClient } from './services/ApiClient';

class BackgroundService {
  private sessionManager: SessionManager;
  private apiClient: ApiClient;

  constructor() {
    this.sessionManager = new SessionManager();
    this.apiClient = new ApiClient();
  }

  public initialize(): void {
    console.log('探索的テスト支援: Background service initializing...');
    try {
      // 拡張機能のインストール時
      chrome.runtime.onInstalled.addListener(() => {
        console.log('探索的テスト支援: Extension installed event received');
        this.handleInstall();
      });

      // タブの更新時
      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        console.log('探索的テスト支援: Tab updated event received', tabId, changeInfo.status);
        this.handleTabUpdate(tabId, changeInfo, tab);
      });

      // メッセージの受信
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('探索的テスト支援: Message received', message.type, sender);
        this.handleMessage(message, sender, sendResponse);
      });
      
      console.log('探索的テスト支援: Background service initialized successfully');
    } catch (error) {
      console.error('探索的テスト支援: Failed to initialize background service:', error);
    }
  }

  private handleInstall(): void {
    console.log('探索的テスト支援: Extension installed');
    // 初期設定やデフォルト値の設定
  }

  private handleTabUpdate(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void {
    if (changeInfo.status === 'complete' && tab.url) {
      // ページ読み込み完了時の処理
      // コンテンツスクリプトが注入されているか確認してからメッセージを送信
      this.sendMessageToContentScript(tabId, { type: 'START_LOG_COLLECTION' });
    }
  }

  private async sendMessageToContentScript(tabId: number, message: any): Promise<void> {
    try {
      // 直接メッセージを送信（PINGは不要）
      await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      // コンテンツスクリプトが存在しない場合は無視
      console.log('Content script not available for tab:', tabId, error);
    }
  }

  public handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean {
    console.log('探索的テスト支援: Handling message:', message.type);
    try {
      switch (message.type) {
        case 'START_SESSION':
          console.log('探索的テスト支援: Starting session...');
          this.handleStartSession(message, sendResponse);
          return true; // 非同期処理のため
        case 'STOP_SESSION':
          console.log('探索的テスト支援: Stopping session...');
          this.handleStopSession(message, sendResponse);
          return true; // 非同期処理のため
        case 'TOGGLE_SESSION':
          console.log('探索的テスト支援: Toggling session...');
          this.handleToggleSession(message, sendResponse);
          return true; // 非同期処理のため
        case 'GET_SESSION_STATUS':
          console.log('探索的テスト支援: Getting session status...');
          this.handleGetSessionStatus(sendResponse);
          return true; // 非同期処理のため
        case 'TAKE_SCREENSHOT':
          console.log('探索的テスト支援: Taking screenshot...');
          this.handleTakeScreenshot(message, sendResponse);
          return true; // 非同期処理のため
        case 'FLAG_EVENT':
          console.log('探索的テスト支援: Flagging event...');
          this.handleFlagEvent(message, sendResponse);
          return true; // 非同期処理のため
        case 'GET_STATS':
          console.log('探索的テスト支援: Getting stats...');
          this.handleGetStats(sendResponse);
          return true; // 非同期処理のため
        case 'EXPORT_REPORT':
          console.log('探索的テスト支援: Exporting report...');
          this.handleExportReport(message, sendResponse);
          return true; // 非同期処理のため
        default:
          console.warn('探索的テスト支援: Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
          return false;
      }
    } catch (error) {
      console.error('探索的テスト支援: Error handling message:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
      return false;
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
      console.log('Background: Toggle session - isActive:', isActive);
      
      if (isActive) {
        console.log('Background: Stopping session...');
        const sessionData = await this.sessionManager.stopSession();
        await this.apiClient.saveSession(sessionData);
        
        // コンテンツスクリプトにセッション停止を通知
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
          await this.sendMessageToContentScript(tabs[0].id, { type: 'SESSION_STOPPED' });
        }
        
        sendResponse({ success: true, sessionData, isActive: false });
      } else {
        console.log('Background: Starting session...');
        const sessionId = await this.sessionManager.startSession();
        
        // コンテンツスクリプトにセッション開始を通知
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
          await this.sendMessageToContentScript(tabs[0].id, { type: 'SESSION_STARTED', sessionId });
        }
        
        sendResponse({ success: true, sessionId, isActive: true });
      }
    } catch (error) {
      console.error('Background: Toggle session error:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async handleGetSessionStatus(sendResponse: (response?: any) => void): Promise<void> {
    try {
      console.log('Background: Getting session status...');
      const isActive = await this.sessionManager.isActive();
      const sessionData = await this.sessionManager.getCurrentSession();
      console.log('Background: Session status - isActive:', isActive, 'sessionData:', sessionData);
      sendResponse({ success: true, isActive, sessionData });
    } catch (error) {
      console.error('Background: Failed to get session status:', error);
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
      // コンテンツスクリプトにフラグイベントを送信
      const tabId = message.tabId || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
      if (tabId) {
        await this.sendMessageToContentScript(tabId, {
          type: 'FLAG_EVENT',
          eventId: message.eventId,
          note: message.note
        });
      }
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async handleGetStats(sendResponse: (response?: any) => void): Promise<void> {
    try {
      const sessionData = await this.sessionManager.getCurrentSession();
      const stats = {
        eventCount: sessionData?.events?.length || 0,
        errorCount: sessionData?.events?.filter((e: any) => e.type === 'console_error' || e.type === 'network_error').length || 0,
        screenshotCount: sessionData?.screenshots?.length || 0,
        flagCount: sessionData?.flags?.length || 0
      };
      sendResponse({ success: true, stats });
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async handleExportReport(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const sessionData = await this.sessionManager.getCurrentSession();
      if (!sessionData) {
        sendResponse({ success: false, error: 'No active session' });
        return;
      }

      // 簡単なMarkdownレポートを生成
      const report = this.generateMarkdownReport(sessionData);
      
      // レポートをポップアップに送信してクリップボードにコピー
      sendResponse({ success: true, report });
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private generateMarkdownReport(sessionData: any): string {
    const startTime = new Date(sessionData.startTime).toLocaleString('ja-JP');
    const endTime = sessionData.endTime ? new Date(sessionData.endTime).toLocaleString('ja-JP') : '進行中';
    const duration = sessionData.endTime 
      ? Math.floor((new Date(sessionData.endTime).getTime() - new Date(sessionData.startTime).getTime()) / 1000 / 60)
      : Math.floor((Date.now() - new Date(sessionData.startTime).getTime()) / 1000 / 60);

    let report = `# テストレポート\n\n`;
    report += `## セッション情報\n`;
    report += `- **セッションID**: ${sessionData.id}\n`;
    report += `- **対象URL**: ${sessionData.targetUrl || 'N/A'}\n`;
    report += `- **開始時刻**: ${startTime}\n`;
    report += `- **終了時刻**: ${endTime}\n`;
    report += `- **実行時間**: ${duration}分\n\n`;

    report += `## 統計情報\n`;
    report += `- **総イベント数**: ${sessionData.events?.length || 0}\n`;
    report += `- **エラー数**: ${sessionData.events?.filter((e: any) => e.type === 'console_error' || e.type === 'network_error').length || 0}\n`;
    report += `- **スクリーンショット数**: ${sessionData.screenshots?.length || 0}\n`;
    report += `- **フラグ数**: ${sessionData.flags?.length || 0}\n\n`;

    if (sessionData.flags && sessionData.flags.length > 0) {
      report += `## 発見された問題\n\n`;
      sessionData.flags.forEach((flag: any, index: number) => {
        report += `### ${index + 1}. ${flag.note}\n`;
        report += `- **時刻**: ${new Date(flag.timestamp).toLocaleString('ja-JP')}\n`;
        report += `- **イベントID**: ${flag.eventId}\n\n`;
      });
    }

    if (sessionData.events && sessionData.events.length > 0) {
      report += `## イベントログ\n\n`;
      sessionData.events.forEach((event: any, index: number) => {
        const time = new Date(event.timestamp).toLocaleString('ja-JP');
        report += `### ${index + 1}. ${event.type} (${time})\n`;
        report += `\`\`\`json\n${JSON.stringify(event.payload, null, 2)}\n\`\`\`\n\n`;
      });
    }

    return report;
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
console.log('探索的テスト支援: Creating background service...');
const backgroundService = new BackgroundService();
console.log('探索的テスト支援: Initializing background service...');

// Service Workerの制約を考慮して初期化を確実にする
try {
  backgroundService.initialize();
  console.log('探索的テスト支援: Background service initialized successfully');
} catch (error) {
  console.error('探索的テスト支援: Failed to initialize background service:', error);
}

// メッセージハンドラーを直接設定（フォールバック）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('探索的テスト支援: Direct message handler received:', message.type);
  if (backgroundService && typeof backgroundService.handleMessage === 'function') {
    return backgroundService.handleMessage(message, sender, sendResponse);
  } else {
    console.error('探索的テスト支援: Background service not available');
    sendResponse({ success: false, error: 'Background service not available' });
    return false;
  }
});

console.log('探索的テスト支援: Background service setup complete');
