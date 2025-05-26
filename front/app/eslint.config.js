import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
      },
    },
    rules: {
      'require-jsdoc': 'off',
      'max-len': ['error', { code: 120, ignoreTemplateLiterals: true }],
      'no-tabs': 'off',
      'semi': ['error', 'always'],
      'object-curly-spacing': ['error', 'always'],
	  'quotes': ['error', 'single'],
	  'indent': ['error', 2],
    },
    ignores: ['node_modules/', 'dist/', 'server/static/'],
  },
];
