import { SessionManager } from './services/SessionManager';
import { ApiClient } from './services/ApiClient';

class PopupController {
  private sessionManager: SessionManager;
  private apiClient: ApiClient;
  private isSessionActive: boolean = false;
  private sessionId: string | null = null;
  private sessionStartTime: Date | null = null;
  private timerInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionManager = new SessionManager();
    this.apiClient = new ApiClient();
  }

  public initialize(): void {
    this.setupEventListeners();
    this.loadSessionStatus();
    this.startStatsUpdate();
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

    // 設定ボタン
    const settingsButton = document.getElementById('openSettings');
    settingsButton?.addEventListener('click', () => this.openSettings());
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
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (response && response.success) {
        document.getElementById('eventCount')!.textContent = response.stats.eventCount || '0';
        document.getElementById('errorCount')!.textContent = response.stats.errorCount || '0';
        document.getElementById('screenshotCount')!.textContent = response.stats.screenshotCount || '0';
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
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
}

// ポップアップを初期化
const popupController = new PopupController();
popupController.initialize();
