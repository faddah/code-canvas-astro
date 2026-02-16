import js from '@eslint/js';

/**
 * ESLint Configuration for code-canvas-astro
 *
 * Current setup: JavaScript files only
 *
 * To enable TypeScript linting, install these packages:
 *   npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin
 *
 * Then uncomment the TypeScript configuration section below.
 */

export default [
  // Apply recommended rules to all JS/TS files
  js.configs.recommended,

  {
    // Global ignores
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.astro/**',
      '**/venv/**',
      '**/*.min.js',
      '**/package-lock.json',
      '**/taskManagement.db',
      // Temporarily ignore TypeScript files until TypeScript ESLint parser is installed
      '**/*.ts',
      '**/*.tsx',
      // Temporarily ignore Astro files until eslint-plugin-astro is installed
      '**/*.astro',
    ],
  },

  {
    // Configuration for JavaScript files only (not TypeScript)
    files: ['**/*.js', '**/*.mjs', '**/*.jsx'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        // Node.js globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        // Astro globals
        Astro: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
      // Error prevention
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-undef': 'error',

      // Best practices
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-duplicate-imports': 'error',

      // Code style (minimal - you can add more as needed)
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },

  {
    // Special configuration for CommonJS files
    files: ['**/*.cjs', '**/server/**/*.js', '**/lambda-handler.js'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        // CommonJS/Node.js globals
        require: 'readonly',
        exports: 'writable',
        module: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
        global: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
      },
    },

    rules: {
      // Allow console in CommonJS files (often server/build files)
      'no-console': 'off',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },

  {
    // Relaxed rules for config files
    files: ['**/*.config.js', '**/*.config.mjs', '**/*.config.cjs', '**/*.config.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  {
    // Special handling for .astro files (basic support)
    files: ['**/*.astro'],
    rules: {
      // Relax some rules for Astro files
      'no-unused-vars': 'off',
    },
  },

  /**
   * TYPESCRIPT CONFIGURATION (currently disabled)
   *
   * Uncomment this section after installing TypeScript ESLint:
   *   npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin
   *
   * Also remove '**\/*.ts' and '**\/*.tsx' from the ignores array above.
   */

  // {
  //   files: ['**/*.ts', '**/*.tsx'],
  //
  //   languageOptions: {
  //     parser: await import('@typescript-eslint/parser').then(m => m.default),
  //     parserOptions: {
  //       ecmaVersion: 'latest',
  //       sourceType: 'module',
  //       ecmaFeatures: {
  //         jsx: true,
  //       },
  //       project: './tsconfig.json',
  //     },
  //     globals: {
  //       window: 'readonly',
  //       document: 'readonly',
  //       navigator: 'readonly',
  //       console: 'readonly',
  //       Astro: 'readonly',
  //     },
  //   },
  //
  //   plugins: {
  //     '@typescript-eslint': await import('@typescript-eslint/eslint-plugin').then(m => m.default),
  //   },
  //
  //   rules: {
  //     // Disable base rules that are replaced by TypeScript-specific ones
  //     'no-unused-vars': 'off',
  //     'no-undef': 'off',
  //
  //     // TypeScript-specific rules
  //     '@typescript-eslint/no-unused-vars': ['error', {
  //       argsIgnorePattern: '^_',
  //       varsIgnorePattern: '^_',
  //       caughtErrorsIgnorePattern: '^_',
  //     }],
  //     '@typescript-eslint/no-explicit-any': 'warn',
  //     '@typescript-eslint/consistent-type-imports': ['error', {
  //       prefer: 'type-imports',
  //     }],
  //
  //     // Style rules
  //     'semi': ['error', 'always'],
  //     'quotes': ['error', 'single', { avoidEscape: true }],
  //     'comma-dangle': ['error', 'always-multiline'],
  //   },
  // },
];
