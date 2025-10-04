import { SessionManager } from './services/SessionManager';
// import { ApiClient } from './services/ApiClient'; // 軽量化のため一時的に無効化

class PopupController {
  private sessionManager: SessionManager;
  // private apiClient: ApiClient; // 軽量化のため一時的に無効化
  private isSessionActive: boolean = false;
  private sessionId: string | null = null;
  private sessionStartTime: Date | null = null;
  private timerInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionManager = new SessionManager();
    // this.apiClient = new ApiClient(); // 軽量化のため一時的に無効化
  }

  public initialize(): void {
    this.setupEventListeners();
    this.loadSessionStatus();
    this.startStatsUpdate();

    // test_logs 変更で統計を自動更新
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (Object.prototype.hasOwnProperty.call(changes, 'test_logs')) {
        this.updateStats();
      }
    });
  }

  private setupEventListeners(): void {
    // セッション切り替えボタン
    const toggleButton = document.getElementById('toggleSession');
    toggleButton?.addEventListener('click', () => this.toggleSession());

    // スクリーンショットボタン
    const screenshotButton = document.getElementById('takeScreenshot');
    screenshotButton?.addEventListener('click', () => this.takeScreenshot());

    // ログ確認ボタン
    const viewLogsButton = document.getElementById('viewLogs');
    viewLogsButton?.addEventListener('click', () => this.viewLogs());

    // レポート出力ボタン
    const exportButton = document.getElementById('exportReport');
    exportButton?.addEventListener('click', () => this.exportReport());

    // レポート表示ボタン
    const reportButton = document.getElementById('viewReport');
    reportButton?.addEventListener('click', () => this.viewReport());

    // 設定ボタン
    const settingsButton = document.getElementById('openSettings');
    settingsButton?.addEventListener('click', () => this.openSettings());

    // MCP連携ボタンは軽量化のため一時的に無効化
    // const mcpAnalyzeButton = document.getElementById('mcpAnalyze');
    // mcpAnalyzeButton?.addEventListener('click', () => this.mcpAnalyze());

    // const mcpSnapshotButton = document.getElementById('mcpSnapshot');
    // mcpSnapshotButton?.addEventListener('click', () => this.mcpSnapshot());

    // キーボードショートカット
    document.addEventListener('keydown', e => {
      this.handleKeyboardShortcut(e);
    });
  }

  private async loadSessionStatus(): Promise<void> {
    try {
      console.log('Loading session status...');
      const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATUS' });
      console.log('Session status response:', response);
      if (response && response.success) {
        this.isSessionActive = response.isActive;
        this.sessionId = response.sessionData?.id || null;
        this.sessionStartTime = response.sessionData?.startTime || null;
        this.updateUI();
      } else {
        console.log('No active session or invalid response');
      }
    } catch (error) {
      console.error('Failed to load session status:', error);
    }
  }

  private async toggleSession(): Promise<void> {
    try {
      // 拡張機能のコンテキストが有効かチェック
      if (!chrome.runtime?.id) {
        console.log('Extension context invalidated, cannot toggle session');
        this.showNotification('拡張機能が無効です。ページを再読み込みしてください。', 'error');
        return;
      }

      console.log('Toggling session...');
      const response = await chrome.runtime.sendMessage({ type: 'TOGGLE_SESSION' });
      console.log('Toggle session response:', response);
      if (response && response.success) {
        // Background Scriptから返された状態を使用
        this.isSessionActive = response.isActive;

        if (this.isSessionActive) {
          this.sessionId = response.sessionId;
          this.sessionStartTime = new Date();
          this.startTimer();
        } else {
          this.sessionId = null;
          this.sessionStartTime = null;
          this.stopTimer();
        }
        this.updateUI();
        this.updateStats(); // 統計情報も更新
      } else {
        console.log('Failed to toggle session:', response);
        this.showNotification('セッションの切り替えに失敗しました', 'error');
      }
    } catch (error) {
      console.error('Failed to toggle session:', error);
      this.showNotification('セッションの切り替えに失敗しました', 'error');
    }
  }

  private async takeScreenshot(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'TAKE_SCREENSHOT' });
      if (response && response.success) {
        this.showNotification('スクリーンショットを撮影しました', 'success');
        this.updateStats();
      } else {
        this.showNotification('スクリーンショットの撮影に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      this.showNotification('スクリーンショットの撮影に失敗しました', 'error');
    }
  }

  private viewLogs(): void {
    // ログ確認画面を開く
    chrome.tabs.create({ url: chrome.runtime.getURL('logs.html') });
  }

  private viewReport(): void {
    // レポート表示画面を開く
    chrome.tabs.create({ url: chrome.runtime.getURL('report.html') });
  }

  private async exportReport(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'EXPORT_REPORT' });
      if (response && response.success) {
        // クリップボードにコピー
        await navigator.clipboard.writeText(response.report);
        this.showNotification('レポートをクリップボードにコピーしました', 'success');
      } else {
        this.showNotification('レポートの出力に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      this.showNotification('レポートの出力に失敗しました', 'error');
    }
  }

  private openSettings(): void {
    // 設定画面を開く
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  }

  private handleKeyboardShortcut(e: KeyboardEvent): void {
    // Ctrl+Shift+T: テスト開始/終了
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      this.toggleSession();
    }

    // Ctrl+Shift+F: フラグ
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      this.flagEvent();
    }

    // Ctrl+Shift+S: スクリーンショット
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      this.takeScreenshot();
    }

    // Ctrl+Shift+L: ログ確認
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      this.viewLogs();
    }

    // Ctrl+Shift+E: レポート出力
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      this.exportReport();
    }
  }

  private async flagEvent(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'FLAG_CURRENT_EVENT' });
      if (response && response.success) {
        this.showNotification('フラグを設定しました', 'success');
      }
    } catch (error) {
      console.error('Failed to flag event:', error);
      this.showNotification('フラグの設定に失敗しました', 'error');
    }
  }

  private updateUI(): void {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusDot = statusIndicator?.querySelector('.status-dot');
    const statusText = statusIndicator?.querySelector('.status-text');
    const toggleButton = document.getElementById('toggleSession');
    const sessionInfo = document.getElementById('sessionInfo');
    const sessionId = document.getElementById('sessionId');
    const quickActions = document.querySelectorAll('.quick-actions .btn');

    if (this.isSessionActive) {
      // アクティブ状態
      statusDot?.classList.remove('inactive');
      statusDot?.classList.add('active');
      if (statusText) statusText.textContent = '記録中';

      const btnIcon = toggleButton?.querySelector('.btn-icon');
      const btnText = toggleButton?.querySelector('.btn-text');
      if (btnIcon) btnIcon.textContent = '⏹';
      if (btnText) btnText.textContent = 'テスト停止';

      if (sessionInfo) sessionInfo.style.display = 'block';
      if (sessionId) sessionId.textContent = this.sessionId || '-';

      quickActions.forEach(btn => btn.removeAttribute('disabled'));
    } else {
      // 非アクティブ状態
      statusDot?.classList.remove('active');
      statusDot?.classList.add('inactive');
      if (statusText) statusText.textContent = '停止中';

      const btnIcon = toggleButton?.querySelector('.btn-icon');
      const btnText = toggleButton?.querySelector('.btn-text');
      if (btnIcon) btnIcon.textContent = '▶';
      if (btnText) btnText.textContent = 'テスト開始';

      if (sessionInfo) sessionInfo.style.display = 'none';

      quickActions.forEach(btn => btn.setAttribute('disabled', 'true'));
    }
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.updateSessionDuration();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateSessionDuration(): void {
    if (this.sessionStartTime) {
      const now = new Date();
      const duration = now.getTime() - this.sessionStartTime.getTime();
      const hours = Math.floor(duration / 3600000);
      const minutes = Math.floor((duration % 3600000) / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);

      const durationElement = document.getElementById('sessionDuration');
      if (durationElement) {
        durationElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }
  }

  private async updateStats(): Promise<void> {
    try {
      // 拡張機能のコンテキストが有効かチェック
      if (!chrome.runtime?.id) {
        console.log('Extension context invalidated, skipping stats update');
        return;
      }

      const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (response && response.success) {
        console.log('Popup: Stats received:', response.stats);
        document.getElementById('eventCount')!.textContent = response.stats.eventCount || '0';
        document.getElementById('clickCount')!.textContent = response.stats.clickCount || '0';
        document.getElementById('keydownCount')!.textContent = response.stats.keydownCount || '0';
        document.getElementById('consoleCount')!.textContent = response.stats.consoleCount || '0';
        document.getElementById('networkCount')!.textContent = response.stats.networkCount || '0';
        document.getElementById('networkErrorCount')!.textContent =
          response.stats.networkErrorCount || '0';
        document.getElementById('errorCount')!.textContent = response.stats.errorCount || '0';
        document.getElementById('screenshotCount')!.textContent =
          response.stats.screenshotCount || '0';
        document.getElementById('flagCount')!.textContent = response.stats.flagCount || '0';
      } else {
        console.log('Popup: Failed to get stats:', response);
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
      // エラーが発生した場合は統計をリセット
      document.getElementById('eventCount')!.textContent = '0';
      document.getElementById('clickCount')!.textContent = '0';
      document.getElementById('keydownCount')!.textContent = '0';
      document.getElementById('consoleCount')!.textContent = '0';
      document.getElementById('networkCount')!.textContent = '0';
      document.getElementById('networkErrorCount')!.textContent = '0';
      document.getElementById('errorCount')!.textContent = '0';
      document.getElementById('screenshotCount')!.textContent = '0';
      document.getElementById('flagCount')!.textContent = '0';
    }
  }

  private startStatsUpdate(): void {
    // 5秒ごとに統計情報を更新
    setInterval(() => {
      this.updateStats();
    }, 5000);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    // 簡単な通知表示（実際の実装ではより洗練されたUIを使用）
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  private async mcpAnalyze(): Promise<void> {
    try {
      this.showNotification('AI分析を実行中...', 'info');

      // 現在のログを取得してコンテキストとして送信
      const logsResponse = await chrome.runtime.sendMessage({ type: 'GET_LOGS' });
      const context = {
        logs: logsResponse.logs || [],
        sessionActive: this.isSessionActive,
        timestamp: Date.now(),
      };

      const response = await chrome.runtime.sendMessage({
        type: 'MCP_ANALYZE',
        context: context,
      });

      if (response && response.success) {
        this.showNotification('AI分析が完了しました', 'success');
        console.log('AI Analysis Result:', response.data);

        // 分析結果をログに保存
        await this.saveAnalysisResult(response.data);
      } else {
        this.showNotification('AI分析に失敗しました', 'error');
        console.error('MCP Analysis failed:', response);
      }
    } catch (error) {
      console.error('Failed to run MCP analysis:', error);
      this.showNotification('AI分析に失敗しました', 'error');
    }
  }

  private async mcpSnapshot(): Promise<void> {
    try {
      this.showNotification('MCPスナップショットを取得中...', 'info');

      const response = await chrome.runtime.sendMessage({ type: 'MCP_SNAPSHOT' });

      if (response && response.success) {
        this.showNotification('MCPスナップショットを取得しました', 'success');
        console.log('MCP Snapshot:', response.data);

        // スナップショットをログに保存
        await this.saveSnapshotResult(response.data);
      } else {
        this.showNotification('MCPスナップショットの取得に失敗しました', 'error');
        console.error('MCP Snapshot failed:', response);
      }
    } catch (error) {
      console.error('Failed to get MCP snapshot:', error);
      this.showNotification('MCPスナップショットの取得に失敗しました', 'error');
    }
  }

  private async saveAnalysisResult(analysisData: any): Promise<void> {
    try {
      const logEntry = {
        id: `ai_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'ai_analysis',
        message: 'AI分析結果',
        timestamp: Date.now(),
        details: analysisData,
        url: window.location.href,
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
      console.error('Failed to save analysis result:', error);
    }
  }

  private async saveSnapshotResult(snapshotData: any): Promise<void> {
    try {
      const logEntry = {
        id: `mcp_snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'mcp_snapshot',
        message: 'MCPスナップショット',
        timestamp: Date.now(),
        details: snapshotData,
        url: window.location.href,
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
      console.error('Failed to save snapshot result:', error);
    }
  }
}

// ポップアップを初期化
const popupController = new PopupController();
popupController.initialize();
