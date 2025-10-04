import { SessionManager } from './SessionManager';
import { EventData, EventType } from '@/shared/types/EventTypes';

export class OptimizedEventTracker {
  private sessionManager: SessionManager;
  private eventBuffer: EventData[] = [];
  private bufferSize = 50; // バッファサイズを削減
  private flushInterval = 10000; // フラッシュ間隔を延長
  private flushTimer: NodeJS.Timeout | null = null;
  private lastClickTime = 0;
  private clickThrottle = 100; // クリックの間引き（100ms）

  constructor() {
    this.sessionManager = new SessionManager();
    this.startFlushTimer();
  }

  private generateId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public trackClick(event: MouseEvent): void {
    // クリックの間引き
    const now = Date.now();
    if (now - this.lastClickTime < this.clickThrottle) return;
    this.lastClickTime = now;

    const target = event.target as HTMLElement;
    
    // 重要な要素のみ記録
    if (this.isImportantElement(target)) {
      const eventData: EventData = {
        id: this.generateId(),
        type: EventType.CLICK,
        timestamp: new Date().toISOString(),
        data: {
          x: event.clientX,
          y: event.clientY,
          button: event.button,
          target: {
            tagName: target.tagName,
            id: target.id,
            className: target.className,
            textContent: target.textContent?.substring(0, 50) || '', // テキストを短縮
            href: (target as HTMLAnchorElement).href || '',
            selector: this.generateSelector(target)
          },
          url: window.location.href,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }
      };

      this.addEvent(eventData);
    }
  }

  public trackKeydown(event: KeyboardEvent): void {
    // 重要なキーのみ記録
    if (this.isImportantKey(event)) {
      const eventData: EventData = {
        id: this.generateId(),
        type: EventType.KEYDOWN,
        timestamp: new Date().toISOString(),
        data: {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          metaKey: event.metaKey,
          target: {
            tagName: (event.target as HTMLElement)?.tagName || '',
            id: (event.target as HTMLElement)?.id || '',
            className: (event.target as HTMLElement)?.className || ''
          },
          url: window.location.href
        }
      };

      this.addEvent(eventData);
    }
  }

  public trackFormInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    
    // フォーム入力は重要なので全て記録
    const eventData: EventData = {
      id: this.generateId(),
      type: EventType.INPUT,
      timestamp: new Date().toISOString(),
      data: {
        inputType: target.type,
        value: target.value?.substring(0, 100) || '', // 値を短縮
        name: target.name,
        placeholder: target.placeholder,
        required: target.required,
        target: {
          tagName: target.tagName,
          id: target.id,
          className: target.className
        },
        url: window.location.href
      }
    };

    this.addEvent(eventData);
  }

  public trackNavigation(): void {
    // ページ遷移を記録
    const eventData: EventData = {
      id: this.generateId(),
      type: EventType.NAVIGATION,
      timestamp: new Date().toISOString(),
      data: {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer
      }
    };

    this.addEvent(eventData);
  }

  private isImportantElement(element: HTMLElement): boolean {
    // 重要な要素のみ記録
    const importantTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'FORM'];
    const importantRoles = ['button', 'link', 'textbox', 'combobox', 'checkbox', 'radio'];
    
    if (importantTags.includes(element.tagName)) return true;
    if (element.getAttribute('role') && importantRoles.includes(element.getAttribute('role')!)) return true;
    if (element.onclick) return true;
    if (element.getAttribute('data-testid')) return true;
    
    return false;
  }

  private isImportantKey(event: KeyboardEvent): boolean {
    // 重要なキーのみ記録
    const importantKeys = [
      'Enter', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Space', 'Backspace', 'Delete', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
    ];
    
    if (importantKeys.includes(event.key)) return true;
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return true;
    
    return false;
  }

  private generateSelector(element: HTMLElement): string {
    // 簡潔なセレクタを生成
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  private addEvent(eventData: EventData): void {
    this.eventBuffer.push(eventData);

    if (this.eventBuffer.length >= this.bufferSize) {
      this.flushEvents();
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.flushEvents();
      }
    }, this.flushInterval);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      const eventsToFlush = [...this.eventBuffer];
      this.eventBuffer = [];

      for (const event of eventsToFlush) {
        await this.sessionManager.addEvent(event);
      }
    } catch (error) {
      // エラーは無視（軽量化のため）
    }
  }

  public destroy(): void {
    this.stopFlushTimer();
    this.flushEvents();
  }
}
