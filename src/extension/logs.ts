class LogViewer {
  private logs: any[] = [];
  private filteredLogs: any[] = [];
  private currentFilter: string = 'all';
  private currentSearch: string = '';

  constructor() {
    this.initializeEventListeners();
    this.loadLogs();
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

    // クリアボタン
    const clearButton = document.getElementById('clearLogs');
    clearButton?.addEventListener('click', () => this.clearLogs());

    // エクスポートボタン
    const exportButton = document.getElementById('exportLogs');
    exportButton?.addEventListener('click', () => this.exportLogs());

    // 自動更新
    setInterval(() => this.loadLogs(), 5000);
  }

  private async loadLogs(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('test_logs');
      this.logs = result.test_logs || [];
      this.applyFilters();
    } catch (error) {
      console.error('Failed to load logs:', error);
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
        const searchText = JSON.stringify(log).toLowerCase();
        if (!searchText.includes(this.currentSearch)) {
          return false;
        }
      }

      return true;
    });

    this.renderLogs();
  }

  private renderLogs(): void {
    const container = document.getElementById('logContainer');
    if (!container) return;

    if (this.filteredLogs.length === 0) {
      container.innerHTML = '<div class="no-logs">ログがありません</div>';
      return;
    }

    const html = this.filteredLogs.map(log => this.createLogElement(log)).join('');
    container.innerHTML = html;
  }

  private createLogElement(log: any): string {
    const timestamp = new Date(log.timestamp).toLocaleString();
    const level = log.details?.level || 'info';
    const levelClass = this.getLevelClass(level);

    return `
      <div class="log-entry ${levelClass}" data-type="${log.type}">
        <div class="log-header">
          <span class="log-timestamp">${timestamp}</span>
          <span class="log-type">${log.type}</span>
          <span class="log-level">${level}</span>
        </div>
        <div class="log-message">${log.message}</div>
        ${log.details ? `<div class="log-details">${JSON.stringify(log.details, null, 2)}</div>` : ''}
        <div class="log-url">${log.url}</div>
      </div>
    `;
  }

  private getLevelClass(level: string): string {
    switch (level.toLowerCase()) {
      case 'error': return 'log-error';
      case 'warn': return 'log-warn';
      case 'info': return 'log-info';
      case 'debug': return 'log-debug';
      default: return 'log-info';
    }
  }

  private async clearLogs(): Promise<void> {
    try {
      await chrome.storage.local.remove('test_logs');
      this.logs = [];
      this.filteredLogs = [];
      this.renderLogs();
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  private exportLogs(): void {
    const data = JSON.stringify(this.filteredLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}

// ログビューアを初期化
document.addEventListener('DOMContentLoaded', () => {
  new LogViewer();
});