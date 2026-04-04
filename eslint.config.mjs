import rocketseatReact from '@rocketseat/eslint-config/react.mjs'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'
import globals from 'globals'

export default [
  ...rocketseatReact,

  // Prettier must come LAST to override all formatting rules
  eslintPluginPrettier,

  // Project-specific overrides
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        RequestInit: 'readonly',
        ResponseInit: 'readonly',
      },
    },
    rules: {
      // neostandard/@stylistic max-len conflicts with Prettier printWidth (100)
      '@stylistic/max-len': 'off',

      // react-hooks canary set-state-in-effect is too aggressive for existing patterns
      // (e.g., setIsClient(true) in useEffect for hydration, localStorage reads)
      'react-hooks/set-state-in-effect': 'off',

      // Allow unused vars prefixed with _ (common pattern for catch blocks)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // E2E test files — Playwright's use() is not a React hook
  {
    files: ['e2e/**/*.ts'],
    rules: {
      'no-undef': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'next-env.d.ts',
      '.next/',
      'node_modules/',
      'coverage/',
      'coverage-*/',
      'e2e/fixtures/files/',
      'playwright-report/',
      'test-results/',
    ],
  },
]
