export default {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.js'], // target test files
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '@main': '<rootDir>/src/main.js',
    '@router': '<rootDir>/src/js/router.js',
    '@auth': '<rootDir>/src/js/auth/index.js',
    '@api': '<rootDir>/src/js/api/index.js',
    '@components/(.*)$': '<rootDir>/src/js/components/$1',
    '@utils': '<rootDir>/src/js/utils/index.js',
    '\\.(svg)(\\?url)?$': '<rootDir>/src/js/mock/svgMock.js',
  },
};
