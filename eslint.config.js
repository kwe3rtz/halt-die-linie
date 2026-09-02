import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,js}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '../render',
            '../render/*',
            '../input',
            '../input/*',
            '../ui',
            '../ui/*',
            '@babylonjs/*',
            'babylonjs',
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'performance',
        'requestAnimationFrame',
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now' },
        { object: 'Math', property: 'random' },
        { object: 'performance', property: 'now' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='Date'][arguments.length=0]",
          message: 'Date() is not allowed in src/sim; pass dt and seed instead.',
        },
      ],
    },
  },
  eslintConfigPrettier,
);
