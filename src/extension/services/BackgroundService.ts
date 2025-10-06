import { SessionManager } from './SessionManager';
import { ApiClient } from './ApiClient';

export class BackgroundService {
  private sessionManager: SessionManager;
  private apiClient: ApiClient;

  constructor() {
    this.sessionManager = new SessionManager();
    this.apiClient = new ApiClient();
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
        case 'CLEAR_SESSION':
          console.log('探索的テスト支援: Clearing session...');
          this.handleClearSession(sendResponse);
          return true; // 非同期処理のため
        case 'ADD_LOG':
          console.log('探索的テスト支援: Adding log...');
          this.handleAddLog(message, sendResponse);
          return true; // 非同期処理のため
        default:
          console.log('探索的テスト支援: Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
          return false;
      }
    } catch (error) {
      console.error('探索的テスト支援: Message handling error:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  public handleTabUpdate(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void {
    if (changeInfo.status === 'complete' && tab.url) {
      // ページ読み込み完了時の処理は無効化（エラーの原因）
      // Content Scriptは自動的に初期化されるため、メッセージ送信は不要
      console.log('Tab updated:', tabId, tab.url);
    }
  }

  private async sendMessageToContentScript(tabId: number, message: any): Promise<void> {
    // メッセージパッシングを完全に無効化（エラーの根本原因）
    // 代わりにchrome.storage.onChangedを使用してContent Scriptと同期
    console.log('Background: Message passing disabled, using storage-based synchronization');
  }

  private isRestrictedUrl(url: string): boolean {
    const restrictedPatterns = [
      'chrome://',
      'chrome-extension://',
      'moz-extension://',
      'edge://',
      'about:',
      'file://',
      'data:',
      'javascript:',
      'vbscript:'
    ];
    
    return restrictedPatterns.some(pattern => url.startsWith(pattern));
  }

  private formatDate(date: any): string | null {
    if (!date) return null;
    
    try {
      let dateObj: Date;
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        return null;
      }

      if (isNaN(dateObj.getTime())) {
        return null;
      }

      return dateObj.toISOString();
    } catch (error) {
      console.error('Failed to format date:', error);
      return null;
    }
  }

  private async handleStartSession(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const sessionId = await this.sessionManager.startSession();
      console.log('Background: Session started:', sessionId);
      
      // メッセージパッシングを無効化、ストレージベースの同期を使用
      console.log('Background: Using storage-based synchronization for session start');
      
      sendResponse({ success: true, sessionId, isActive: true });
    } catch (error) {
      console.error('Background: Start session error:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async handleStopSession(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const sessionData = await this.sessionManager.stopSession();
      console.log('Background: Session stopped:', sessionData.id);
      
      // APIにセッションデータを送信
      try {
        await this.apiClient.saveSession(sessionData);
        console.log('Background: Session saved to API');
      } catch (apiError) {
        console.error('Background: API save failed:', apiError);
        // API送信に失敗してもセッション停止は続行
      }
      
      // メッセージパッシングを無効化、ストレージベースの同期を使用
      console.log('Background: Using storage-based synchronization for session stop');
      
      sendResponse({ success: true, sessionData, isActive: false });
    } catch (error) {
      console.error('Background: Stop session error:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async handleToggleSession(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const isActive = await this.sessionManager.isActive();
      
      if (isActive) {
        // セッションを停止
        const sessionData = await this.sessionManager.stopSession();
        console.log('Background: Session stopped:', sessionData.id);
        
        // APIにセッションデータを送信
        try {
          await this.apiClient.saveSession(sessionData);
          console.log('Background: Session saved to API');
        } catch (apiError) {
          console.error('Background: API save failed:', apiError);
          // API送信に失敗してもセッション停止は続行
        }
        
        // セッション停止の通知は無効化（エラーの原因）
        // Content Scriptはストレージ変更を監視して自動的に状態を更新
        console.log('Session stopped:', sessionData.id);
        
        sendResponse({ success: true, sessionData, isActive: false });
      } else {
        console.log('Background: Starting session...');
        const sessionId = await this.sessionManager.startSession();
        
        // Content Scriptの再注入は無効化（エラーの原因）
        // アクティブなタブのみにセッション開始を通知
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        for (const tab of activeTabs) {
          if (tab.id) {
            try {
              // セッション開始を通知（Content Scriptは既に注入済み）
              await this.sendMessageToContentScript(tab.id, { type: 'SESSION_STARTED', sessionId });
            } catch (error) {
              console.log(`Background: Content script not available for active tab ${tab.id}:`, error);
            }
          }
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
      console.log('🔄 Background: Getting session status...');
      const isActive = await this.sessionManager.isActive();
      const sessionData = await this.sessionManager.getCurrentSession();
      console.log('🔄 Background: Session status - isActive:', isActive, 'sessionData:', sessionData);
      
      // デバッグ: ストレージから直接確認
      try {
        const storageResult = await chrome.storage.local.get('current_session');
        console.log('🔄 Background: Direct storage check:', storageResult);
      } catch (error) {
        console.log('🔄 Background: Direct storage check failed:', error);
      }
      
      // セッションデータを安全にフォーマット
      const formatDate = (date: any): string | null => {
        if (!date) return null;
        
        try {
          let dateObj: Date;
          if (date instanceof Date) {
            dateObj = date;
          } else if (typeof date === 'string') {
            dateObj = new Date(date);
          } else {
            return null;
          }

          if (isNaN(dateObj.getTime())) {
            return null;
          }

          return dateObj.toISOString();
        } catch (error) {
          console.error('Failed to format date:', error);
          return null;
        }
      };

      const formattedSessionData = sessionData ? {
        ...sessionData,
        startTime: formatDate(sessionData.startTime),
        endTime: formatDate(sessionData.endTime),
        createdAt: formatDate(sessionData.createdAt),
        updatedAt: formatDate(sessionData.updatedAt)
      } : null;

      sendResponse({
        success: true,
        isActive,
        sessionData: formattedSessionData
      });
    } catch (error) {
      console.error('Background: Get session status error:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async handleTakeScreenshot(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const tabId = message.tabId || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
      if (!tabId) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      const dataUrl = await chrome.tabs.captureVisibleTab(undefined as any, { format: 'png' });
      const screenshotId = `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // セッションにスクリーンショットを追加
      await this.sessionManager.addScreenshot(dataUrl);
      
      sendResponse({ success: true, screenshotId, dataUrl });
    } catch (error) {
      console.error('Background: Take screenshot error:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async handleFlagEvent(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
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
      // SessionManagerから現在のセッションを取得して統計を計算
      const sessionData = await this.sessionManager.getCurrentSession();
      
      if (!sessionData) {
        sendResponse({ success: true, stats: { eventsCount: 0, logsCount: 0, screenshotsCount: 0 } });
        return;
      }

      const stats = {
        eventsCount: sessionData.events?.length || 0,
        logsCount: sessionData.logs?.length || 0,
        screenshotsCount: sessionData.screenshots?.length || 0,
        flagsCount: sessionData.flags?.length || 0,
        sessionId: sessionData.id,
        sessionName: sessionData.name,
        sessionStatus: sessionData.status,
        startTime: this.formatDate(sessionData.startTime),
        duration: sessionData.startTime ? Date.now() - new Date(sessionData.startTime).getTime() : 0
      };

      sendResponse({ success: true, stats });
    } catch (error) {
      console.error('Background: Get stats error:', error);
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
      sendResponse({ success: true, report });
    } catch (error) {
      console.error('Background: Export report error:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private generateMarkdownReport(sessionData: any): string {
    const startTime = sessionData.startTime ? new Date(sessionData.startTime).toLocaleString() : 'N/A';
    const duration = sessionData.startTime ? 
      Math.floor((Date.now() - sessionData.startTime.getTime()) / 1000) : 0;
    
    return `# 探索的テストレポート

## セッション情報
- **ID**: ${sessionData.id}
- **名前**: ${sessionData.name}
- **開始時刻**: ${startTime}
- **経過時間**: ${duration}秒
- **ステータス**: ${sessionData.status}

## 統計
- **イベント数**: ${sessionData.events?.length || 0}
- **ログ数**: ${sessionData.logs?.length || 0}
- **スクリーンショット数**: ${sessionData.screenshots?.length || 0}
- **フラグ数**: ${sessionData.flags?.length || 0}

## イベント一覧
${sessionData.events?.map((event: any) => 
  `- **${event.type}** (${new Date(event.timestamp).toLocaleString()}): ${event.message || 'No message'}`
).join('\n') || 'イベントなし'}

## ログ一覧
${sessionData.logs?.map((log: any) => 
  `- **${log.level}** (${new Date(log.timestamp).toLocaleString()}): ${log.message}`
).join('\n') || 'ログなし'}

---
生成日時: ${new Date().toLocaleString()}
`;
  }

  private async handleClearSession(sendResponse: (response?: any) => void): Promise<void> {
    try {
      await this.sessionManager.clearSession();
      sendResponse({ success: true });
    } catch (error) {
      console.error('Background: Clear session error:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async handleAddLog(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      await this.sessionManager.addLog(message.logData);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Background: Add log error:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
}
