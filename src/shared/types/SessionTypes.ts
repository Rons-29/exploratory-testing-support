export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface SessionData {
  id: string;
  name: string;
  description: string;
  status: SessionStatus;
  startTime: Date;
  endTime: Date | null;
  events: EventData[];
  screenshots: ScreenshotData[];
  flags: FlagData[];
  metadata: SessionMetadata;
}

export interface EventData {
  id: string;
  type: string;
  timestamp: string;
  data: any;
}

export interface ScreenshotData {
  id: string;
  data: string; // base64 encoded image data
  timestamp: string;
  url: string;
}

export interface FlagData {
  id: string;
  eventId: string;
  note: string;
  timestamp: string;
}

export interface SessionMetadata {
  userAgent: string;
  url: string;
  timestamp: string;
  [key: string]: any;
}
