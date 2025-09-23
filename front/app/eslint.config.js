import { fileURLToPath } from 'url';
import { dirname } from 'path';
import js from '@eslint/js';
import google from 'eslint-config-google';
import prettierPlugin from 'eslint-plugin-prettier';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filteredGoogleRules = { ...google.rules };
delete filteredGoogleRules['valid-jsdoc'];
delete filteredGoogleRules['require-jsdoc'];

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: 'eslint:recommended',
});

export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        CustomEvent: 'readonly',
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...filteredGoogleRules,
      'max-len': ['error', { code: 120, ignoreTemplateLiterals: true }],
      'no-tabs': 'off',
      semi: ['error', 'always'],
      'object-curly-spacing': ['error', 'always'],
      quotes: ['error', 'single'],
      indent: ['error', 2],
      camelcase: ['error', { properties: 'never' }],
      'no-undef': 'off',
      'prettier/prettier': 'error',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'server/static/', 'public/'],
  },
  ...compat.extends('plugin:prettier/recommended'),
];
