import { SessionManager } from '../SessionManager';
import { SessionStatus } from '@/shared/types/SessionTypes';

// Mock chrome.storage.local
const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn()
};

(chrome.storage.local as any) = mockStorage;

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    it('should start a new session successfully', async () => {
      const sessionId = await sessionManager.startSession('Test Session', 'Test Description');
      
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(mockStorage.set).toHaveBeenCalled();
    });

    it('should throw error if session is already active', async () => {
      await sessionManager.startSession();
      
      await expect(sessionManager.startSession()).rejects.toThrow('Session is already active');
    });

    it('should generate unique session IDs', async () => {
      const sessionId1 = await sessionManager.startSession();
      await sessionManager.stopSession();
      
      const sessionId2 = await sessionManager.startSession();
      
      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('stopSession', () => {
    it('should stop active session successfully', async () => {
      await sessionManager.startSession('Test Session');
      const sessionData = await sessionManager.stopSession();
      
      expect(sessionData.status).toBe(SessionStatus.COMPLETED);
      expect(sessionData.endTime).toBeDefined();
      expect(sessionData.startTime).toBeDefined();
    });

    it('should throw error if no active session', async () => {
      await expect(sessionManager.stopSession()).rejects.toThrow('No active session to stop');
    });
  });

  describe('pauseSession', () => {
    it('should pause active session', async () => {
      await sessionManager.startSession();
      await sessionManager.pauseSession();
      
      const session = await sessionManager.getCurrentSession();
      expect(session?.status).toBe(SessionStatus.PAUSED);
    });

    it('should throw error if no active session to pause', async () => {
      await expect(sessionManager.pauseSession()).rejects.toThrow('No active session to pause');
    });
  });

  describe('resumeSession', () => {
    it('should resume paused session', async () => {
      await sessionManager.startSession();
      await sessionManager.pauseSession();
      await sessionManager.resumeSession();
      
      const session = await sessionManager.getCurrentSession();
      expect(session?.status).toBe(SessionStatus.ACTIVE);
    });

    it('should throw error if no paused session to resume', async () => {
      await expect(sessionManager.resumeSession()).rejects.toThrow('No paused session to resume');
    });
  });

  describe('isActive', () => {
    it('should return true for active session', async () => {
      await sessionManager.startSession();
      const isActive = await sessionManager.isActive();
      expect(isActive).toBe(true);
    });

    it('should return false for inactive session', async () => {
      const isActive = await sessionManager.isActive();
      expect(isActive).toBe(false);
    });
  });

  describe('addEvent', () => {
    it('should add event to active session', async () => {
      await sessionManager.startSession();
      
      const event = {
        type: 'click',
        data: { x: 100, y: 200 }
      };
      
      await sessionManager.addEvent(event);
      
      const session = await sessionManager.getCurrentSession();
      expect(session?.events).toHaveLength(1);
      expect(session?.events[0].type).toBe('click');
    });

    it('should not add event to inactive session', async () => {
      const event = {
        type: 'click',
        data: { x: 100, y: 200 }
      };
      
      await sessionManager.addEvent(event);
      
      const session = await sessionManager.getCurrentSession();
      expect(session).toBeNull();
    });
  });

  describe('addScreenshot', () => {
    it('should add screenshot to active session', async () => {
      await sessionManager.startSession();
      
      const screenshotData = 'data:image/png;base64,test';
      const screenshotId = await sessionManager.addScreenshot(screenshotData);
      
      expect(screenshotId).toBeDefined();
      expect(screenshotId).toMatch(/^screenshot_\d+_[a-z0-9]+$/);
      
      const session = await sessionManager.getCurrentSession();
      expect(session?.screenshots).toHaveLength(1);
    });

    it('should throw error if no active session', async () => {
      const screenshotData = 'data:image/png;base64,test';
      
      await expect(sessionManager.addScreenshot(screenshotData)).rejects.toThrow('No active session');
    });
  });

  describe('addFlag', () => {
    it('should add flag to active session', async () => {
      await sessionManager.startSession();
      
      const flagId = await sessionManager.addFlag('event123', 'Important bug found');
      
      expect(flagId).toBeDefined();
      expect(flagId).toMatch(/^flag_\d+_[a-z0-9]+$/);
      
      const session = await sessionManager.getCurrentSession();
      expect(session?.flags).toHaveLength(1);
      expect(session?.flags[0].note).toBe('Important bug found');
    });

    it('should throw error if no active session', async () => {
      await expect(sessionManager.addFlag('event123', 'Test note')).rejects.toThrow('No active session');
    });
  });

  describe('getSessionStats', () => {
    it('should return correct stats for active session', async () => {
      await sessionManager.startSession();
      
      // Add some events
      await sessionManager.addEvent({ type: 'click', data: {} });
      await sessionManager.addEvent({ type: 'console', level: 'error', data: {} });
      await sessionManager.addScreenshot('data:image/png;base64,test');
      
      // Wait a bit to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const stats = await sessionManager.getSessionStats();
      
      expect(stats.eventCount).toBe(2);
      expect(stats.errorCount).toBe(1);
      expect(stats.screenshotCount).toBe(1);
      expect(stats.duration).toBeGreaterThan(0);
    });

    it('should return zero stats for inactive session', async () => {
      const stats = await sessionManager.getSessionStats();
      
      expect(stats.eventCount).toBe(0);
      expect(stats.errorCount).toBe(0);
      expect(stats.screenshotCount).toBe(0);
      expect(stats.duration).toBe(0);
    });
  });
});
