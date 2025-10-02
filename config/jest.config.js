module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/../src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  collectCoverageFrom: [
    '<rootDir>/../src/**/*.ts',
    '!<rootDir>/../src/**/*.d.ts',
    '!<rootDir>/../src/**/*.test.ts',
    '!<rootDir>/../src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/../src/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^@/extension/(.*)$': '<rootDir>/../src/extension/$1',
    '^@/backend/(.*)$': '<rootDir>/../src/backend/$1',
    '^@/shared/(.*)$': '<rootDir>/../src/shared/$1'
  },
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  }
};
