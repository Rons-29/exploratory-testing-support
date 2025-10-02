import { SessionManager } from '../../extension/services/SessionManager';
import { EventTracker } from '../../extension/services/EventTracker';
import { ApiClient } from '../../extension/services/ApiClient';
import { AuthService } from '../../backend/services/AuthService';

// Mock chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  }
};

(global as any).chrome = mockChrome;

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Extension-Backend Integration', () => {
  let sessionManager: SessionManager;
  let eventTracker: EventTracker;
  let apiClient: ApiClient;

  beforeEach(() => {
    sessionManager = new SessionManager();
    eventTracker = new EventTracker();
    apiClient = new ApiClient();
    
    jest.clearAllMocks();
  });

  describe('Session Management Flow', () => {
    it('should complete full session lifecycle', async () => {
      // Start session
      const sessionId = await sessionManager.startSession('Integration Test', 'Testing full flow');
      expect(sessionId).toBeDefined();

      // Add events
      const clickEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        target: { tagName: 'BUTTON', id: 'test-btn' }
      } as any;

      eventTracker.trackClick(clickEvent);

      // Add screenshot
      const screenshotId = await sessionManager.addScreenshot('data:image/png;base64,test');
      expect(screenshotId).toBeDefined();

      // Add flag
      const flagId = await sessionManager.addFlag('event123', 'Important finding');
      expect(flagId).toBeDefined();

      // Get session stats
      const stats = await sessionManager.getSessionStats();
      expect(stats.eventCount).toBeGreaterThan(0);
      expect(stats.screenshotCount).toBe(1);
      expect(stats.flagCount).toBe(1);

      // Stop session
      const sessionData = await sessionManager.stopSession();
      expect(sessionData.status).toBe('completed');
      expect(sessionData.endTime).toBeDefined();
    });

    it('should handle session pause and resume', async () => {
      await sessionManager.startSession('Pause Test');

      // Add some events
      const clickEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        target: { tagName: 'BUTTON' }
      } as any;

      eventTracker.trackClick(clickEvent);

      // Pause session
      await sessionManager.pauseSession();
      let session = await sessionManager.getCurrentSession();
      expect(session?.status).toBe('paused');

      // Try to add event while paused (should not be added)
      const pausedClickEvent = {
        clientX: 150,
        clientY: 250,
        button: 0,
        target: { tagName: 'BUTTON' }
      } as any;

      eventTracker.trackClick(pausedClickEvent);

      // Resume session
      await sessionManager.resumeSession();
      session = await sessionManager.getCurrentSession();
      expect(session?.status).toBe('active');

      // Add event after resume
      const resumedClickEvent = {
        clientX: 200,
        clientY: 300,
        button: 0,
        target: { tagName: 'BUTTON' }
      } as any;

      eventTracker.trackClick(resumedClickEvent);

      // Verify events
      const stats = await sessionManager.getSessionStats();
      expect(stats.eventCount).toBe(2); // Only active session events
    });
  });

  describe('API Communication', () => {
    it('should handle API authentication flow', async () => {
      const mockAuthResponse = {
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User'
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAuthResponse
      });

      const result = await apiClient.authenticate('google', 'id-token');
      
      expect(result).toEqual(mockAuthResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/google'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ idToken: 'id-token' })
        })
      );
    });

    it('should handle API error responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      });

      await expect(apiClient.authenticate('google', 'invalid-token')).rejects.toThrow('API request failed');
    });

    it('should upload session data to backend', async () => {
      const mockSessionData = {
        id: 'session123',
        name: 'Test Session',
        description: 'Test Description',
        status: 'completed',
        startTime: '2023-01-01T00:00:00Z',
        endTime: '2023-01-01T01:00:00Z',
        events: [
          {
            id: 'event123',
            type: 'click',
            timestamp: '2023-01-01T00:30:00Z',
            data: { x: 100, y: 200 }
          }
        ],
        screenshots: [
          {
            id: 'screenshot123',
            timestamp: '2023-01-01T00:30:00Z',
            data: 'data:image/png;base64,test'
          }
        ],
        flags: [
          {
            id: 'flag123',
            eventId: 'event123',
            note: 'Important finding',
            timestamp: '2023-01-01T00:30:00Z'
          }
        ]
      };

      const mockUploadResponse = {
        sessionId: 'session123',
        uploadedAt: '2023-01-01T01:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUploadResponse
      });

      const result = await apiClient.uploadSession(mockSessionData);
      
      expect(result).toEqual(mockUploadResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer access-token'
          }),
          body: JSON.stringify(mockSessionData)
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.authenticate('google', 'id-token')).rejects.toThrow('Network error');
    });

    it('should handle invalid session operations', async () => {
      // Try to stop session without starting
      await expect(sessionManager.stopSession()).rejects.toThrow('No active session to stop');

      // Try to pause session without starting
      await expect(sessionManager.pauseSession()).rejects.toThrow('No active session to pause');

      // Try to resume session without pausing
      await expect(sessionManager.resumeSession()).rejects.toThrow('No paused session to resume');
    });

    it('should handle API timeout', async () => {
      // Mock fetch to simulate timeout
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(apiClient.authenticate('google', 'id-token')).rejects.toThrow('Request timeout');
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      await sessionManager.startSession('Consistency Test');

      // Add multiple events
      for (let i = 0; i < 5; i++) {
        const clickEvent = {
          clientX: i * 100,
          clientY: i * 100,
          button: 0,
          target: { tagName: 'BUTTON', id: `btn-${i}` }
        } as any;

        eventTracker.trackClick(clickEvent);
      }

      // Add screenshots
      for (let i = 0; i < 3; i++) {
        await sessionManager.addScreenshot(`data:image/png;base64,screenshot-${i}`);
      }

      // Add flags
      for (let i = 0; i < 2; i++) {
        await sessionManager.addFlag(`event${i}`, `Flag ${i}`);
      }

      // Verify data consistency
      const session = await sessionManager.getCurrentSession();
      expect(session?.events).toHaveLength(5);
      expect(session?.screenshots).toHaveLength(3);
      expect(session?.flags).toHaveLength(2);

      const stats = await sessionManager.getSessionStats();
      expect(stats.eventCount).toBe(5);
      expect(stats.screenshotCount).toBe(3);
      expect(stats.flagCount).toBe(2);
    });
  });
});
