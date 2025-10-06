import { SessionManager } from '../services/SessionManager';
import { ApiClient } from '../services/ApiClient';
import { ScreenshotCapture } from '../services/ScreenshotCapture';
import { DataExporter } from '../services/DataExporter';

export class PopupController {
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
    // 既存のタイマーを停止してからセッション状態を読み込み
    this.stopTimer();
    
    // 初期化時は状態をリセットしない（セッション状態を正しく読み込む）
    // this.isSessionActive = false;
    // this.sessionId = null;
    // this.sessionStartTime = null;
    // this.stopTimer(); // タイマーを確実に停止
    // this.updateUI();
    // this.updateSessionDuration();
    
    // セッション状態を非同期で読み込み
    this.loadSessionStatus().then(() => {
      console.log('Session status loaded successfully');
      // 時間表示を初期化
      this.updateSessionDuration();
      // セッションがアクティブな場合のみ統計更新を開始
      if (this.isSessionActive) {
        this.startStatsUpdate();
      }
    }).catch((error) => {
      console.error('Failed to load session status:', error);
      // エラー時は停止状態に設定
      this.isSessionActive = false;
      this.sessionId = null;
      this.sessionStartTime = null;
      this.stopTimer();
      this.updateUI();
      this.updateSessionDuration();
    });

    // test_logs 変更で統計を自動更新
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (Object.prototype.hasOwnProperty.call(changes, 'test_logs')) {
        this.updateStats();
      }
    });
  }

  private setupEventListeners(): void {
    console.log('🔧 Setting up event listeners...');
    
    // テスト開始/停止ボタン
    const toggleButton = document.getElementById('toggleSession');
    console.log('🔧 Toggle button found:', toggleButton);
    if (toggleButton) {
      toggleButton.addEventListener('click', () => this.toggleSession());
      console.log('🔧 Toggle button event listener added');
    } else {
      console.error('🔧 Toggle button not found!');
    }

    // スクリーンショットボタン
    const screenshotButton = document.getElementById('takeScreenshot');
    if (screenshotButton) {
      screenshotButton.addEventListener('click', () => this.takeScreenshot());
    }

    // ログ確認ボタン
    const logsButton = document.getElementById('viewLogs');
    if (logsButton) {
      logsButton.addEventListener('click', () => this.viewLogs());
    }

    // レポート表示ボタン
    const reportButton = document.getElementById('viewReport');
    if (reportButton) {
      reportButton.addEventListener('click', () => this.viewReport());
    }

    // データエクスポートボタン
    const exportButton = document.getElementById('exportData');
    if (exportButton) {
      exportButton.addEventListener('click', () => this.exportData());
    }

    // Webアプリ送信ボタン
    const sendToWebAppButton = document.getElementById('sendToWebApp');
    if (sendToWebAppButton) {
      sendToWebAppButton.addEventListener('click', () => this.sendToWebApp());
    }

    // セッションクリアボタン
    const clearSessionButton = document.getElementById('clearSession');
    if (clearSessionButton) {
      clearSessionButton.addEventListener('click', () => this.clearSession());
    }

    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcut(e);
    });
  }

  private async loadSessionStatus(): Promise<void> {
    try {
      // 既存のタイマーを停止
      this.stopTimer();
      
      // 拡張機能のコンテキストが有効かチェック
      if (!chrome.runtime?.id) {
        console.log('Extension context invalidated, cannot load session status');
        this.showNotification('拡張機能が無効です。ページを再読み込みしてください。', 'error');
        return;
      }

      // 拡張機能のコンテキストが無効化されていないかチェック
      try {
        await chrome.runtime.getManifest();
      } catch (error) {
        console.log('Extension context invalidated, manifest not accessible');
        this.showNotification('拡張機能が無効です。ページを再読み込みしてください。', 'error');
        return;
      }

      console.log('🔄 Loading session status...');
      const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATUS' });
      console.log('🔄 Session status response:', response);
      
      // デバッグ: ストレージから直接確認
      try {
        const storageResult = await chrome.storage.local.get('current_session');
        console.log('🔄 Direct storage check:', storageResult);
      } catch (error) {
        console.log('🔄 Direct storage check failed:', error);
      }
      
      if (response && response.success) {
        this.isSessionActive = response.isActive;
        this.sessionId = response.sessionData?.id || null;
        
        // セッション開始時間を安全に処理
        console.log('🕐 Processing session start time:', {
          isSessionActive: this.isSessionActive,
          startTime: response.sessionData?.startTime,
          sessionData: response.sessionData
        });
        
        if (this.isSessionActive && response.sessionData?.startTime) {
          try {
            this.sessionStartTime = new Date(response.sessionData.startTime);
            console.log('🕐 Parsed startTime:', {
              original: response.sessionData.startTime,
              parsed: this.sessionStartTime,
              isValid: !isNaN(this.sessionStartTime.getTime())
            });
            
            // 有効な日付かチェック
            if (isNaN(this.sessionStartTime.getTime())) {
              console.warn('🕐 Invalid startTime:', response.sessionData.startTime);
              this.sessionStartTime = null;
            } else {
              console.log('🕐 Session started at:', this.sessionStartTime);
              // タイマーを開始（即座に更新も実行）
              this.startTimer();
              this.updateSessionDuration(); // 即座に更新
            }
          } catch (error) {
            console.error('🕐 Failed to parse startTime:', error);
            this.sessionStartTime = null;
          }
        } else {
          console.log('🕐 No active session or no startTime, stopping timer');
          this.sessionStartTime = null;
          this.stopTimer();
        }
        
        this.updateUI();
        this.updateStats();
      } else {
        // セッションが存在しない場合のみ「停止中」に設定
        console.log('No active session or invalid response');
        this.isSessionActive = false;
        this.sessionId = null;
        this.sessionStartTime = null;
        this.stopTimer();
        this.updateUI();
      }
    } catch (error) {
      console.error('Failed to load session status:', error);
      // エラー時は既存の状態を保持（リセットしない）
      console.log('Keeping existing state due to error');
    }
  }

  private async toggleSession(): Promise<void> {
    try {
      console.log('🐛 DEBUG: Toggle session button clicked');
      console.log('🐛 DEBUG: Current session state:', {
        isSessionActive: this.isSessionActive,
        sessionId: this.sessionId,
        sessionStartTime: this.sessionStartTime
      });

      const response = await chrome.runtime.sendMessage({ type: 'TOGGLE_SESSION' });
      console.log('🐛 DEBUG: Toggle session response:', response);

      if (response && response.success) {
        this.isSessionActive = response.isActive;
        this.sessionId = response.sessionId;
        
        if (this.isSessionActive) {
          this.sessionStartTime = new Date();
          this.startTimer();
          this.startStatsUpdate(); // セッション開始時に統計更新を開始
          console.log('🐛 DEBUG: Session started, timer and stats started');
        } else {
          this.sessionId = null;
          this.sessionStartTime = null;
          this.stopTimer();
          this.stopStatsUpdate(); // セッション停止時に統計更新を停止
          console.log('🐛 DEBUG: Session stopped, timer and stats stopped');
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

  private async exportData(): Promise<void> {
    try {
      const format = await this.selectExportFormat();
      if (!format) return;

      const sessionId = this.sessionId;
      if (!sessionId) {
        this.showNotification('アクティブなセッションがありません', 'error');
        return;
      }

      switch (format) {
        case 'json':
          await this.dataExporter.exportAsJSON(sessionId);
          this.showNotification('JSON形式でエクスポートしました', 'success');
          break;
        case 'csv':
          await this.dataExporter.exportAsCSV(sessionId);
          this.showNotification('CSV形式でエクスポートしました', 'success');
          break;
        case 'markdown':
          await this.dataExporter.exportAsMarkdown(sessionId);
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
      const success = await this.dataExporter.sendCurrentSessionToWebApp();
      if (success) {
        this.showNotification('Webアプリに送信しました', 'success');
      } else {
        this.showNotification('Webアプリへの送信に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Failed to send to Web app:', error);
      this.showNotification('Webアプリへの送信に失敗しました', 'error');
    }
  }

  private async clearSession(): Promise<void> {
    try {
      // ストレージを完全にクリア
      await chrome.storage.local.clear();
      
      // ローカル状態をリセット
      this.isSessionActive = false;
      this.sessionId = null;
      this.sessionStartTime = null;
      this.stopTimer();
      this.updateUI();
      
      this.showNotification('セッションを完全にクリアしました', 'success');
      console.log('Session completely cleared');
    } catch (error) {
      console.error('Failed to clear session:', error);
      this.showNotification('セッションのクリアに失敗しました', 'error');
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

  private handleKeyboardShortcut(e: KeyboardEvent): void {
    // Ctrl+Shift+S でスクリーンショット
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      this.takeScreenshot();
    }
    // Ctrl+Shift+T でセッション切り替え
    else if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      this.toggleSession();
    }
  }

  private updateUI(): void {
    const statusElement = document.getElementById('sessionStatus');
    const toggleButton = document.getElementById('toggleSession') as HTMLButtonElement;
    const sessionInfo = document.getElementById('sessionInfo');
    const quickActions = document.querySelectorAll('.quick-action');

    if (!statusElement || !toggleButton) return;

    if (this.isSessionActive) {
      statusElement.textContent = '記録中';
      statusElement.className = 'status active';
      toggleButton.textContent = 'テスト停止';
      toggleButton.className = 'btn btn-danger';
      
      // セッション情報は常に表示
      if (sessionInfo) sessionInfo.style.display = 'block';
      
      quickActions.forEach(btn => btn.removeAttribute('disabled'));
      console.log('🐛 DEBUG: UI set to ACTIVE state');
    } else {
      statusElement.textContent = '停止中';
      statusElement.className = 'status inactive';
      toggleButton.textContent = 'テスト開始';
      toggleButton.className = 'btn btn-primary';
      
      // セッション情報は常に表示（停止中でも経過時間0:00:00を表示）
      if (sessionInfo) sessionInfo.style.display = 'block';
      
      quickActions.forEach(btn => btn.setAttribute('disabled', 'true'));
      console.log('🐛 DEBUG: UI set to INACTIVE state');
    }
  }

  private startTimer(): void {
    console.log('🕐 Starting timer:', {
      sessionStartTime: this.sessionStartTime,
      isSessionActive: this.isSessionActive,
      sessionId: this.sessionId
    });
    
    // セッションがアクティブでない場合はタイマーを開始しない
    if (!this.isSessionActive || !this.sessionStartTime) {
      console.log('🕐 Timer not started - session not active or no start time');
      return;
    }
    
    // 既存のタイマーを停止
    this.stopTimer();
    
    this.timerInterval = setInterval(() => {
      this.updateSessionDuration();
    }, 1000);
    
    console.log('🕐 Timer started successfully');
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateSessionDuration(): void {
    console.log('🕐 updateSessionDuration called:', {
      sessionStartTime: this.sessionStartTime,
      isSessionActive: this.isSessionActive,
      sessionId: this.sessionId
    });
    
    const durationElement = document.getElementById('sessionDuration');
    if (!durationElement) {
      console.warn('🕐 Duration element not found');
      return;
    }
    
    if (this.sessionStartTime && this.isSessionActive) {
      const now = new Date();
      const duration = now.getTime() - this.sessionStartTime.getTime();
      const hours = Math.floor(duration / 3600000);
      const minutes = Math.floor((duration % 3600000) / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      
      console.log('🕐 Duration calculation:', {
        now: now.toISOString(),
        startTime: this.sessionStartTime.toISOString(),
        duration: duration,
        formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      });
      
      durationElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      console.log('🕐 Duration updated in UI');
    } else {
      // 停止中またはセッション開始時刻がない場合は00:00:00を表示
      durationElement.textContent = '00:00:00';
      console.log('🕐 Duration reset to 00:00:00 (session inactive or no start time)');
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
        this.updateStatsDisplay(response.stats);
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }

  private updateStatsDisplay(stats: any): void {
    const eventsCount = document.getElementById('eventsCount');
    const logsCount = document.getElementById('logsCount');
    const screenshotsCount = document.getElementById('screenshotsCount');
    const sessionIdElement = document.getElementById('sessionId');

    if (eventsCount) eventsCount.textContent = stats.eventsCount || '0';
    if (logsCount) logsCount.textContent = stats.logsCount || '0';
    if (screenshotsCount) screenshotsCount.textContent = stats.screenshotsCount || '0';
    if (sessionIdElement) sessionIdElement.textContent = this.sessionId || 'なし';
  }

  private startStatsUpdate(): void {
    // 既存の統計更新を停止
    this.stopStatsUpdate();
    
    // 5秒ごとに統計を更新
    this.statsUpdateInterval = setInterval(() => {
      this.updateStats();
    }, 5000);
  }

  private stopStatsUpdate(): void {
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // 簡単な通知表示（実際の実装ではより洗練された通知システムを使用）
    console.log(`Notification [${type.toUpperCase()}]: ${message}`);
    
    // 既存の通知を削除
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // 新しい通知を作成
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 10px 15px;
      border-radius: 4px;
      color: white;
      font-size: 14px;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
      ${type === 'success' ? 'background-color: #4caf50;' : ''}
      ${type === 'error' ? 'background-color: #f44336;' : ''}
      ${type === 'info' ? 'background-color: #2196f3;' : ''}
    `;

    document.body.appendChild(notification);

    // 3秒後に自動削除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}
