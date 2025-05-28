import js from '@eslint/js';
import google from 'eslint-config-google';

const filteredGoogleRules = { ...google.rules };
delete filteredGoogleRules['valid-jsdoc'];
delete filteredGoogleRules['require-jsdoc'];

export default [
  {
    files: ['src/**/*.js'],
    ignores: ['node_modules/', 'dist/', 'server/static/'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        CustomEvent: 'readonly',
      },
    },
    rules: {
      ...filteredGoogleRules,
      'max-len': ['error', { code: 120, ignoreTemplateLiterals: true }],
      'no-tabs': 'off',
      'semi': ['error', 'always'],
      'object-curly-spacing': ['error', 'always'],
	    'quotes': ['error', 'single'],
	    'indent': ['error', 2],
      'camelcase': ['error', { properties: 'never' }],
      'no-undef': 'off',
    },
  },
];
