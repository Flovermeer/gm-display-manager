// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/** Imports interdits selon la couche, pour garder les frontières décrites dans AGENTS.md. */
const layerRules = [
  {
    // Le domaine reste pur : ni framework, ni natif, ni couches supérieures.
    files: ['src/app/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@angular/*', '@tauri-apps/*'],
              message: 'Le domaine ne dépend ni d’Angular ni de Tauri.',
            },
            {
              group: [
                '@app/**/application/*',
                '@app/**/data-access/*',
                '@app/**/pages/*',
                '@app/**/ui/*',
              ],
              message: 'Le domaine ne dépend que d’autres modules du domaine.',
            },
          ],
        },
      ],
    },
  },
  {
    // Les pages et composants passent par application/ pour accéder aux données et au natif.
    files: ['src/app/**/pages/**/*.ts', 'src/app/**/ui/**/*.ts'],
    ignores: ['src/app/features/display/pages/**', '**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@app/**/data-access/*', '@tauri-apps/*'],
              message:
                'Une page ou un composant passe par un service ou une façade application/, pas par un repository ou un gateway.',
            },
          ],
        },
      ],
    },
  },
];

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      // Convention du projet : `type X = Readonly<{ … }>` plutôt que des interfaces.
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // Un paramètre imposé par un contrat mais inutile à une implémentation est préfixé par `_`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  ...layerRules,
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
