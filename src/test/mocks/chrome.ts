// Mock Chrome APIs for testing
export const mockChrome = {
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({}),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getURL: jest.fn((path: string) => `chrome-extension://test/${path}`)
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined)
    }
  },
  tabs: {
    captureVisibleTab: jest.fn().mockResolvedValue('data:image/png;base64,test'),
    create: jest.fn().mockResolvedValue({ id: 1 }),
    onUpdated: {
      addListener: jest.fn()
    }
  },
  debugger: {
    attach: jest.fn().mockResolvedValue(undefined),
    detach: jest.fn().mockResolvedValue(undefined),
    sendCommand: jest.fn().mockResolvedValue({}),
    onEvent: {
      addListener: jest.fn()
    }
  }
};

// Set global chrome object
(global as any).chrome = mockChrome;
