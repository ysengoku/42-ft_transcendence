export default {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.js'], // target test files
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@main$': '<rootDir>/src/main.js',
    '^@router$': '<rootDir>/src/js/router.js',
    '^@socket$': '<rootDir>/src/js/sockets/index.js',
    '^@auth$': '<rootDir>/src/js/auth/index.js',
    '^@api$': '<rootDir>/src/js/api/index.js',
    '^@components/(.*)$': '<rootDir>/src/js/components/$1',
    '^@utils$': '<rootDir>/src/js/utils/index.js',
    '^@mock/(.*)$': '<rootDir>/__mock__/$1',
    '\\.css$': '<rootDir>/__mock__/styleMock.js',
    '\\.(svg)(\\?url)?$': '<rootDir>/__mock__/svgMock.js',
    '\\.(png|jpg|jpeg|gif|svg)(\\?.*)?$': '<rootDir>/__mock__/fileMock.js',
  },
};
