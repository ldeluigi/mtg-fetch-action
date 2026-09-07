import github from 'eslint-plugin-github'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import jest from 'eslint-plugin-jest'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier/flat'
import globals from 'globals'

const githubConfigs = github.getFlatConfigs()

/** Rules shared by sources and tests. Formatting is delegated to Prettier,
 * so the stylistic typescript-eslint rules removed in v8 are not replaced. */
const commonRules = {
  // TypeScript itself reports unknown identifiers, and it understands the
  // DOM/Node lib globals that `no-undef` does not.
  'no-undef': 'off',
  'i18n-text/no-en': 'off',
  'eslint-comments/no-use': 'off',
  'import/no-namespace': 'off',
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
  '@typescript-eslint/explicit-member-accessibility': [
    'error',
    {accessibility: 'no-public'}
  ],
  '@typescript-eslint/no-require-imports': 'error',
  '@typescript-eslint/array-type': 'error',
  '@typescript-eslint/ban-ts-comment': 'error',
  camelcase: 'off',
  '@typescript-eslint/consistent-type-assertions': 'error',
  '@typescript-eslint/explicit-function-return-type': [
    'error',
    {allowExpressions: true}
  ],
  '@typescript-eslint/no-array-constructor': 'error',
  '@typescript-eslint/no-empty-object-type': 'error',
  '@typescript-eslint/no-extraneous-class': 'error',
  '@typescript-eslint/no-inferrable-types': 'error',
  '@typescript-eslint/no-misused-new': 'error',
  '@typescript-eslint/no-namespace': 'error',
  '@typescript-eslint/no-non-null-assertion': 'warn',
  '@typescript-eslint/no-useless-constructor': 'error',
  '@typescript-eslint/prefer-for-of': 'warn',
  '@typescript-eslint/prefer-function-type': 'warn',
  'no-shadow': 'off',
  '@typescript-eslint/no-shadow': 'error',
  'prettier/prettier': 'error'
}

/** Rules that need the TypeScript program, so they only run on sources. */
const typeAwareRules = {
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-for-in-array': 'error',
  '@typescript-eslint/no-unnecessary-qualifier': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/prefer-includes': 'error',
  '@typescript-eslint/prefer-string-starts-ends-with': 'error',
  '@typescript-eslint/promise-function-async': 'error',
  '@typescript-eslint/require-array-sort-compare': 'error',
  '@typescript-eslint/restrict-plus-operands': 'error',
  '@typescript-eslint/unbound-method': 'error'
}

const plugins = {
  '@typescript-eslint': tsPlugin,
  jest,
  prettier: prettierPlugin
}

export default [
  {
    // Build output and the tooling config files themselves, which are not
    // part of the action source.
    ignores: [
      'dist/',
      'lib/',
      'coverage/',
      'node_modules/',
      'jest.config.js',
      'eslint.config.mjs'
    ]
  },
  githubConfigs.recommended,
  prettierConfig,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      globals: {...globals.node},
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins,
    rules: {...commonRules, ...typeAwareRules}
  },
  {
    files: ['__tests__/**/*.ts'],
    languageOptions: {parser: tsParser, globals: {...globals.node}},
    plugins,
    rules: {...commonRules, ...jest.configs['flat/recommended'].rules}
  }
]
