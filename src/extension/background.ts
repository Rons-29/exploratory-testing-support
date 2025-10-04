import { SessionManager } from './services/SessionManager';
// import { ApiClient } from './services/ApiClient'; // 軽量化のため一時的に無効化
// import { DevToolsMCP } from './services/DevToolsMCP'; // 軽量化のため一時的に無効化

class BackgroundService {
  private sessionManager: SessionManager;
  // private apiClient: ApiClient; // 軽量化のため一時的に無効化
  // private devToolsMCP: DevToolsMCP; // 軽量化のため一時的に無効化
  private devToolsAttached: Set<number> = new Set();
  private networkRequests: Map<number, any[]> = new Map();

  constructor() {
    this.sessionManager = new SessionManager();
    // this.apiClient = new ApiClient(); // 軽量化のため一時的に無効化
    // this.devToolsMCP = new DevToolsMCP(); // 軽量化のため一時的に無効化
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

  private handleTabUpdate(
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ): void {
    if (changeInfo.status === 'complete' && tab.url) {
      // ページ読み込み完了時の処理は無効化（エラーの原因）
      // Content Scriptは自動的に初期化されるため、メッセージ送信は不要
      console.log('Tab updated:', tabId, tab.url);
    }
  }

  // sendMessageToContentScriptメソッドは削除（エラーの原因）
  // Content Scriptはストレージ変更を監視して自動的に状態を更新

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
        case 'GET_LOGS':
          console.log('探索的テスト支援: Getting logs...');
          this.handleGetLogs(sendResponse);
          return true; // 非同期処理のため
        case 'SAVE_LOG':
          console.log('探索的テスト支援: Saving log entry...');
          console.log('探索的テスト支援: SAVE_LOG message received:', message);
          this.handleSaveLog(message, sendResponse);
          return true; // 非同期処理のため
        case 'CLEAR_LOGS':
          console.log('探索的テスト支援: Clearing logs...');
          this.handleClearLogs(sendResponse);
          return true; // 非同期処理のため
        // MCP機能は軽量化のため一時的に無効化
        // case 'MCP_CONNECT':
        //   console.log('探索的テスト支援: Connecting to MCP...');
        //   this.handleMCPConnect(sendResponse);
        //   return true; // 非同期処理のため
        // case 'MCP_ANALYZE':
        //   console.log('探索的テスト支援: Analyzing with MCP...');
        //   this.handleMCPAnalyze(message, sendResponse);
        //   return true; // 非同期処理のため
        // case 'MCP_SNAPSHOT':
        //   console.log('探索的テスト支援: Getting MCP snapshot...');
        //   this.handleMCPSnapshot(sendResponse);
        //   return true; // 非同期処理のため
        default:
          console.warn('探索的テスト支援: Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
          return false;
      }
    } catch (error) {
      console.error('探索的テスト支援: Error handling message:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private async handleStartSession(
    message: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const sessionId = await this.sessionManager.startSession();

      // DevTools Protocolをアタッチしてネットワーク監視を開始
      await this.attachDevTools();

      sendResponse({ success: true, sessionId });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleStopSession(
    message: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const sessionData = await this.sessionManager.stopSession();
      // await this.apiClient.saveSession(sessionData); // 軽量化のため一時的に無効化

      // DevToolsをデタッチ
      await this.detachDevTools();

      sendResponse({ success: true, sessionData });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleToggleSession(
    message: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const isActive = await this.sessionManager.isActive();
      console.log('Background: Toggle session - isActive:', isActive);

      if (isActive) {
        console.log('Background: Stopping session...');
        const sessionData = await this.sessionManager.stopSession();
        console.log('Background: Session data:', sessionData);

        try {
          // Background Scriptで直接APIを呼び出し
          // const apiResponse = await this.apiClient.saveSession(sessionData); // 軽量化のため一時的に無効化
          // console.log('Background: API save response:', apiResponse); // 軽量化のため一時的に無効化
        } catch (apiError) {
          console.error('Background: API save failed:', apiError);
          // API送信に失敗してもセッション停止は続行
        }

        // Content Scriptへの通知は無効化（エラーの原因）
        // Content Scriptはストレージ変更を監視して自動的に状態を更新
        console.log('Session stopped');

        sendResponse({ success: true, sessionData, isActive: false });
      } else {
        console.log('Background: Starting session...');
        const sessionId = await this.sessionManager.startSession();

        // Content Scriptへの通知は無効化（エラーの原因）
        // Content Scriptはストレージ変更を監視して自動的に状態を更新
        console.log('Session started:', sessionId);

        sendResponse({ success: true, sessionId, isActive: true });
      }
    } catch (error) {
      console.error('Background: Toggle session error:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
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
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleTakeScreenshot(
    message: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const screenshot = await this.captureScreenshot();
      // const screenshotId = await this.apiClient.uploadScreenshot(screenshot); // 軽量化のため一時的に無効化
      sendResponse({ success: true, screenshotId: 'disabled' }); // 軽量化のため一時的に無効化
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleFlagEvent(
    message: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      // フラグイベントの処理は簡素化（Content Scriptへの通知は無効化）
      console.log('Flag event:', message.eventId, message.note);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleGetStats(sendResponse: (response?: any) => void): Promise<void> {
    try {
      // SessionManagerから現在のセッションを取得して統計を計算
      const sessionData = await this.sessionManager.getCurrentSession();
      const logs = sessionData?.events || [];

      const stats = {
        eventCount: logs.length,
        clickCount: logs.filter((log: any) => log.type === 'click').length,
        keydownCount: logs.filter((log: any) => log.type === 'keydown').length,
        errorCount: logs.filter(
          (log: any) =>
            log.type === 'error' || (log.type === 'console' && log.details?.level === 'error')
        ).length,
        consoleCount: logs.filter((log: any) => log.type === 'console').length,
        networkCount: logs.filter((log: any) => log.type === 'network').length,
        networkErrorCount: logs.filter((log: any) => log.type === 'network_error').length,
        screenshotCount: logs.filter((log: any) => log.type === 'screenshot').length,
        flagCount: logs.filter((log: any) => log.type === 'flag').length,
      };

      console.log('Background: Stats calculated from session:', stats);
      sendResponse({ success: true, stats });
    } catch (error) {
      console.error('Background: Failed to get stats:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleExportReport(
    message: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      console.log('Background: handleExportReport called');

      // SessionManagerから現在のセッションを取得
      const sessionData = await this.sessionManager.getCurrentSession();
      console.log('Background: Session data retrieved:', sessionData);

      let logs = sessionData?.events || [];
      console.log('Background: Events from session:', logs.length);

      // もしセッションからのログが空の場合、test_logsも確認
      if (logs.length === 0) {
        const storageData = await chrome.storage.local.get('test_logs');
        logs = storageData.test_logs || [];
        console.log('Background: Retrieved', logs.length, 'logs from test_logs');
      }

      console.log('Background: Total logs to export:', logs.length);
      console.log('Background: First few logs:', logs.slice(0, 3));

      // 簡単なMarkdownレポートを生成
      const report = this.generateMarkdownReport(logs);

      // レポートとログデータを送信
      console.log('Background: Sending response with', logs.length, 'logs');
      sendResponse({ success: true, report, logs });
    } catch (error) {
      console.error('Background: Failed to export report:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private generateMarkdownReport(logs: any[]): string {
    const now = new Date();
    const firstLog = logs.length > 0 ? logs[0] : null;
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

    const startTime = firstLog
      ? new Date(firstLog.timestamp).toLocaleString('ja-JP')
      : now.toLocaleString('ja-JP');
    const endTime = lastLog
      ? new Date(lastLog.timestamp).toLocaleString('ja-JP')
      : now.toLocaleString('ja-JP');
    const duration = firstLog ? Math.floor((now.getTime() - firstLog.timestamp) / 1000 / 60) : 0;

    let report = `# 探索的テストレポート\n\n`;
    report += `## セッション情報\n`;
    report += `- **生成時刻**: ${now.toLocaleString('ja-JP')}\n`;
    report += `- **開始時刻**: ${startTime}\n`;
    report += `- **終了時刻**: ${endTime}\n`;
    report += `- **実行時間**: ${duration}分\n\n`;

    // 統計情報を計算
    const eventCount = logs.length;
    const clickCount = logs.filter(log => log.type === 'click').length;
    const keydownCount = logs.filter(log => log.type === 'keydown').length;
    const consoleCount = logs.filter(log => log.type === 'console').length;
    const networkCount = logs.filter(log => log.type === 'network').length;
    const networkErrorCount = logs.filter(log => log.type === 'network_error').length;
    const errorCount = logs.filter(
      log => log.type === 'error' || (log.type === 'console' && log.details?.level === 'error')
    ).length;
    const screenshotCount = logs.filter(log => log.type === 'screenshot').length;
    const flagCount = logs.filter(log => log.type === 'flag').length;

    report += `## 統計情報\n`;
    report += `- **総イベント数**: ${eventCount}\n`;
    report += `- **クリック数**: ${clickCount}\n`;
    report += `- **キー入力数**: ${keydownCount}\n`;
    report += `- **コンソール数**: ${consoleCount}\n`;
    report += `- **ネットワーク数**: ${networkCount}\n`;
    report += `- **ネットワークエラー数**: ${networkErrorCount}\n`;
    report += `- **エラー数**: ${errorCount}\n`;
    report += `- **スクリーンショット数**: ${screenshotCount}\n`;
    report += `- **フラグ数**: ${flagCount}\n\n`;

    // フラグ（発見された問題）を表示
    const flags = logs.filter(log => log.type === 'flag');
    if (flags.length > 0) {
      report += `## 発見された問題\n\n`;
      flags.forEach((flag: any, index: number) => {
        report += `### ${index + 1}. ${flag.message}\n`;
        report += `- **時刻**: ${new Date(flag.timestamp).toLocaleString('ja-JP')}\n`;
        report += `- **URL**: ${flag.url || 'N/A'}\n`;
        if (flag.details) {
          report += `- **詳細**: ${JSON.stringify(flag.details, null, 2)}\n`;
        }
        report += `\n`;
      });
    }

    // エラーログを表示
    const errors = logs.filter(
      log => log.type === 'error' || (log.type === 'console' && log.details?.level === 'error')
    );
    if (errors.length > 0) {
      report += `## エラーログ\n\n`;
      errors.forEach((error: any, index: number) => {
        report += `### ${index + 1}. ${error.message} (${new Date(error.timestamp).toLocaleString('ja-JP')})\n`;
        report += `- **URL**: ${error.url || 'N/A'}\n`;
        if (error.details) {
          report += `- **詳細**: \`\`\`json\n${JSON.stringify(error.details, null, 2)}\n\`\`\`\n`;
        }
        report += `\n`;
      });
    }

    // イベントログのサマリー
    if (logs.length > 0) {
      report += `## イベントログサマリー\n\n`;
      report += `| 時刻 | タイプ | メッセージ | URL |\n`;
      report += `|------|--------|------------|-----|\n`;

      logs.slice(-20).forEach((log: any) => {
        // 最新20件のみ表示
        const time = new Date(log.timestamp).toLocaleString('ja-JP');
        const message = log.message.replace(/\|/g, '\\|').substring(0, 50); // パイプ文字をエスケープ、50文字で切り詰め
        const url = (log.url || '').replace(/\|/g, '\\|').substring(0, 30); // 30文字で切り詰め
        report += `| ${time} | ${log.type} | ${message} | ${url} |\n`;
      });

      if (logs.length > 20) {
        report += `\n*最新20件を表示（全${logs.length}件中）*\n`;
      }
    }

    return report;
  }

  private async captureScreenshot(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab({ format: 'png' }, dataUrl => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(dataUrl);
        }
      });
    });
  }

  private async attachDevTools(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) return;

      const tabId = tabs[0].id!;

      // 既にアタッチされている場合はスキップ
      if (this.devToolsAttached.has(tabId)) {
        console.log('DevTools already attached to tab:', tabId);
        return;
      }

      // DevTools Protocolをアタッチ
      await new Promise<void>((resolve, reject) => {
        chrome.debugger.attach({ tabId }, '1.3', () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to attach debugger:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log('DevTools attached to tab:', tabId);
            this.devToolsAttached.add(tabId);
            resolve();
          }
        });
      });

      // ネットワーク監視を有効化
      await this.enableNetworkMonitoring(tabId);

      // コンソール監視を有効化
      await this.enableConsoleMonitoring(tabId);
    } catch (error) {
      console.error('Failed to attach DevTools:', error);
    }
  }

  private async detachDevTools(): Promise<void> {
    try {
      for (const tabId of this.devToolsAttached) {
        await new Promise<void>(resolve => {
          chrome.debugger.detach({ tabId }, () => {
            if (chrome.runtime.lastError) {
              console.error('Failed to detach debugger:', chrome.runtime.lastError);
            } else {
              console.log('DevTools detached from tab:', tabId);
            }
            resolve();
          });
        });
      }
      this.devToolsAttached.clear();
    } catch (error) {
      console.error('Failed to detach DevTools:', error);
    }
  }

  private async enableNetworkMonitoring(tabId: number): Promise<void> {
    try {
      // ネットワーク監視を有効化
      await new Promise<void>((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'Network.enable', {}, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });

      // ネットワークイベントのリスナーを設定
      chrome.debugger.onEvent.addListener((source, method, params) => {
        if (source.tabId === tabId && method.startsWith('Network.')) {
          this.handleNetworkEvent(method, params, tabId);
        }
      });

      console.log('Network monitoring enabled for tab:', tabId);
    } catch (error) {
      console.error('Failed to enable network monitoring:', error);
    }
  }

  private async enableConsoleMonitoring(tabId: number): Promise<void> {
    try {
      // コンソール監視を有効化
      await new Promise<void>((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'Runtime.enable', {}, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });

      // コンソールイベントのリスナーを設定
      chrome.debugger.onEvent.addListener((source, method, params) => {
        if (source.tabId === tabId && method === 'Runtime.consoleAPICalled') {
          this.handleConsoleEvent(params, tabId);
        }
      });

      console.log('Console monitoring enabled for tab:', tabId);
    } catch (error) {
      console.error('Failed to enable console monitoring:', error);
    }
  }

  private handleNetworkEvent(method: string, params: any, tabId: number): void {
    if (!this.networkRequests.has(tabId)) {
      this.networkRequests.set(tabId, []);
    }

    const requests = this.networkRequests.get(tabId)!;

    switch (method) {
      case 'Network.requestWillBeSent':
        requests.push({
          type: 'request',
          requestId: params.requestId,
          url: params.request.url,
          method: params.request.method,
          headers: params.request.headers,
          timestamp: Date.now(),
          initiator: params.initiator,
        });
        break;

      case 'Network.responseReceived':
        const requestIndex = requests.findIndex(r => r.requestId === params.requestId);
        if (requestIndex !== -1) {
          requests[requestIndex].response = {
            status: params.response.status,
            statusText: params.response.statusText,
            headers: params.response.headers,
            mimeType: params.response.mimeType,
          };
        }
        break;

      case 'Network.loadingFinished':
        const finishedIndex = requests.findIndex(r => r.requestId === params.requestId);
        if (finishedIndex !== -1) {
          requests[finishedIndex].finished = true;
          requests[finishedIndex].encodedDataLength = params.encodedDataLength;

          // ネットワークリクエストをログに保存
          this.saveNetworkRequest(requests[finishedIndex], tabId);
        }
        break;

      case 'Network.loadingFailed':
        const failedIndex = requests.findIndex(r => r.requestId === params.requestId);
        if (failedIndex !== -1) {
          requests[failedIndex].failed = true;
          requests[failedIndex].errorText = params.errorText;

          // ネットワークエラーをログに保存
          this.saveNetworkError(requests[failedIndex], tabId);
        }
        break;
    }
  }

  private handleConsoleEvent(params: any, tabId: number): void {
    const { type, args, timestamp } = params;

    // コンソールイベントをログに保存
    this.saveConsoleEvent(type, args, timestamp, tabId);
  }

  private async saveNetworkRequest(request: any, tabId: number): Promise<void> {
    try {
      const logEntry = {
        id: `network_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'network',
        message: `ネットワークリクエスト: ${request.method} ${request.url}`,
        timestamp: request.timestamp,
        details: {
          url: request.url,
          method: request.method,
          status: request.response?.status,
          statusText: request.response?.statusText,
          duration: request.finished ? Date.now() - request.timestamp : null,
          headers: request.headers,
          responseHeaders: request.response?.headers,
          mimeType: request.response?.mimeType,
          encodedDataLength: request.encodedDataLength,
          initiator: request.initiator,
        },
        url: request.url,
      };

      // ストレージに保存
      const result = await chrome.storage.local.get('test_logs');
      const logs = result.test_logs || [];
      logs.push(logEntry);

      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }

      await chrome.storage.local.set({ test_logs: logs });
    } catch (error) {
      console.error('Failed to save network request:', error);
    }
  }

  private async saveNetworkError(request: any, tabId: number): Promise<void> {
    try {
      const logEntry = {
        id: `network_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'network_error',
        message: `ネットワークエラー: ${request.method} ${request.url}`,
        timestamp: request.timestamp,
        details: {
          url: request.url,
          method: request.method,
          error: request.errorText,
          duration: Date.now() - request.timestamp,
          initiator: request.initiator,
        },
        url: request.url,
      };

      // ストレージに保存
      const result = await chrome.storage.local.get('test_logs');
      const logs = result.test_logs || [];
      logs.push(logEntry);

      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }

      await chrome.storage.local.set({ test_logs: logs });
    } catch (error) {
      console.error('Failed to save network error:', error);
    }
  }

  private async saveConsoleEvent(
    type: string,
    args: any[],
    timestamp: number,
    tabId: number
  ): Promise<void> {
    try {
      const logEntry = {
        id: `console_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'console',
        message: `コンソール${type}: ${args.map(arg => String(arg)).join(' ')}`,
        timestamp: timestamp,
        details: {
          level: type,
          args: args,
          tabId: tabId,
        },
        url: (await chrome.tabs.get(tabId)).url,
      };

      // ストレージに保存
      const result = await chrome.storage.local.get('test_logs');
      const logs = result.test_logs || [];
      logs.push(logEntry);

      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }

      await chrome.storage.local.set({ test_logs: logs });
    } catch (error) {
      console.error('Failed to save console event:', error);
    }
  }

  // MCP機能は軽量化のため一時的に無効化
  // private async handleMCPConnect(sendResponse: (response?: any) => void): Promise<void> {
  //   try {
  //     const isConnected = await this.devToolsMCP.testConnection();
  //     sendResponse({ success: true, connected: isConnected });
  //   } catch (error) {
  //     sendResponse({
  //       success: false,
  //       error: error instanceof Error ? error.message : String(error),
  //     });
  //   }
  // }

  // private async handleMCPAnalyze(
  //   message: any,
  //   sendResponse: (response?: any) => void
  // ): Promise<void> {
  //   try {
  //     const context = message.context || {};
  //     const result = await this.devToolsMCP.analyzeWithAI(context);
  //     sendResponse(result);
  //   } catch (error) {
  //     sendResponse({
  //       success: false,
  //       error: error instanceof Error ? error.message : String(error),
  //     });
  //   }
  // }

  // private async handleMCPSnapshot(sendResponse: (response?: any) => void): Promise<void> {
  //   try {
  //     const result = await this.devToolsMCP.getBrowserSnapshot();
  //     sendResponse(result);
  //   } catch (error) {
  //     sendResponse({
  //       success: false,
  //       error: error instanceof Error ? error.message : String(error),
  //     });
  //   }
  // }

  private async handleClearSession(sendResponse: (response?: any) => void): Promise<void> {
    try {
      await this.sessionManager.clearSession();
      sendResponse({ success: true, message: 'Session cleared' });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleGetLogs(sendResponse: (response?: any) => void): Promise<void> {
    try {
      // ストレージからログを取得
      const result = await chrome.storage.local.get('test_logs');
      const logs = result.test_logs || [];
      sendResponse({ success: true, logs });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleClearLogs(sendResponse: (response?: any) => void): Promise<void> {
    try {
      await chrome.storage.local.remove('test_logs');
      sendResponse({ success: true, message: 'Logs cleared' });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleSaveLog(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      console.log('Background: SAVE_LOG received, message:', message);
      console.log('Background: Message type:', message.type);
      console.log('Background: Message entry:', message.entry);
      console.log('Background: Message logEntry:', message.logEntry);

      const entry = message.entry || message.logEntry;
      if (!entry) {
        console.log('Background: No entry provided in SAVE_LOG message');
        sendResponse({ success: false, error: 'No entry provided' });
        return;
      }
      console.log('Background: Processing log entry:', entry);

      // SessionManagerにログを追加
      console.log('Background: Adding event to SessionManager...');
      await this.sessionManager.addEvent(entry);
      console.log('Background: Event added to SessionManager');

      // また、chrome.storage.localにも保存（後方互換性のため）
      const result = await chrome.storage.local.get('test_logs');
      const logs = result.test_logs || [];
      logs.push(entry);
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }
      await chrome.storage.local.set({ test_logs: logs });

      console.log('Background: Log saved successfully to both session and storage');
      sendResponse({ success: true });
    } catch (error) {
      console.error('Background: Failed to save log:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
  console.log('探索的テスト支援: backgroundService available:', !!backgroundService);
  console.log(
    '探索的テスト支援: handleMessage function available:',
    !!(backgroundService && typeof backgroundService.handleMessage === 'function')
  );

  if (backgroundService && typeof backgroundService.handleMessage === 'function') {
    console.log('探索的テスト支援: Calling backgroundService.handleMessage...');
    return backgroundService.handleMessage(message, sender, sendResponse);
  } else {
    console.error('探索的テスト支援: Background service not available');
    sendResponse({ success: false, error: 'Background service not available' });
    return false;
  }
});

console.log('探索的テスト支援: Background service setup complete');
console.log('探索的テスト支援: Background script loaded and ready');
