export class FloatingButton {
  private button: HTMLElement | null = null;
  private isVisible = false;
  private isMinimized = false;
  private position = { x: 20, y: 20 };
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };

  constructor() {
    this.loadPosition();
  }

  public create(): void {
    if (this.button) return;

    this.button = document.createElement('div');
    this.button.id = 'ai-test-partner-floating-button';
    this.button.className = 'ai-test-partner-floating-button';
    
    this.setupButtonHTML();
    this.setupStyles();
    this.setupEventListeners();
    
    document.body.appendChild(this.button);
    this.isVisible = true;
  }

  public destroy(): void {
    if (this.button) {
      this.button.remove();
      this.button = null;
      this.isVisible = false;
    }
  }

  public updateStatus(status: 'active' | 'inactive' | 'paused'): void {
    if (!this.button) return;

    const statusIndicator = this.button.querySelector('.status-indicator');
    const mainButton = this.button.querySelector('.main-button');
    
    if (statusIndicator && mainButton) {
      statusIndicator.className = `status-indicator ${status}`;
      
      switch (status) {
        case 'active':
          mainButton.innerHTML = '⏹';
          mainButton.title = 'テスト停止';
          break;
        case 'paused':
          mainButton.innerHTML = '▶';
          mainButton.title = 'テスト再開';
          break;
        case 'inactive':
          mainButton.innerHTML = '▶';
          mainButton.title = 'テスト開始';
          break;
      }
    }
  }

  public toggleMinimize(): void {
    if (!this.button) return;

    this.isMinimized = !this.isMinimized;
    const menu = this.button.querySelector('.menu');
    
    if (menu) {
      menu.style.display = this.isMinimized ? 'none' : 'flex';
    }
  }

  public showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (!this.button) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    this.button.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  private setupButtonHTML(): void {
    if (!this.button) return;

    this.button.innerHTML = `
      <div class="status-indicator inactive"></div>
      <div class="main-button" title="テスト開始">▶</div>
      <div class="menu">
        <button class="menu-item screenshot-btn" title="スクリーンショット">
          <span class="icon">📷</span>
        </button>
        <button class="menu-item flag-btn" title="フラグ">
          <span class="icon">🚩</span>
        </button>
        <button class="menu-item minimize-btn" title="最小化">
          <span class="icon">−</span>
        </button>
        <button class="menu-item settings-btn" title="設定">
          <span class="icon">⚙️</span>
        </button>
      </div>
    `;
  }

  private setupStyles(): void {
    if (!this.button) return;

    const style = document.createElement('style');
    style.textContent = `
      .ai-test-partner-floating-button {
        position: fixed;
        top: ${this.position.y}px;
        left: ${this.position.x}px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        user-select: none;
        cursor: move;
      }

      .ai-test-partner-floating-button .status-indicator {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }

      .ai-test-partner-floating-button .status-indicator.active {
        background-color: #4caf50;
      }

      .ai-test-partner-floating-button .status-indicator.inactive {
        background-color: #f44336;
      }

      .ai-test-partner-floating-button .status-indicator.paused {
        background-color: #ff9800;
      }

      .ai-test-partner-floating-button .main-button {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
      }

      .ai-test-partner-floating-button .main-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      }

      .ai-test-partner-floating-button .main-button:active {
        transform: scale(0.95);
      }

      .ai-test-partner-floating-button .menu {
        position: absolute;
        top: 0;
        left: 70px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: white;
        border-radius: 12px;
        padding: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 1px solid #e0e0e0;
      }

      .ai-test-partner-floating-button .menu-item {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        border: none;
        background: #f5f5f5;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .ai-test-partner-floating-button .menu-item:hover {
        background: #e0e0e0;
        transform: scale(1.05);
      }

      .ai-test-partner-floating-button .menu-item .icon {
        font-size: 18px;
      }

      .ai-test-partner-floating-button .notification {
        position: absolute;
        top: -40px;
        left: 0;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        animation: slideDown 0.3s ease;
      }

      .ai-test-partner-floating-button .notification.success {
        background: #4caf50;
      }

      .ai-test-partner-floating-button .notification.error {
        background: #f44336;
      }

      .ai-test-partner-floating-button .notification.info {
        background: #2196f3;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .ai-test-partner-floating-button.dragging {
        cursor: grabbing;
      }

      .ai-test-partner-floating-button.dragging .main-button {
        cursor: grabbing;
      }
    `;

    document.head.appendChild(style);
  }

  private setupEventListeners(): void {
    if (!this.button) return;

    const mainButton = this.button.querySelector('.main-button');
    const screenshotBtn = this.button.querySelector('.screenshot-btn');
    const flagBtn = this.button.querySelector('.flag-btn');
    const minimizeBtn = this.button.querySelector('.minimize-btn');
    const settingsBtn = this.button.querySelector('.settings-btn');

    // メインボタンクリック
    mainButton?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleMainButtonClick();
    });

    // スクリーンショットボタン
    screenshotBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleScreenshotClick();
    });

    // フラグボタン
    flagBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleFlagClick();
    });

    // 最小化ボタン
    minimizeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMinimize();
    });

    // 設定ボタン
    settingsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleSettingsClick();
    });

    // ドラッグ機能
    this.setupDragListeners();
  }

  private setupDragListeners(): void {
    if (!this.button) return;

    this.button.addEventListener('mousedown', (e) => {
      if (e.target === this.button?.querySelector('.main-button')) {
        this.isDragging = true;
        this.button?.classList.add('dragging');
        
        const rect = this.button.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.button) {
        this.position.x = e.clientX - this.dragOffset.x;
        this.position.y = e.clientY - this.dragOffset.y;
        
        // 画面外に出ないように制限
        this.position.x = Math.max(0, Math.min(this.position.x, window.innerWidth - 200));
        this.position.y = Math.max(0, Math.min(this.position.y, window.innerHeight - 100));
        
        this.button.style.left = `${this.position.x}px`;
        this.button.style.top = `${this.position.y}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.button?.classList.remove('dragging');
        this.savePosition();
      }
    });
  }

  private handleMainButtonClick(): void {
    chrome.runtime.sendMessage({
      type: 'TOGGLE_SESSION'
    });
  }

  private handleScreenshotClick(): void {
    chrome.runtime.sendMessage({
      type: 'TAKE_SCREENSHOT'
    });
  }

  private handleFlagClick(): void {
    chrome.runtime.sendMessage({
      type: 'FLAG_CURRENT_EVENT'
    });
  }

  private handleSettingsClick(): void {
    chrome.runtime.sendMessage({
      type: 'OPEN_SETTINGS'
    });
  }

  private loadPosition(): void {
    try {
      const saved = localStorage.getItem('ai-test-partner-button-position');
      if (saved) {
        this.position = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load button position:', error);
    }
  }

  private savePosition(): void {
    try {
      localStorage.setItem('ai-test-partner-button-position', JSON.stringify(this.position));
    } catch (error) {
      console.error('Failed to save button position:', error);
    }
  }
}
