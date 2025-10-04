import { SessionData, SessionStatus } from '@/shared/types/SessionTypes';

export class SessionManager {
  private currentSession: SessionData | null = null;
  private sessionStorageKey = 'current_session';

  constructor() {
    // 初期状態を確実に「停止中」に設定
    this.currentSession = null;
    
    // 古いセッションデータをクリアしてから初期化
    this.clearOldSessions().then(() => {
      // 非同期でセッションを読み込み
      this.loadSessionFromStorage().catch(error => {
        console.error('Failed to initialize session manager:', error);
        // エラー時も確実に「停止中」状態を維持
        this.currentSession = null;
      });
    }).catch(error => {
      console.error('Failed to clear old sessions:', error);
      // エラー時も確実に「停止中」状態を維持
      this.currentSession = null;
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

  public async clearSession(): Promise<void> {
    this.currentSession = null;
    await chrome.storage.local.remove(this.sessionStorageKey);
    console.log('SessionManager: Session cleared');
  }

  public async getCurrentSession(): Promise<SessionData | null> {
    // ストレージから最新の状態を読み込み
    await this.loadSessionFromStorage();
    return this.currentSession;
  }

  public async addEvent(event: any): Promise<void> {
    // ストレージから最新の状態を読み込み
    await this.loadSessionFromStorage();
    
    if (!this.currentSession || this.currentSession.status !== SessionStatus.ACTIVE) {
      console.log('SessionManager: addEvent - session not active, skipping event');
      return;
    }

    this.currentSession.events.push({
      id: this.generateEventId(),
      ...event,
      timestamp: new Date().toISOString()
    });

    await this.saveSessionToStorage();
    console.log('SessionManager: addEvent - event added, total events:', this.currentSession.events.length);
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
    console.log('SessionManager: Attempting to load session from storage...');
    try {
      const result = await chrome.storage.local.get(this.sessionStorageKey);
      if (result[this.sessionStorageKey]) {
        const sessionData = result[this.sessionStorageKey];
        console.log('SessionManager: Raw session data from storage:', sessionData);
        
        // 日付フィールドを安全に復元
        if (sessionData.startTime) {
          console.log('SessionManager: Processing startTime:', sessionData.startTime, 'type:', typeof sessionData.startTime);
          if (typeof sessionData.startTime === 'string') {
            const startDate = new Date(sessionData.startTime);
            sessionData.startTime = isNaN(startDate.getTime()) ? null : startDate;
            console.log('SessionManager: Parsed startTime (string):', sessionData.startTime);
          } else if (sessionData.startTime instanceof Date) {
            // 既にDateオブジェクトの場合はそのまま
            sessionData.startTime = isNaN(sessionData.startTime.getTime()) ? null : sessionData.startTime;
            console.log('SessionManager: Parsed startTime (Date):', sessionData.startTime);
          } else {
            // シリアライズされたオブジェクトの場合は無視
            console.log('SessionManager: Ignoring serialized startTime object');
            sessionData.startTime = null;
          }
        }
        
        if (sessionData.endTime) {
          console.log('SessionManager: Processing endTime:', sessionData.endTime, 'type:', typeof sessionData.endTime);
          if (typeof sessionData.endTime === 'string') {
            const endDate = new Date(sessionData.endTime);
            sessionData.endTime = isNaN(endDate.getTime()) ? null : endDate;
            console.log('SessionManager: Parsed endTime (string):', sessionData.endTime);
          } else if (sessionData.endTime instanceof Date) {
            sessionData.endTime = isNaN(sessionData.endTime.getTime()) ? null : sessionData.endTime;
            console.log('SessionManager: Parsed endTime (Date):', sessionData.endTime);
          } else {
            // シリアライズされたオブジェクトの場合は無視
            console.log('SessionManager: Ignoring serialized endTime object');
            sessionData.endTime = null;
          }
        }
        
        this.currentSession = sessionData;
        console.log('SessionManager: Session loaded successfully:', this.currentSession);
      } else {
        console.log('SessionManager: No session found in storage.');
        this.currentSession = null;
      }
    } catch (error) {
      console.error('SessionManager: Error loading session from storage:', error);
      this.currentSession = null;
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async clearOldSessions(): Promise<void> {
    try {
      console.log('SessionManager: Clearing old sessions...');
      const result = await chrome.storage.local.get(this.sessionStorageKey);
      if (result[this.sessionStorageKey]) {
        const sessionData = result[this.sessionStorageKey];
        console.log('SessionManager: Found old session data:', sessionData);
        
        // 古いセッションがACTIVE状態の場合は停止状態に変更
        if (sessionData.status === SessionStatus.ACTIVE) {
          console.log('SessionManager: Clearing active session from storage');
          await chrome.storage.local.remove(this.sessionStorageKey);
        }
      }
      console.log('SessionManager: Old sessions cleared');
    } catch (error) {
      console.error('SessionManager: Error clearing old sessions:', error);
    }
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

  public async addLog(logData: any): Promise<void> {
    if (!this.currentSession) return;

    // ログをセッションに追加
    this.currentSession.events.push({
      id: logData.id,
      type: 'log' as any,
      timestamp: logData.timestamp,
      data: logData
    });

    await this.saveSessionToStorage();
    console.log('SessionManager: Log added:', logData.id);
  }
}
