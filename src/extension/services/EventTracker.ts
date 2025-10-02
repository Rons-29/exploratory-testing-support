import { SessionManager } from './SessionManager';
import { EventData, EventType } from '@/shared/types/EventTypes';

export class EventTracker {
  private sessionManager: SessionManager;
  private lastEvent: EventData | null = null;
  private eventBuffer: EventData[] = [];
  private bufferSize = 100;
  private flushInterval = 5000; // 5秒ごとにフラッシュ
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionManager = new SessionManager();
    this.startFlushTimer();
  }

  public trackClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const eventData: EventData = {
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
          textContent: target.textContent?.substring(0, 100) || '',
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

  public trackKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const eventData: EventData = {
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
          tagName: target.tagName,
          id: target.id,
          className: target.className,
          type: (target as HTMLInputElement).type || '',
          value: (target as HTMLInputElement).value?.substring(0, 50) || '',
          selector: this.generateSelector(target)
        },
        url: window.location.href
      }
    };

    this.addEvent(eventData);
  }

  public trackMouseMove(event: MouseEvent): void {
    // マウス移動は頻繁すぎるので、サンプリングする
    if (Math.random() > 0.1) return;

    const eventData: EventData = {
      type: EventType.MOUSE_MOVE,
      timestamp: new Date().toISOString(),
      data: {
        x: event.clientX,
        y: event.clientY,
        url: window.location.href
      }
    };

    this.addEvent(eventData);
  }

  public trackFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const eventData: EventData = {
      type: EventType.FOCUS,
      timestamp: new Date().toISOString(),
      data: {
        target: {
          tagName: target.tagName,
          id: target.id,
          className: target.className,
          selector: this.generateSelector(target)
        },
        url: window.location.href
      }
    };

    this.addEvent(eventData);
  }

  public trackPageUnload(): void {
    const eventData: EventData = {
      type: EventType.PAGE_UNLOAD,
      timestamp: new Date().toISOString(),
      data: {
        url: window.location.href,
        referrer: document.referrer
      }
    };

    this.addEvent(eventData);
    this.flushEvents(); // ページアンロード時は即座にフラッシュ
  }

  public trackConsoleLog(level: string, args: any[]): void {
    const eventData: EventData = {
      type: EventType.CONSOLE_LOG,
      timestamp: new Date().toISOString(),
      data: {
        level,
        message: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '),
        args: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ),
        url: window.location.href,
        stack: this.getStackTrace()
      }
    };

    this.addEvent(eventData);
  }

  public trackNetworkError(error: any): void {
    const eventData: EventData = {
      type: EventType.NETWORK_ERROR,
      timestamp: new Date().toISOString(),
      data: {
        error: {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url
        },
        url: window.location.href
      }
    };

    this.addEvent(eventData);
  }

  public trackPageLoad(): void {
    const eventData: EventData = {
      type: EventType.PAGE_LOAD,
      timestamp: new Date().toISOString(),
      data: {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer,
        loadTime: performance.now()
      }
    };

    this.addEvent(eventData);
  }

  public getLastEvent(): EventData | null {
    return this.lastEvent;
  }

  public getEventHistory(): EventData[] {
    return [...this.eventBuffer];
  }

  private addEvent(eventData: EventData): void {
    this.lastEvent = eventData;
    this.eventBuffer.push(eventData);

    // バッファが満杯になったらフラッシュ
    if (this.eventBuffer.length >= this.bufferSize) {
      this.flushEvents();
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      for (const event of eventsToFlush) {
        await this.sessionManager.addEvent(event);
      }
    } catch (error) {
      console.error('Failed to flush events:', error);
      // フラッシュに失敗した場合はバッファに戻す
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private generateSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        return `.${classes.join('.')}`;
      }
    }

    // タグ名と位置でセレクタを生成
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element);
      return `${element.tagName.toLowerCase()}:nth-child(${index + 1})`;
    }

    return element.tagName.toLowerCase();
  }

  private getStackTrace(): string {
    const stack = new Error().stack;
    return stack ? stack.split('\n').slice(2, 5).join('\n') : '';
  }

  public destroy(): void {
    this.stopFlushTimer();
    this.flushEvents();
  }
}
