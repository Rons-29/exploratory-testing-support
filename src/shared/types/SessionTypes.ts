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
  events: any[];
  screenshots: any[];
  flags: any[];
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  userAgent: string;
  url: string;
  timestamp: string;
  [key: string]: any;
}
