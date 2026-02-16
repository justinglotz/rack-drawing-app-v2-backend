import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  coverageReporters: ['text', 'html', 'lcov'],
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['src/index.ts', 'src/scripts/', 'src/config/'],
  coverageThreshold: {
    global: { lines: 60, functions: 60, branches: 50, statements: 60 },
  }
}

export default config
