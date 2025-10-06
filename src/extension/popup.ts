import { SessionManager } from './services/SessionManager';
import { ApiClient } from './services/ApiClient';
import { ScreenshotCapture } from './services/ScreenshotCapture';
import { DataExporter } from './services/DataExporter';

class PopupController {
  private sessionManager: SessionManager;
  private apiClient: ApiClient;
  private screenshotCapture: ScreenshotCapture;
  private dataExporter: DataExporter;
  private isSessionActive: boolean = false;
  private sessionId: string | null = null;
  private sessionStartTime: Date | null = null;
  private timerInterval: NodeJS.Timeout | null = null;
  private statsUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionManager = new SessionManager();
    this.apiClient = new ApiClient();
    this.screenshotCapture = new ScreenshotCapture();
    this.dataExporter = new DataExporter();
  }

  // デストラクタでタイマーをクリーンアップ
  public destroy(): void {
    this.stopTimer();
    this.stopStatsUpdate();
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

    // データエクスポートボタン
    const dataExportButton = document.getElementById('exportData');
    dataExportButton?.addEventListener('click', () => this.exportData());

    // Webアプリ送信ボタン
    const webAppButton = document.getElementById('sendToWebApp');
    webAppButton?.addEventListener('click', () => this.sendToWebApp());

    // 設定ボタン
    const settingsButton = document.getElementById('openSettings');
    settingsButton?.addEventListener('click', () => this.openSettings());

    // MCP連携ボタン
    const mcpAnalyzeButton = document.getElementById('mcpAnalyze');
    mcpAnalyzeButton?.addEventListener('click', () => this.mcpAnalyze());

    const mcpSnapshotButton = document.getElementById('mcpSnapshot');
    mcpSnapshotButton?.addEventListener('click', () => this.mcpSnapshot());

    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcut(e);
    });
  }

  private async loadSessionStatus(): Promise<void> {
    try {
      // 拡張機能のコンテキストが有効かチェック
      if (!chrome.runtime?.id) {
        console.log('Extension context invalidated, cannot load session status');
        this.showNotification('拡張機能が無効です。ページを再読み込みしてください。', 'error');
        return;
      }

      console.log('Loading session status...');
      const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATUS' });
      console.log('Session status response:', response);
      
      if (response && response.success) {
        this.isSessionActive = response.isActive;
        this.sessionId = response.sessionData?.id || null;
        
        // セッション開始時間を安全に処理
        if (this.isSessionActive && response.sessionData?.startTime) {
          try {
            this.sessionStartTime = new Date(response.sessionData.startTime);
            // 有効な日付かチェック
            if (isNaN(this.sessionStartTime.getTime())) {
              console.warn('Invalid startTime:', response.sessionData.startTime);
              this.sessionStartTime = null;
            } else {
              this.startTimer();
              console.log('Popup: Session started at:', this.sessionStartTime);
            }
          } catch (error) {
            console.error('Failed to parse startTime:', error);
            this.sessionStartTime = null;
          }
        } else {
          this.sessionStartTime = null;
          this.stopTimer();
        }
        
        this.updateUI();
        this.updateStats();
      } else {
        console.log('No active session or invalid response');
        this.isSessionActive = false;
        this.sessionId = null;
        this.sessionStartTime = null;
        this.stopTimer();
        this.updateUI();
      }
    } catch (error) {
      console.error('Failed to load session status:', error);
      // エラー時は安全な状態にリセット
      this.isSessionActive = false;
      this.sessionId = null;
      this.sessionStartTime = null;
      this.stopTimer();
      this.updateUI();
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

      console.log('🐛 DEBUG: Toggling session...');
      console.log('🐛 DEBUG: Current session state:', this.isSessionActive);
      console.log('🐛 DEBUG: Current session ID:', this.sessionId);
      
      const response = await chrome.runtime.sendMessage({ type: 'TOGGLE_SESSION' });
      console.log('🐛 DEBUG: Toggle session response:', response);
      
      if (response && response.success) {
        console.log('🐛 DEBUG: Toggle successful, updating state...');
        console.log('🐛 DEBUG: New session state:', response.isActive);
        console.log('🐛 DEBUG: New session ID:', response.sessionId);
        
        // Background Scriptから返された状態を使用
        this.isSessionActive = response.isActive;
        
        if (this.isSessionActive) {
          this.sessionId = response.sessionId;
          this.sessionStartTime = new Date();
          this.startTimer();
          console.log('🐛 DEBUG: Session started, timer started');
        } else {
          this.sessionId = null;
          this.sessionStartTime = null;
          this.stopTimer();
          console.log('🐛 DEBUG: Session stopped, timer stopped');
        }
        
        console.log('🐛 DEBUG: Updating UI...');
        this.updateUI();
        this.updateStats(); // 統計情報も更新
        console.log('🐛 DEBUG: UI updated');
      } else {
        console.log('🐛 DEBUG: Failed to toggle session:', response);
        this.showNotification('セッションの切り替えに失敗しました', 'error');
      }
    } catch (error) {
      console.error('🐛 DEBUG: Failed to toggle session:', error);
      this.showNotification('セッションの切り替えに失敗しました', 'error');
    }
  }

  private async takeScreenshot(): Promise<void> {
    try {
      // ScreenshotCaptureを使用してスクリーンショットを撮影
      const screenshot = await this.screenshotCapture.captureManual('手動スクリーンショット');
      this.showNotification('スクリーンショットを撮影しました', 'success');
      this.updateStats();
      
      // オプション：スクリーンショットをダウンロード
      await this.screenshotCapture.downloadScreenshot(screenshot);
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

  private async exportData(): Promise<void> {
    try {
      if (!this.sessionId) {
        this.showNotification('アクティブなセッションがありません', 'error');
        return;
      }

      // エクスポート形式を選択
      const format = await this.selectExportFormat();
      if (!format) return;

      // データをエクスポート
      switch (format) {
        case 'json':
          await this.dataExporter.exportAsJSON(this.sessionId);
          this.showNotification('JSON形式でエクスポートしました', 'success');
          break;
        case 'csv':
          await this.dataExporter.exportAsCSV(this.sessionId);
          this.showNotification('CSV形式でエクスポートしました', 'success');
          break;
        case 'markdown':
          await this.dataExporter.exportAsMarkdown(this.sessionId);
          this.showNotification('Markdown形式でエクスポートしました', 'success');
          break;
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      this.showNotification('データのエクスポートに失敗しました', 'error');
    }
  }

  private async sendToWebApp(): Promise<void> {
    try {
      if (!this.sessionId) {
        this.showNotification('アクティブなセッションがありません', 'error');
        return;
      }

      const success = await this.dataExporter.sendCurrentSessionToWebApp();
      if (success) {
        this.showNotification('Webアプリにデータを送信しました', 'success');
      } else {
        this.showNotification('Webアプリへの送信に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Failed to send to Web app:', error);
      this.showNotification('Webアプリへの送信に失敗しました', 'error');
    }
  }

  private async selectExportFormat(): Promise<string | null> {
    return new Promise((resolve) => {
      const format = prompt('エクスポート形式を選択してください:\n1. JSON\n2. CSV\n3. Markdown\n\n番号を入力してください (1-3):');
      
      switch (format) {
        case '1':
          resolve('json');
          break;
        case '2':
          resolve('csv');
          break;
        case '3':
          resolve('markdown');
          break;
        default:
          resolve(null);
      }
    });
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
    console.log('🐛 DEBUG: updateUI called, isSessionActive:', this.isSessionActive);
    
    const statusIndicator = document.getElementById('statusIndicator');
    const statusDot = statusIndicator?.querySelector('.status-dot');
    const statusText = statusIndicator?.querySelector('.status-text');
    const toggleButton = document.getElementById('toggleSession');
    const sessionInfo = document.getElementById('sessionInfo');
    const sessionId = document.getElementById('sessionId');
    const quickActions = document.querySelectorAll('.quick-actions .btn');

    console.log('🐛 DEBUG: UI elements found:', {
      statusIndicator: !!statusIndicator,
      statusDot: !!statusDot,
      statusText: !!statusText,
      toggleButton: !!toggleButton,
      sessionInfo: !!sessionInfo,
      sessionId: !!sessionId,
      quickActions: quickActions.length
    });

    if (this.isSessionActive) {
      console.log('🐛 DEBUG: Setting UI to ACTIVE state');
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
      console.log('🐛 DEBUG: UI set to ACTIVE state');
    } else {
      console.log('🐛 DEBUG: Setting UI to INACTIVE state');
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
      console.log('🐛 DEBUG: UI set to INACTIVE state');
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

  private stopStatsUpdate(): void {
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
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
        document.getElementById('networkErrorCount')!.textContent = response.stats.networkErrorCount || '0';
        document.getElementById('errorCount')!.textContent = response.stats.errorCount || '0';
        document.getElementById('screenshotCount')!.textContent = response.stats.screenshotCount || '0';
        document.getElementById('flagCount')!.textContent = response.stats.flagCount || '0';
      } else {
        console.log('Popup: Failed to get stats:', response);
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
      // エラーが発生した場合は統計をリセット
      this.resetStats();
    }
  }

  private resetStats(): void {
    const statsElements = [
      'eventCount', 'clickCount', 'keydownCount', 'consoleCount',
      'networkCount', 'networkErrorCount', 'errorCount', 'screenshotCount', 'flagCount'
    ];
    
    statsElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = '0';
      }
    });
  }

  private startStatsUpdate(): void {
    // 既存のタイマーをクリア
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
    }
    
    // 5秒ごとに統計情報を更新
    this.statsUpdateInterval = setInterval(() => {
      this.updateStats();
    }, 5000);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    // 簡単な通知表示（実際の実装ではより洗練されたUIを使用）
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  private async mcpAnalyze(): Promise<void> {
    try {
      // 拡張機能のコンテキストが有効かチェック
      if (!chrome.runtime?.id) {
        this.showNotification('拡張機能が無効です。ページを再読み込みしてください。', 'error');
        return;
      }

      this.showNotification('AI分析を実行中...', 'info');
      
      // 現在のログを取得してコンテキストとして送信
      const logsResponse = await chrome.runtime.sendMessage({ type: 'GET_LOGS' });
      const context = {
        logs: logsResponse?.logs || [],
        sessionActive: this.isSessionActive,
        timestamp: Date.now()
      };

      const response = await chrome.runtime.sendMessage({ 
        type: 'MCP_ANALYZE', 
        context: context 
      });
      
      if (response && response.success) {
        this.showNotification('AI分析が完了しました', 'success');
        console.log('AI Analysis Result:', response.data);
        
        // 分析結果をログに保存
        await this.saveAnalysisResult(response.data);
      } else {
        this.showNotification('AI分析に失敗しました', 'error');
        console.error('MCP Analysis failed:', response?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to run MCP analysis:', error);
      this.showNotification('AI分析に失敗しました: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }
  }

  private async mcpSnapshot(): Promise<void> {
    try {
      // 拡張機能のコンテキストが有効かチェック
      if (!chrome.runtime?.id) {
        this.showNotification('拡張機能が無効です。ページを再読み込みしてください。', 'error');
        return;
      }

      this.showNotification('MCPスナップショットを取得中...', 'info');
      
      const response = await chrome.runtime.sendMessage({ type: 'MCP_SNAPSHOT' });
      
      if (response && response.success) {
        this.showNotification('MCPスナップショットを取得しました', 'success');
        console.log('MCP Snapshot:', response.data);
        
        // スナップショットをログに保存
        await this.saveSnapshotResult(response.data);
      } else {
        this.showNotification('MCPスナップショットの取得に失敗しました', 'error');
        console.error('MCP Snapshot failed:', response?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to get MCP snapshot:', error);
      this.showNotification('MCPスナップショットの取得に失敗しました: ' + (error instanceof Error ? error.message : String(error)), 'error');
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
        url: window.location.href
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
        url: window.location.href
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
