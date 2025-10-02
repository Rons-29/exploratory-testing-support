import { EventTracker } from '../EventTracker';
import { EventType } from '@/shared/types/EventTypes';

// Mock SessionManager
jest.mock('../SessionManager');
const MockedSessionManager = jest.mocked(require('../SessionManager').SessionManager);

describe('EventTracker', () => {
  let eventTracker: EventTracker;
  let mockSessionManager: any;

  beforeEach(() => {
    mockSessionManager = {
      addEvent: jest.fn(),
      isActive: jest.fn().mockResolvedValue(true),
      startSession: jest.fn().mockResolvedValue('session-id')
    };
    
    MockedSessionManager.mockImplementation(() => mockSessionManager);
    eventTracker = new EventTracker();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    eventTracker.destroy();
  });

  describe('trackClick', () => {
    it('should track click event when session is active', async () => {
      await mockSessionManager.startSession();

      const mockEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        target: {
          tagName: 'BUTTON',
          id: 'test-button',
          className: 'btn btn-primary',
          textContent: 'Click me'
        }
      } as any;

      eventTracker.trackClick(mockEvent);
      await eventTracker.flushEvents();

      expect(mockSessionManager.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.CLICK,
          data: expect.objectContaining({
            x: 100,
            y: 200,
            button: 0,
            target: expect.objectContaining({
              tagName: 'BUTTON',
              id: 'test-button',
              className: 'btn btn-primary',
              textContent: 'Click me'
            })
          })
        })
      );
    });

    it('should not track click event when session is inactive', () => {
      mockSessionManager.isActive.mockResolvedValue(false);

      const mockEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        target: { tagName: 'BUTTON' }
      } as any;

      eventTracker.trackClick(mockEvent);

      expect(mockSessionManager.addEvent).not.toHaveBeenCalled();
    });
  });

  describe('trackKeydown', () => {
    it('should track keydown event when session is active', () => {
      const mockEvent = {
        key: 'Enter',
        code: 'Enter',
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        target: {
          tagName: 'INPUT',
          id: 'test-input',
          className: 'form-control',
          type: 'text',
          value: 'test value'
        }
      } as any;

      eventTracker.trackKeydown(mockEvent);

      expect(mockSessionManager.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.KEYDOWN,
          data: expect.objectContaining({
            key: 'Enter',
            code: 'Enter',
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            target: expect.objectContaining({
              tagName: 'INPUT',
              id: 'test-input',
              className: 'form-control',
              type: 'text',
              value: 'test value'
            })
          })
        })
      );
    });
  });

  describe('trackMouseMove', () => {
    it('should track mouse move event with sampling', () => {
      // Mock Math.random to return 0.05 (less than 0.1 threshold)
      jest.spyOn(Math, 'random').mockReturnValue(0.05);

      const mockEvent = {
        clientX: 150,
        clientY: 250
      } as any;

      eventTracker.trackMouseMove(mockEvent);

      expect(mockSessionManager.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.MOUSE_MOVE,
          data: expect.objectContaining({
            x: 150,
            y: 250
          })
        })
      );

      jest.restoreAllMocks();
    });

    it('should not track mouse move event when sampling rejects', () => {
      // Mock Math.random to return 0.5 (greater than 0.1 threshold)
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const mockEvent = {
        clientX: 150,
        clientY: 250
      } as any;

      eventTracker.trackMouseMove(mockEvent);

      expect(mockSessionManager.addEvent).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('trackFocus', () => {
    it('should track focus event when session is active', () => {
      const mockEvent = {
        target: {
          tagName: 'INPUT',
          id: 'focus-input',
          className: 'form-control'
        }
      } as any;

      eventTracker.trackFocus(mockEvent);

      expect(mockSessionManager.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.FOCUS,
          data: expect.objectContaining({
            target: expect.objectContaining({
              tagName: 'INPUT',
              id: 'focus-input',
              className: 'form-control'
            })
          })
        })
      );
    });
  });

  describe('trackPageUnload', () => {
    it('should track page unload event', () => {
      eventTracker.trackPageUnload();

      expect(mockSessionManager.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.PAGE_UNLOAD,
          data: expect.objectContaining({
            url: 'http://localhost/',
            referrer: ''
          })
        })
      );
    });
  });

  describe('trackConsoleLog', () => {
    it('should track console log with different levels', () => {
      const args = ['Test message', { key: 'value' }];

      eventTracker.trackConsoleLog('log', args);
      eventTracker.trackConsoleLog('error', args);
      eventTracker.trackConsoleLog('warn', args);

      expect(mockSessionManager.addEvent).toHaveBeenCalledTimes(3);
      expect(mockSessionManager.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.CONSOLE_LOG,
          data: expect.objectContaining({
            level: 'log',
            message: 'Test message {"key":"value"}',
            args: ['Test message', '{"key":"value"}']
          })
        })
      );
    });
  });

  describe('trackNetworkError', () => {
    it('should track network error', () => {
      const error = {
        message: 'Network error',
        status: 500,
        statusText: 'Internal Server Error',
        url: 'https://api.example.com/endpoint'
      };

      eventTracker.trackNetworkError(error);

      expect(mockSessionManager.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.NETWORK_ERROR,
          data: expect.objectContaining({
            error: expect.objectContaining({
              message: 'Network error',
              status: 500,
              statusText: 'Internal Server Error',
              url: 'https://api.example.com/endpoint'
            })
          })
        })
      );
    });
  });

  describe('trackPageLoad', () => {
    it('should track page load event', () => {
      eventTracker.trackPageLoad();

      expect(mockSessionManager.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.PAGE_LOAD,
          data: expect.objectContaining({
            url: 'https://example.com',
            title: '',
            referrer: '',
            loadTime: expect.any(Number)
          })
        })
      );
    });
  });

  describe('getLastEvent', () => {
    it('should return the last tracked event', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        target: { tagName: 'BUTTON' }
      } as any;

      eventTracker.trackClick(mockEvent);

      const lastEvent = eventTracker.getLastEvent();
      expect(lastEvent).toBeDefined();
      expect(lastEvent?.type).toBe(EventType.CLICK);
    });

    it('should return null when no events tracked', () => {
      const lastEvent = eventTracker.getLastEvent();
      expect(lastEvent).toBeNull();
    });
  });

  describe('getEventHistory', () => {
    it('should return all tracked events', () => {
      const mockClickEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        target: { tagName: 'BUTTON' }
      } as any;

      const mockKeydownEvent = {
        key: 'Enter',
        code: 'Enter',
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        target: { tagName: 'INPUT' }
      } as any;

      eventTracker.trackClick(mockClickEvent);
      eventTracker.trackKeydown(mockKeydownEvent);

      const history = eventTracker.getEventHistory();
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe(EventType.CLICK);
      expect(history[1].type).toBe(EventType.KEYDOWN);
    });
  });
});
