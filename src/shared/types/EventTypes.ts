export enum EventType {
  CLICK = 'click',
  KEYDOWN = 'keydown',
  MOUSE_MOVE = 'mouse_move',
  FOCUS = 'focus',
  PAGE_LOAD = 'page_load',
  PAGE_UNLOAD = 'page_unload',
  CONSOLE_LOG = 'console_log',
  NETWORK_ERROR = 'network_error',
  CUSTOM = 'custom'
}

export interface EventData {
  id: string;
  type: EventType;
  timestamp: string;
  data: any;
}

export interface ClickEventData {
  x: number;
  y: number;
  button: number;
  target: ElementInfo;
  url: string;
  viewport: ViewportInfo;
}

export interface KeydownEventData {
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  target: ElementInfo;
  url: string;
}

export interface MouseMoveEventData {
  x: number;
  y: number;
  url: string;
}

export interface FocusEventData {
  target: ElementInfo;
  url: string;
}

export interface PageLoadEventData {
  url: string;
  title: string;
  referrer: string;
  loadTime: number;
}

export interface PageUnloadEventData {
  url: string;
  referrer: string;
}

export interface ConsoleLogEventData {
  level: string;
  message: string;
  args: string[];
  url: string;
  stack: string;
}

export interface NetworkErrorEventData {
  error: {
    message: string;
    status: number;
    statusText: string;
    url: string;
  };
  url: string;
}

export interface ElementInfo {
  tagName: string;
  id: string;
  className: string;
  textContent?: string;
  href?: string;
  type?: string;
  value?: string;
  selector: string;
}

export interface ViewportInfo {
  width: number;
  height: number;
}
