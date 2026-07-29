import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Ignore build output and generated files
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // React plugin – flat config equivalents of plugin:react/recommended
  // and plugin:react/jsx-runtime
  {
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat['jsx-runtime'],
    settings: {
      react: { version: '18.2' },
    },
  },

  // Global language options (replaces "env" + "parserOptions")
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
  },

  // Node.js + Vitest globals for test files, relaxed unused-vars
  // (tests often import components rendered indirectly via <App />)
  {
    files: ['test/**/*.js', 'test/**/*.jsx'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },

  // Project-level rule overrides
  {
    rules: {
      'react/prop-types': 'off',
    },
  },

  // Prettier – must be last to disable conflicting formatting rules
  prettierConfig,
];
