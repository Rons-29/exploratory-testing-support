import { SessionData, SessionStatus } from '@/shared/types/SessionTypes';

export class SessionManager {
  private currentSession: SessionData | null = null;
  private sessionStorageKey = 'current_session';

  constructor() {
    // 非同期でセッションを読み込み
    this.loadSessionFromStorage().catch(error => {
      console.error('Failed to initialize session manager:', error);
    });
  }

  public async startSession(name?: string, description?: string): Promise<string> {
    if (this.currentSession && this.currentSession.status === SessionStatus.ACTIVE) {
      throw new Error('Session is already active');
    }

    const sessionId = this.generateSessionId();
    const now = new Date();

    this.currentSession = {
      id: sessionId,
      name: name || `Session ${now.toLocaleString()}`,
      description: description || '',
      status: SessionStatus.ACTIVE,
      startTime: now,
      endTime: null,
      events: [],
      screenshots: [],
      flags: [],
      metadata: {
        userAgent: navigator.userAgent,
        url: 'chrome-extension://' + chrome.runtime.id,
        timestamp: now.toISOString()
      }
    };

    await this.saveSessionToStorage();
    this.notifySessionStarted();

    return sessionId;
  }

  public async stopSession(): Promise<SessionData> {
    if (!this.currentSession || this.currentSession.status !== SessionStatus.ACTIVE) {
      throw new Error('No active session to stop');
    }

    this.currentSession.status = SessionStatus.COMPLETED;
    this.currentSession.endTime = new Date();

    await this.saveSessionToStorage();
    this.notifySessionStopped();

    const completedSession = { ...this.currentSession };
    this.currentSession = null;

    return completedSession;
  }

  public async pauseSession(): Promise<void> {
    if (!this.currentSession || this.currentSession.status !== SessionStatus.ACTIVE) {
      throw new Error('No active session to pause');
    }

    this.currentSession.status = SessionStatus.PAUSED;
    await this.saveSessionToStorage();
    this.notifySessionPaused();
  }

  public async resumeSession(): Promise<void> {
    if (!this.currentSession || this.currentSession.status !== SessionStatus.PAUSED) {
      throw new Error('No paused session to resume');
    }

    this.currentSession.status = SessionStatus.ACTIVE;
    await this.saveSessionToStorage();
    this.notifySessionResumed();
  }

  public async isActive(): Promise<boolean> {
    // ストレージから最新の状態を読み込み
    await this.loadSessionFromStorage();
    const isActive = this.currentSession?.status === SessionStatus.ACTIVE;
    console.log('SessionManager: isActive check:', {
      currentSession: this.currentSession,
      status: this.currentSession?.status,
      isActive
    });
    return isActive;
  }

  public async getCurrentSession(): Promise<SessionData | null> {
    return this.currentSession;
  }

  public async addEvent(event: any): Promise<void> {
    if (!this.currentSession || this.currentSession.status !== SessionStatus.ACTIVE) {
      return;
    }

    this.currentSession.events.push({
      id: this.generateEventId(),
      ...event,
      timestamp: new Date().toISOString()
    });

    await this.saveSessionToStorage();
  }

  public async addScreenshot(screenshotData: string): Promise<string> {
    if (!this.currentSession || this.currentSession.status !== SessionStatus.ACTIVE) {
      throw new Error('No active session');
    }

    const screenshotId = this.generateScreenshotId();
    this.currentSession.screenshots.push({
      id: screenshotId,
      data: screenshotData,
      timestamp: new Date().toISOString(),
      url: 'chrome-extension://' + chrome.runtime.id
    });

    await this.saveSessionToStorage();
    return screenshotId;
  }

  public async addFlag(eventId: string, note: string): Promise<string> {
    if (!this.currentSession || this.currentSession.status !== SessionStatus.ACTIVE) {
      throw new Error('No active session');
    }

    const flagId = this.generateFlagId();
    this.currentSession.flags.push({
      id: flagId,
      eventId,
      note,
      timestamp: new Date().toISOString()
    });

    await this.saveSessionToStorage();
    return flagId;
  }

  public async getSessionStats(): Promise<{
    eventCount: number;
    errorCount: number;
    screenshotCount: number;
    flagCount: number;
    duration: number;
  }> {
    if (!this.currentSession) {
      return {
        eventCount: 0,
        errorCount: 0,
        screenshotCount: 0,
        flagCount: 0,
        duration: 0
      };
    }

    const errorCount = this.currentSession.events.filter(
      event => event.type === 'console' && event.level === 'error'
    ).length;

    const duration = this.currentSession.startTime
      ? Date.now() - this.currentSession.startTime.getTime()
      : 0;

    return {
      eventCount: this.currentSession.events.length,
      errorCount,
      screenshotCount: this.currentSession.screenshots.length,
      flagCount: this.currentSession.flags.length,
      duration
    };
  }

  private async saveSessionToStorage(): Promise<void> {
    if (this.currentSession) {
      await chrome.storage.local.set({
        [this.sessionStorageKey]: this.currentSession
      });
    }
  }

  private async loadSessionFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(this.sessionStorageKey);
      if (result[this.sessionStorageKey]) {
        this.currentSession = result[this.sessionStorageKey];
      }
    } catch (error) {
      console.error('Failed to load session from storage:', error);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateScreenshotId(): string {
    return `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFlagId(): string {
    return `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifySessionStarted(): void {
    chrome.runtime.sendMessage({
      type: 'SESSION_STARTED',
      sessionId: this.currentSession?.id
    });
  }

  private notifySessionStopped(): void {
    chrome.runtime.sendMessage({
      type: 'SESSION_STOPPED',
      sessionId: this.currentSession?.id
    });
  }

  private notifySessionPaused(): void {
    chrome.runtime.sendMessage({
      type: 'SESSION_PAUSED',
      sessionId: this.currentSession?.id
    });
  }

  private notifySessionResumed(): void {
    chrome.runtime.sendMessage({
      type: 'SESSION_RESUMED',
      sessionId: this.currentSession?.id
    });
  }
}
