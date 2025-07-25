const js = require('@eslint/js');
const typescript = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        console: true,
        process: true,
        module: true,
        require: true,
        __dirname: true,
        __filename: true,
        Buffer: true,
        global: true,
        setTimeout: true,
        clearTimeout: true,
        setInterval: true,
        clearInterval: true,
        setImmediate: true,
        clearImmediate: true,
        fetch: true,
        URL: true,
        TextEncoder: true,
        TextDecoder: true,
      },
    },
    plugins: {
      prettier: prettier,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        console: true,
        process: true,
        Buffer: true,
        global: true,
        setTimeout: true,
        clearTimeout: true,
        setInterval: true,
        clearInterval: true,
        setImmediate: true,
        clearImmediate: true,
        // Cloudflare Workers globals
        fetch: true,
        Request: true,
        Response: true,
        ReadableStream: true,
        ReadableStreamDefaultController: true,
        URL: true,
        TextEncoder: true,
        TextDecoder: true,
        btoa: true,
        atob: true,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier: prettier,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['eslint.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: true,
        require: true,
      },
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'coverage/', '.wrangler/', 'test-*.js'],
  },
];
