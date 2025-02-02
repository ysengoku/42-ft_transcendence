export default {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.js'], // target test files
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '@main': '<rootDir>/src/main.js',
    '@router': '<rootDir>/src/js/router.js',
    '@api': '<rootDir>/src/js/api/',
    '@components': '<rootDir>/src/js/components/',
    '@utils': '<rootDir>/src/js/utils/',
  },
};
