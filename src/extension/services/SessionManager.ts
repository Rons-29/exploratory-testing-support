import { SessionData, SessionStatus } from '@/shared/types/SessionTypes';

export class SessionManager {
  private currentSession: SessionData | null = null;
  private sessionStorageKey = 'current_session';

  constructor() {
    // 初期化時はセッションをクリアして確実に停止状態から開始
    this.currentSession = null;
    console.log('SessionManager: Initialized with no active session');
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

  public async clearAllData(): Promise<void> {
    try {
      // セッションデータをクリア
      await this.clearSession();
      
      // ログデータもクリア
      await chrome.storage.local.remove('test_logs');
      
      console.log('SessionManager: All data cleared');
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  }

  public async getCurrentSession(): Promise<SessionData | null> {
    // ストレージから最新の状態を読み込み
    await this.loadSessionFromStorage();
    return this.currentSession;
  }

  public async getSession(sessionId: string): Promise<SessionData | null> {
    if (this.currentSession && this.currentSession.id === sessionId) {
      return this.currentSession;
    }
    
    // ストレージからセッションを取得
    try {
      const result = await chrome.storage.local.get(sessionId);
      return result[sessionId] || null;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  public async addLog(logData: any): Promise<void> {
    if (!this.currentSession) return;
    
    this.currentSession.events.push({
      id: logData.id,
      type: 'log',
      timestamp: logData.timestamp,
      data: logData
    });
    
    await this.saveSessionToStorage();
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
    try {
      // 拡張機能のコンテキストが有効かチェック
      if (!chrome.runtime?.id) {
        console.log('SessionManager: Extension context invalidated, skipping storage load');
        return;
      }

      const result = await chrome.storage.local.get(this.sessionStorageKey);
      if (result[this.sessionStorageKey]) {
        const sessionData = result[this.sessionStorageKey];
        
        // 日付フィールドを安全に復元
        if (sessionData.startTime) {
          if (typeof sessionData.startTime === 'string') {
            const startDate = new Date(sessionData.startTime);
            sessionData.startTime = isNaN(startDate.getTime()) ? null : startDate;
          } else if (sessionData.startTime instanceof Date) {
            // 既にDateオブジェクトの場合はそのまま
            sessionData.startTime = isNaN(sessionData.startTime.getTime()) ? null : sessionData.startTime;
          }
        }
        
        if (sessionData.endTime) {
          if (typeof sessionData.endTime === 'string') {
            const endDate = new Date(sessionData.endTime);
            sessionData.endTime = isNaN(endDate.getTime()) ? null : endDate;
          } else if (sessionData.endTime instanceof Date) {
            // 既にDateオブジェクトの場合はそのまま
            sessionData.endTime = isNaN(sessionData.endTime.getTime()) ? null : sessionData.endTime;
          }
        }
        
        this.currentSession = sessionData;
        console.log('SessionManager: Session loaded from storage:', this.currentSession);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Extension context invalidated')) {
        console.log('SessionManager: Extension context invalidated, skipping storage load');
      } else {
        console.error('Failed to load session from storage:', error);
      }
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
    // メッセージパッシングを無効化（エラーの原因）
    // 代わりにchrome.storage.onChangedを使用してContent Scriptと同期
    console.log('SessionManager: Session started notification disabled (using storage sync)');
  }

  private notifySessionStopped(): void {
    // メッセージパッシングを無効化（エラーの原因）
    // 代わりにchrome.storage.onChangedを使用してContent Scriptと同期
    console.log('SessionManager: Session stopped notification disabled (using storage sync)');
  }

  private notifySessionPaused(): void {
    // メッセージパッシングを無効化（エラーの原因）
    // 代わりにchrome.storage.onChangedを使用してContent Scriptと同期
    console.log('SessionManager: Session paused notification disabled (using storage sync)');
  }

  private notifySessionResumed(): void {
    // メッセージパッシングを無効化（エラーの原因）
    // 代わりにchrome.storage.onChangedを使用してContent Scriptと同期
    console.log('SessionManager: Session resumed notification disabled (using storage sync)');
  }
}
