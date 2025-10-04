// Jest setup file
import 'dotenv/config';
import './mocks/chrome';

// Mock window object for browser testing (only in jsdom environment)
if (typeof window !== 'undefined') {
  // Mock location if not already defined
  if (!window.location) {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com',
        hostname: 'example.com',
        pathname: '/',
        search: '',
        hash: '',
      },
      writable: true,
      configurable: true,
    });
  }

  // Mock performance API if not already defined
  if (!window.performance) {
    Object.defineProperty(window, 'performance', {
      value: {
        now: jest.fn(() => Date.now()),
      },
      writable: true,
      configurable: true,
    });
  }
}

// Mock console methods (only in test environment)
if (process.env.NODE_ENV === 'test') {
  const originalConsole = { ...console };
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock TextEncoder/TextDecoder for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
  global.TextDecoder = require('util').TextDecoder;
}

// Mock setImmediate and clearImmediate for jsdom environment compatibility
if (typeof global.setImmediate === 'undefined') {
  const mockSetImmediate = Object.assign(
    (callback: (...args: void[]) => void, ...args: void[]): NodeJS.Immediate => {
      const timeoutId = setTimeout(callback, 0, ...args);
      return Object.assign(timeoutId, {
        _onImmediate: callback,
        hasRef: () => true,
        ref: () => timeoutId,
        unref: () => timeoutId,
      }) as NodeJS.Immediate;
    },
    {
      __promisify__: <T = void>(value?: T, options?: unknown): Promise<T> => {
        return Promise.resolve(value as T);
      },
    }
  );

  const mockClearImmediate = (immediate: NodeJS.Immediate | undefined): void => {
    if (immediate !== undefined) {
      clearTimeout(immediate as any);
    }
  };

  global.setImmediate = mockSetImmediate;
  global.clearImmediate = mockClearImmediate;
}
