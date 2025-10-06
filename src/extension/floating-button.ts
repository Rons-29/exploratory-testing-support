export class FloatingButton {
  private button: HTMLElement | null = null;
  private isVisible: boolean = false;
  private isMinimized: boolean = false;
  private isDragging: boolean = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private position: { x: number; y: number } = { x: 20, y: 20 };

  public create(): void {
    // 既存のボタンをすべて削除
    this.destroy();
    
    // 既存のボタンをチェック
    const existingButton = document.getElementById('ai-test-partner-floating-button');
    if (existingButton) {
      existingButton.remove();
    }

    this.button = document.createElement('div');
    this.button.id = 'ai-test-partner-floating-button';
    this.button.className = 'floating-button';
    this.button.innerHTML = `
      <div class="floating-button-main">
        <div class="floating-button-icon">🎯</div>
        <div class="floating-button-text">テスト</div>
      </div>
      <div class="floating-button-menu" style="display: none;">
        <button class="floating-menu-item" data-action="screenshot">📷 スクリーンショット</button>
        <button class="floating-menu-item" data-action="flag">🚩 フラグ</button>
        <button class="floating-menu-item" data-action="minimize">➖ 最小化</button>
        <button class="floating-menu-item" data-action="close">❌ 閉じる</button>
      </div>
    `;

    this.setupStyles();
    this.setupEventListeners();
    this.updatePosition();
    
    document.body.appendChild(this.button);
    this.isVisible = true;
  }

  public destroy(): void {
    // すべてのフローティングボタンを削除
    const allButtons = document.querySelectorAll('#ai-test-partner-floating-button');
    allButtons.forEach(button => button.remove());
    
    // グローバルイベントリスナーを削除（最後のボタンの場合のみ）
    if (allButtons.length <= 1) {
      document.removeEventListener('mousemove', this.handleDrag);
      document.removeEventListener('mouseup', this.endDrag);
      document.removeEventListener('click', this.hideMenu);
      FloatingButton.globalListenersSetup = false;
    }
    
    this.button = null;
    this.isVisible = false;
  }

  public updateStatus(status: 'active' | 'inactive'): void {
    if (!this.button) return;
    
    const mainButton = this.button.querySelector('.floating-button-main') as HTMLElement;
    if (mainButton) {
      mainButton.className = `floating-button-main ${status}`;
    }
  }

  public updateSessionStatus(isActive: boolean): void {
    this.updateStatus(isActive ? 'active' : 'inactive');
  }

  private setupStyles(): void {
    if (!this.button) return;

    const style = document.createElement('style');
    style.textContent = `
      .floating-button {
        position: fixed;
        z-index: 10000;
        cursor: move;
        user-select: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
      }

      .floating-button-main {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 25px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 80px;
        cursor: pointer;
      }

      .floating-button-main:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }

      .floating-button-main.active {
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        animation: pulse 2s infinite;
      }

      .floating-button-main.inactive {
        background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
      }

      .floating-button-icon {
        font-size: 16px;
      }

      .floating-button-text {
        font-weight: 500;
        white-space: nowrap;
      }

      .floating-button-menu {
        position: absolute;
        top: 100%;
        left: 0;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        margin-top: 8px;
        min-width: 180px;
        overflow: hidden;
        z-index: 10001;
      }

      .floating-menu-item {
        display: block;
        width: 100%;
        padding: 12px 16px;
        border: none;
        background: white;
        color: #333;
        text-align: left;
        cursor: pointer;
        transition: background-color 0.2s ease;
        font-size: 14px;
        font-family: inherit;
      }

      .floating-menu-item:hover {
        background: #f5f5f5;
      }

      .floating-menu-item:active {
        background: #e0e0e0;
      }

      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }

      .floating-button.minimized .floating-button-main {
        padding: 8px;
        min-width: 40px;
      }

      .floating-button.minimized .floating-button-text {
        display: none;
      }

      .floating-button.minimized .floating-button-icon {
        font-size: 20px;
      }
    `;

    document.head.appendChild(style);
  }

  private setupEventListeners(): void {
    if (!this.button) return;

    const mainButton = this.button.querySelector('.floating-button-main') as HTMLElement;
    const menuItems = this.button.querySelectorAll('.floating-menu-item');

    // メインボタンクリック
    mainButton.addEventListener('click', e => {
      e.stopPropagation();
      this.toggleMenu();
    });

    // メニューアイテムクリック
    menuItems.forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const action = (item as HTMLElement).dataset.action;
        this.handleMenuAction(action);
        this.hideMenu();
      });
    });

    // ドラッグ機能（このボタン専用）
    mainButton.addEventListener('mousedown', e => {
      this.startDrag(e);
    });

    // グローバルイベントは一度だけ登録（重複防止）
    this.setupGlobalEventListeners();
  }

  private static globalListenersSetup = false;

  private setupGlobalEventListeners(): void {
    if (FloatingButton.globalListenersSetup) return;
    
    document.addEventListener('mousemove', this.handleDrag);
    document.addEventListener('mouseup', this.endDrag);
    document.addEventListener('click', this.hideMenu);
    
    FloatingButton.globalListenersSetup = true;
  }

  private toggleMenu(): void {
    if (!this.button) return;
    
    const menu = this.button.querySelector('.floating-button-menu') as HTMLElement;
    if (menu) {
      const isVisible = menu.style.display !== 'none';
      menu.style.display = isVisible ? 'none' : 'block';
    }
  }

  private hideMenu = (): void => {
    if (!this.button) return;
    
    const menu = this.button.querySelector('.floating-button-menu') as HTMLElement;
    if (menu) {
      menu.style.display = 'none';
    }
  }

  private handleMenuAction(action: string | undefined): void {
    switch (action) {
      case 'screenshot':
        this.takeScreenshot();
        break;
      case 'flag':
        this.flagEvent();
        break;
      case 'minimize':
        this.toggleMinimize();
        break;
      case 'close':
        this.close();
        break;
    }
  }

  private takeScreenshot(): void {
    chrome.runtime.sendMessage({ type: 'TAKE_SCREENSHOT' });
  }

  private flagEvent(): void {
    chrome.runtime.sendMessage({ type: 'FLAG_CURRENT_EVENT' });
  }

  private toggleMinimize(): void {
    if (!this.button) return;
    
    this.isMinimized = !this.isMinimized;
    this.button.classList.toggle('minimized', this.isMinimized);
  }

  private close(): void {
    this.destroy();
  }

  private startDrag(e: MouseEvent): void {
    this.isDragging = true;
    this.dragOffset = {
      x: e.clientX - this.position.x,
      y: e.clientY - this.position.y
    };
  }

  private handleDrag = (e: MouseEvent): void => {
    if (!this.isDragging || !this.button) return;
    
    this.position = {
      x: e.clientX - this.dragOffset.x,
      y: e.clientY - this.dragOffset.y
    };
    
    this.updatePosition();
  }

  private endDrag = (): void => {
    this.isDragging = false;
  }

  private updatePosition(): void {
    if (!this.button) return;
    
    this.button.style.left = `${this.position.x}px`;
    this.button.style.top = `${this.position.y}px`;
  }
}