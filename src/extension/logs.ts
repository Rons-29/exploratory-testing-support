interface LogEntry {
  id: string;
  type: string;
  message: string;
  timestamp: number;
  details?: any;
  element?: string;
  url?: string;
  level?: string;
}

class LogViewer {
  private logs: LogEntry[] = [];
  private filteredLogs: LogEntry[] = [];
  private currentFilter = 'all';
  private currentSearch = '';

  constructor() {
    this.initializeEventListeners();
    this.loadLogs();

    // test_logs 変更で自動更新
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (Object.prototype.hasOwnProperty.call(changes, 'test_logs')) {
        this.loadLogs();
      }
    });
  }

  private initializeEventListeners(): void {
    // フィルター変更
    const typeFilter = document.getElementById('typeFilter') as HTMLSelectElement;
    typeFilter.addEventListener('change', e => {
      this.currentFilter = (e.target as HTMLSelectElement).value;
      this.applyFilters();
    });

    // 検索入力
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    searchInput.addEventListener('input', e => {
      this.currentSearch = (e.target as HTMLInputElement).value.toLowerCase();
      this.applyFilters();
    });

    // 更新ボタン
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn?.addEventListener('click', () => {
      this.loadLogs();
    });

    // クリアボタン
    const clearBtn = document.getElementById('clearBtn');
    clearBtn?.addEventListener('click', () => {
      this.clearLogs();
    });
  }

  private async loadLogs(): Promise<void> {
    try {
      // Background Scriptからログを取得
      const response = await chrome.runtime.sendMessage({ type: 'GET_LOGS' });

      if (response && response.success) {
        this.logs = response.logs || [];
        this.applyFilters();
        this.updateStats();
      } else {
        this.showError('ログの取得に失敗しました');
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      this.showError('ログの取得中にエラーが発生しました');
    }
  }

  private applyFilters(): void {
    this.filteredLogs = this.logs.filter(log => {
      // タイプフィルター
      if (this.currentFilter !== 'all' && log.type !== this.currentFilter) {
        return false;
      }

      // 検索フィルター
      if (this.currentSearch) {
        const searchText = `${log.message} ${log.details || ''} ${log.element || ''}`.toLowerCase();
        if (!searchText.includes(this.currentSearch)) {
          return false;
        }
      }

      return true;
    });

    this.renderLogs();
  }

  private renderLogs(): void {
    const logsContent = document.getElementById('logsContent');
    const logCount = document.getElementById('logCount');

    if (!logsContent || !logCount) return;

    logCount.textContent = `${this.filteredLogs.length}件`;

    if (this.filteredLogs.length === 0) {
      logsContent.innerHTML = `
        <div class="empty-state">
          <h3>ログが見つかりません</h3>
          <p>フィルターを調整するか、セッションを開始してください</p>
        </div>
      `;
      return;
    }

    const logsHTML = this.filteredLogs.map(log => this.createLogEntryHTML(log)).join('');
    logsContent.innerHTML = logsHTML;
  }

  private createLogEntryHTML(log: LogEntry): string {
    const timestamp = new Date(log.timestamp).toLocaleString('ja-JP');
    const typeClass = this.getTypeClass(log.type);
    const details = log.details ? JSON.stringify(log.details, null, 2) : '';

    // ネットワークログの特別な表示
    let networkDetails = '';
    if (log.type === 'network' && log.details) {
      const { method, status, statusText, duration, mimeType, encodedDataLength } = log.details;
      networkDetails = `
        <div class="log-details">
          <strong>${method}</strong> ${status} ${statusText}
          ${duration ? ` (${duration}ms)` : ''}
          ${mimeType ? ` | ${mimeType}` : ''}
          ${encodedDataLength ? ` | ${encodedDataLength} bytes` : ''}
        </div>
      `;
    }

    return `
      <div class="log-entry">
        <div class="log-timestamp">${timestamp}</div>
        <div class="log-type ${typeClass}">${this.getTypeLabel(log.type)}</div>
        <div class="log-message">
          ${this.escapeHtml(log.message)}
          ${log.element ? `<div class="log-details">要素: ${this.escapeHtml(log.element)}</div>` : ''}
          ${log.url ? `<div class="log-details">URL: ${this.escapeHtml(log.url)}</div>` : ''}
          ${log.level ? `<div class="log-details">レベル: ${this.escapeHtml(log.level)}</div>` : ''}
          ${networkDetails}
          ${details && log.type !== 'network' ? `<div class="log-details"><pre>${this.escapeHtml(details)}</pre></div>` : ''}
        </div>
      </div>
    `;
  }

  private getTypeClass(type: string): string {
    const typeMap: { [key: string]: string } = {
      click: 'click',
      keydown: 'keydown',
      error: 'error',
      console: 'console',
      network: 'network',
      network_error: 'network_error',
      screenshot: 'screenshot',
      flag: 'flag',
    };
    return typeMap[type] || 'console';
  }

  private getTypeLabel(type: string): string {
    const labelMap: { [key: string]: string } = {
      click: 'クリック',
      keydown: 'キー',
      error: 'エラー',
      console: 'コンソール',
      network: 'ネットワーク',
      network_error: 'ネットワークエラー',
      screenshot: 'スクリーンショット',
      flag: 'フラグ',
    };
    return labelMap[type] || type;
  }

  private updateStats(): void {
    const stats = {
      total: this.logs.length,
      click: this.logs.filter(log => log.type === 'click').length,
      key: this.logs.filter(log => log.type === 'keydown').length,
      console: this.logs.filter(log => log.type === 'console').length,
      network: this.logs.filter(log => log.type === 'network').length,
      networkError: this.logs.filter(log => log.type === 'network_error').length,
      error: this.logs.filter(
        log => log.type === 'error' || (log.type === 'console' && log.details?.level === 'error')
      ).length,
      screenshot: this.logs.filter(log => log.type === 'screenshot').length,
      flag: this.logs.filter(log => log.type === 'flag').length,
    };

    this.updateStatElement('totalEvents', stats.total);
    this.updateStatElement('clickEvents', stats.click);
    this.updateStatElement('keyEvents', stats.key);
    this.updateStatElement('consoleEvents', stats.console);
    this.updateStatElement('networkEvents', stats.network);
    this.updateStatElement('networkErrorEvents', stats.networkError);
    this.updateStatElement('errorEvents', stats.error);
    this.updateStatElement('screenshotEvents', stats.screenshot);
    this.updateStatElement('flagEvents', stats.flag);
  }

  private updateStatElement(id: string, value: number): void {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value.toString();
    }
  }

  private async clearLogs(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' });
      this.logs = [];
      this.applyFilters();
      this.updateStats();
    } catch (error) {
      console.error('Failed to clear logs:', error);
      this.showError('ログのクリア中にエラーが発生しました');
    }
  }

  private showError(message: string): void {
    const logsContent = document.getElementById('logsContent');
    if (logsContent) {
      logsContent.innerHTML = `
        <div class="error">
          <strong>エラー:</strong> ${this.escapeHtml(message)}
        </div>
      `;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ページ読み込み時にログビューアを初期化
document.addEventListener('DOMContentLoaded', () => {
  new LogViewer();
});
