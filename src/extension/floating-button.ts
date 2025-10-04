class FloatingButton {
  private container: HTMLElement;
  private mainButton: HTMLElement;
  private actionButtons: HTMLElement;
  private minimizeButton: HTMLElement;
  private isExpanded: boolean = false;
  private isMinimized: boolean = false;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private isSessionActive: boolean = false;

  constructor() {
    this.container = document.getElementById('floatingContainer')!;
    this.mainButton = document.getElementById('mainButton')!;
    this.actionButtons = document.getElementById('actionButtons')!;
    this.minimizeButton = document.getElementById('minimizeButton')!;

    this.initializeEventListeners();
    this.loadPosition();
  }

  private initializeEventListeners(): void {
    // メインボタンのクリック
    this.mainButton.addEventListener('click', () => {
      this.toggleSession();
    });

    // アクションボタンのクリック
    document.getElementById('screenshotButton')?.addEventListener('click', () => {
      this.takeScreenshot();
    });

    document.getElementById('flagButton')?.addEventListener('click', () => {
      this.flagEvent();
    });

    document.getElementById('noteButton')?.addEventListener('click', () => {
      this.addNote();
    });

    // 最小化ボタン
<<<<<<< HEAD
    this.minimizeButton.addEventListener('click', (e) => {
=======
    this.minimizeButton.addEventListener('click', e => {
>>>>>>> origin/main
      e.stopPropagation();
      this.toggleMinimize();
    });

    // ドラッグ機能
<<<<<<< HEAD
    this.mainButton.addEventListener('mousedown', (e) => {
      this.startDrag(e);
    });

    document.addEventListener('mousemove', (e) => {
=======
    this.mainButton.addEventListener('mousedown', e => {
      this.startDrag(e);
    });

    document.addEventListener('mousemove', e => {
>>>>>>> origin/main
      this.drag(e);
    });

    document.addEventListener('mouseup', () => {
      this.endDrag();
    });

    // ダブルクリックで最小化
    this.mainButton.addEventListener('dblclick', () => {
      this.toggleMinimize();
    });

    // キーボードショートカット
<<<<<<< HEAD
    document.addEventListener('keydown', (e) => {
=======
    document.addEventListener('keydown', e => {
>>>>>>> origin/main
      this.handleKeyboardShortcut(e);
    });
  }

  private toggleSession(): void {
    this.isSessionActive = !this.isSessionActive;
    this.updateUI();
<<<<<<< HEAD
    
    // Background Scriptにメッセージ送信
    chrome.runtime.sendMessage({
      type: this.isSessionActive ? 'START_SESSION' : 'STOP_SESSION'
=======

    // Background Scriptにメッセージ送信
    chrome.runtime.sendMessage({
      type: this.isSessionActive ? 'START_SESSION' : 'STOP_SESSION',
>>>>>>> origin/main
    });
  }

  private takeScreenshot(): void {
    chrome.runtime.sendMessage({ type: 'TAKE_SCREENSHOT' });
  }

  private flagEvent(): void {
    chrome.runtime.sendMessage({ type: 'FLAG_CURRENT_EVENT' });
  }

  private addNote(): void {
    const note = prompt('メモを入力してください:');
    if (note) {
      chrome.runtime.sendMessage({
        type: 'ADD_NOTE',
<<<<<<< HEAD
        note: note
=======
        note: note,
>>>>>>> origin/main
      });
    }
  }

  private toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
<<<<<<< HEAD
    
=======

>>>>>>> origin/main
    if (this.isMinimized) {
      this.container.style.display = 'none';
      this.createMinimizedButton();
    } else {
      this.container.style.display = 'flex';
      this.removeMinimizedButton();
    }
  }

  private createMinimizedButton(): void {
    const minimized = document.createElement('div');
    minimized.className = 'minimized';
    minimized.id = 'minimizedButton';
    minimized.innerHTML = '<div class="icon">テスト</div>';
<<<<<<< HEAD
    
=======

>>>>>>> origin/main
    minimized.addEventListener('click', () => {
      this.toggleMinimize();
    });

    document.body.appendChild(minimized);
  }

  private removeMinimizedButton(): void {
    const minimized = document.getElementById('minimizedButton');
    if (minimized) {
      minimized.remove();
    }
  }

  private startDrag(e: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = e.clientX - this.container.offsetLeft;
    this.dragStartY = e.clientY - this.container.offsetTop;
<<<<<<< HEAD
    
=======

>>>>>>> origin/main
    this.container.classList.add('dragging');
    e.preventDefault();
  }

  private drag(e: MouseEvent): void {
    if (!this.isDragging) return;

    const x = e.clientX - this.dragStartX;
    const y = e.clientY - this.dragStartY;

    // 画面内に制限
    const maxX = window.innerWidth - this.container.offsetWidth;
    const maxY = window.innerHeight - this.container.offsetHeight;

    const clampedX = Math.max(0, Math.min(x, maxX));
    const clampedY = Math.max(0, Math.min(y, maxY));

    this.container.style.left = clampedX + 'px';
    this.container.style.top = clampedY + 'px';
    this.container.style.right = 'auto';
    this.container.style.bottom = 'auto';
  }

  private endDrag(): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.container.classList.remove('dragging');
    this.savePosition();
  }

  private savePosition(): void {
    const rect = this.container.getBoundingClientRect();
    const position = {
      x: rect.left,
      y: rect.top,
<<<<<<< HEAD
      isMinimized: this.isMinimized
    };
    
=======
      isMinimized: this.isMinimized,
    };

>>>>>>> origin/main
    chrome.storage.local.set({ floatingButtonPosition: position });
  }

  private loadPosition(): void {
<<<<<<< HEAD
    chrome.storage.local.get('floatingButtonPosition', (result) => {
=======
    chrome.storage.local.get('floatingButtonPosition', result => {
>>>>>>> origin/main
      if (result.floatingButtonPosition) {
        const pos = result.floatingButtonPosition;
        this.container.style.left = pos.x + 'px';
        this.container.style.top = pos.y + 'px';
        this.container.style.right = 'auto';
        this.container.style.bottom = 'auto';
<<<<<<< HEAD
        
=======

>>>>>>> origin/main
        if (pos.isMinimized) {
          this.toggleMinimize();
        }
      }
    });
  }

  private handleKeyboardShortcut(e: KeyboardEvent): void {
    // Ctrl+Shift+T: テスト開始/終了
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      this.toggleSession();
    }
<<<<<<< HEAD
    
=======

>>>>>>> origin/main
    // Ctrl+Shift+F: フラグ
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      this.flagEvent();
    }
<<<<<<< HEAD
    
=======

>>>>>>> origin/main
    // Ctrl+Shift+S: スクリーンショット
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      this.takeScreenshot();
    }
  }

  private updateUI(): void {
    const icon = this.mainButton.querySelector('.icon') as HTMLElement;
    const status = this.mainButton.querySelector('.status') as HTMLElement;

    if (this.isSessionActive) {
      this.mainButton.classList.add('active');
      icon.textContent = '⏹';
      status.textContent = 'テスト停止';
      this.expandActions();
    } else {
      this.mainButton.classList.remove('active');
      icon.textContent = '▶';
      status.textContent = 'テスト開始';
      this.collapseActions();
    }
  }

  private expandActions(): void {
    this.isExpanded = true;
    this.container.classList.add('expanded');
  }

  private collapseActions(): void {
    this.isExpanded = false;
    this.container.classList.remove('expanded');
  }

  public updateStatus(isActive: boolean): void {
    this.isSessionActive = isActive;
    this.updateUI();
  }
}

// フローティングボタンを初期化
const floatingButton = new FloatingButton();

// Background Scriptからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SESSION_STARTED':
      floatingButton.updateStatus(true);
      break;
    case 'SESSION_STOPPED':
      floatingButton.updateStatus(false);
      break;
  }
});
