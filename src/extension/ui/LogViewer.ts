import { EventData, EventType } from '@/shared/types/EventTypes';
import { LogData, LogLevel } from '@/shared/types/LogTypes';

export class LogViewer {
  private container: HTMLElement | null = null;
  private isVisible = false;
  private events: EventData[] = [];
  private logs: LogData[] = [];
  private filters = {
    type: 'all',
    level: 'all',
    search: ''
  };

  constructor() {
    this.setupGlobalStyles();
  }

  public create(): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'ai-test-partner-log-viewer';
    this.container.className = 'ai-test-partner-log-viewer';
    
    this.setupHTML();
    this.setupEventListeners();
    
    document.body.appendChild(this.container);
    this.isVisible = true;
  }

  public destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.isVisible = false;
    }
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public show(): void {
    if (this.container) {
      this.container.style.display = 'block';
      this.isVisible = true;
    }
  }

  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
      this.isVisible = false;
    }
  }

  public addEvent(event: EventData): void {
    this.events.push(event);
    this.updateDisplay();
  }

  public addLog(log: LogData): void {
    this.logs.push(log);
    this.updateDisplay();
  }

  public clear(): void {
    this.events = [];
    this.logs = [];
    this.updateDisplay();
  }

  public export(format: 'json' | 'markdown' = 'markdown'): void {
    const data = {
      events: this.events,
      logs: this.logs,
      exportedAt: new Date().toISOString()
    };

    if (format === 'json') {
      this.downloadJSON(data);
    } else {
      this.downloadMarkdown(data);
    }
  }

  private setupHTML(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="log-viewer-header">
        <h3>AIテストパートナー - ログ確認</h3>
        <div class="header-controls">
          <button class="btn btn-secondary" id="clear-logs">クリア</button>
          <button class="btn btn-secondary" id="export-json">JSON出力</button>
          <button class="btn btn-secondary" id="export-markdown">Markdown出力</button>
          <button class="btn btn-primary" id="close-viewer">閉じる</button>
        </div>
      </div>
      
      <div class="log-viewer-filters">
        <div class="filter-group">
          <label>タイプ:</label>
          <select id="type-filter">
            <option value="all">すべて</option>
            <option value="click">クリック</option>
            <option value="keydown">キー入力</option>
            <option value="console">コンソール</option>
            <option value="network">ネットワーク</option>
            <option value="error">エラー</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>レベル:</label>
          <select id="level-filter">
            <option value="all">すべて</option>
            <option value="error">エラー</option>
            <option value="warn">警告</option>
            <option value="info">情報</option>
            <option value="log">ログ</option>
            <option value="debug">デバッグ</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>検索:</label>
          <input type="text" id="search-filter" placeholder="検索...">
        </div>
      </div>
      
      <div class="log-viewer-content">
        <div class="log-stats">
          <span class="stat">イベント: <span id="event-count">0</span></span>
          <span class="stat">ログ: <span id="log-count">0</span></span>
          <span class="stat">エラー: <span id="error-count">0</span></span>
        </div>
        
        <div class="log-list" id="log-list">
          <div class="empty-state">
            ログがありません。テストを開始してください。
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    const clearBtn = this.container.querySelector('#clear-logs');
    const exportJsonBtn = this.container.querySelector('#export-json');
    const exportMarkdownBtn = this.container.querySelector('#export-markdown');
    const closeBtn = this.container.querySelector('#close-viewer');
    const typeFilter = this.container.querySelector('#type-filter');
    const levelFilter = this.container.querySelector('#level-filter');
    const searchFilter = this.container.querySelector('#search-filter');

    clearBtn?.addEventListener('click', () => this.clear());
    exportJsonBtn?.addEventListener('click', () => this.export('json'));
    exportMarkdownBtn?.addEventListener('click', () => this.export('markdown'));
    closeBtn?.addEventListener('click', () => this.hide());

    typeFilter?.addEventListener('change', (e) => {
      this.filters.type = (e.target as HTMLSelectElement).value;
      this.updateDisplay();
    });

    levelFilter?.addEventListener('change', (e) => {
      this.filters.level = (e.target as HTMLSelectElement).value;
      this.updateDisplay();
    });

    searchFilter?.addEventListener('input', (e) => {
      this.filters.search = (e.target as HTMLInputElement).value.toLowerCase();
      this.updateDisplay();
    });
  }

  private updateDisplay(): void {
    if (!this.container) return;

    const logList = this.container.querySelector('#log-list');
    const eventCount = this.container.querySelector('#event-count');
    const logCount = this.container.querySelector('#log-count');
    const errorCount = this.container.querySelector('#error-count');

    if (!logList || !eventCount || !logCount || !errorCount) return;

    // 統計情報を更新
    eventCount.textContent = this.events.length.toString();
    logCount.textContent = this.logs.length.toString();
    errorCount.textContent = this.logs.filter(log => log.level === LogLevel.ERROR).length.toString();

    // フィルタリング
    const filteredEvents = this.filterEvents();
    const filteredLogs = this.filterLogs();

    // ログリストを更新
    if (filteredEvents.length === 0 && filteredLogs.length === 0) {
      logList.innerHTML = '<div class="empty-state">条件に一致するログがありません。</div>';
      return;
    }

    const allItems = [
      ...filteredEvents.map(event => this.createEventItem(event)),
      ...filteredLogs.map(log => this.createLogItem(log))
    ].sort((a, b) => new Date(a.dataset.timestamp!).getTime() - new Date(b.dataset.timestamp!).getTime());

    logList.innerHTML = '';
    allItems.forEach(item => logList.appendChild(item));
  }

  private filterEvents(): EventData[] {
    return this.events.filter(event => {
      if (this.filters.type !== 'all' && event.type !== this.filters.type) {
        return false;
      }
      
      if (this.filters.search) {
        const searchText = JSON.stringify(event.data).toLowerCase();
        if (!searchText.includes(this.filters.search)) {
          return false;
        }
      }
      
      return true;
    });
  }

  private filterLogs(): LogData[] {
    return this.logs.filter(log => {
      if (this.filters.level !== 'all' && log.level !== this.filters.level) {
        return false;
      }
      
      if (this.filters.search) {
        const searchText = log.message.toLowerCase();
        if (!searchText.includes(this.filters.search)) {
          return false;
        }
      }
      
      return true;
    });
  }

  private createEventItem(event: EventData): HTMLElement {
    const item = document.createElement('div');
    item.className = `log-item event-item event-${event.type}`;
    item.dataset.timestamp = event.timestamp;
    
    const time = new Date(event.timestamp).toLocaleTimeString();
    const icon = this.getEventIcon(event.type);
    
    item.innerHTML = `
      <div class="log-item-header">
        <span class="log-icon">${icon}</span>
        <span class="log-time">${time}</span>
        <span class="log-type">${event.type}</span>
      </div>
      <div class="log-item-content">
        <pre>${JSON.stringify(event.data, null, 2)}</pre>
      </div>
    `;
    
    return item;
  }

  private createLogItem(log: LogData): HTMLElement {
    const item = document.createElement('div');
    item.className = `log-item log-item-${log.level}`;
    item.dataset.timestamp = log.timestamp;
    
    const time = new Date(log.timestamp).toLocaleTimeString();
    const icon = this.getLogIcon(log.level);
    
    item.innerHTML = `
      <div class="log-item-header">
        <span class="log-icon">${icon}</span>
        <span class="log-time">${time}</span>
        <span class="log-level">${log.level}</span>
      </div>
      <div class="log-item-content">
        <div class="log-message">${log.message}</div>
        ${log.stack ? `<div class="log-stack"><pre>${log.stack}</pre></div>` : ''}
      </div>
    `;
    
    return item;
  }

  private getEventIcon(type: string): string {
    const icons: { [key: string]: string } = {
      click: '🖱️',
      keydown: '⌨️',
      console_log: '📝',
      network_error: '🌐',
      page_load: '📄',
      page_unload: '📄',
      mouse_move: '🖱️',
      focus: '👁️'
    };
    return icons[type] || '📋';
  }

  private getLogIcon(level: string): string {
    const icons: { [key: string]: string } = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      log: '📝',
      debug: '🐛'
    };
    return icons[level] || '📝';
  }

  private downloadJSON(data: any): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private downloadMarkdown(data: any): void {
    let markdown = `# テストログレポート\n\n`;
    markdown += `**エクスポート日時:** ${new Date().toLocaleString()}\n\n`;
    markdown += `## 統計情報\n\n`;
    markdown += `- イベント数: ${data.events.length}\n`;
    markdown += `- ログ数: ${data.logs.length}\n`;
    markdown += `- エラー数: ${data.logs.filter((log: LogData) => log.level === LogLevel.ERROR).length}\n\n`;
    
    if (data.events.length > 0) {
      markdown += `## イベント\n\n`;
      data.events.forEach((event: EventData) => {
        markdown += `### ${event.type} - ${new Date(event.timestamp).toLocaleString()}\n\n`;
        markdown += `\`\`\`json\n${JSON.stringify(event.data, null, 2)}\n\`\`\`\n\n`;
      });
    }
    
    if (data.logs.length > 0) {
      markdown += `## ログ\n\n`;
      data.logs.forEach((log: LogData) => {
        markdown += `### ${log.level.toUpperCase()} - ${new Date(log.timestamp).toLocaleString()}\n\n`;
        markdown += `${log.message}\n\n`;
        if (log.stack) {
          markdown += `\`\`\`\n${log.stack}\n\`\`\`\n\n`;
        }
      });
    }
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-logs-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private setupGlobalStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .ai-test-partner-log-viewer {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90vw;
        height: 80vh;
        max-width: 1200px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 1000000;
        display: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .log-viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #e0e0e0;
        background: #f8f9fa;
        border-radius: 12px 12px 0 0;
      }

      .log-viewer-header h3 {
        margin: 0;
        color: #333;
        font-size: 18px;
      }

      .header-controls {
        display: flex;
        gap: 8px;
      }

      .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
      }

      .btn-primary {
        background: #007bff;
        color: white;
      }

      .btn-primary:hover {
        background: #0056b3;
      }

      .btn-secondary {
        background: #6c757d;
        color: white;
      }

      .btn-secondary:hover {
        background: #545b62;
      }

      .log-viewer-filters {
        display: flex;
        gap: 16px;
        padding: 16px 20px;
        border-bottom: 1px solid #e0e0e0;
        background: #f8f9fa;
      }

      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .filter-group label {
        font-size: 12px;
        color: #666;
        font-weight: 500;
      }

      .filter-group select,
      .filter-group input {
        padding: 6px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }

      .log-viewer-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .log-stats {
        display: flex;
        gap: 16px;
        padding: 12px 20px;
        background: #f8f9fa;
        border-bottom: 1px solid #e0e0e0;
        font-size: 14px;
      }

      .stat {
        color: #666;
      }

      .log-list {
        flex: 1;
        overflow-y: auto;
        padding: 16px 20px;
      }

      .log-item {
        margin-bottom: 12px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        overflow: hidden;
      }

      .log-item-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f8f9fa;
        font-size: 12px;
        color: #666;
      }

      .log-icon {
        font-size: 16px;
      }

      .log-time {
        font-weight: 500;
      }

      .log-type,
      .log-level {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
      }

      .log-level.error {
        background: #f8d7da;
        color: #721c24;
      }

      .log-level.warn {
        background: #fff3cd;
        color: #856404;
      }

      .log-level.info {
        background: #d1ecf1;
        color: #0c5460;
      }

      .log-item-content {
        padding: 12px;
      }

      .log-message {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
        line-height: 1.4;
        color: #333;
      }

      .log-stack {
        margin-top: 8px;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 4px;
      }

      .log-stack pre {
        margin: 0;
        font-size: 11px;
        color: #666;
      }

      .empty-state {
        text-align: center;
        color: #666;
        padding: 40px;
        font-style: italic;
      }

      .event-item.click {
        border-left: 4px solid #007bff;
      }

      .event-item.keydown {
        border-left: 4px solid #28a745;
      }

      .event-item.console_log {
        border-left: 4px solid #ffc107;
      }

      .event-item.network_error {
        border-left: 4px solid #dc3545;
      }
    `;

    document.head.appendChild(style);
  }
}
