const tseslint = require('typescript-eslint');
const templateParser = require('@angular-eslint/template-parser');
const eslintPluginAngular = require('@angular-eslint/eslint-plugin');
const eslintPluginTemplateAngular = require('@angular-eslint/eslint-plugin-template');

module.exports = tseslint.config(
  {
    ignores: ['.angular/**', 'node_modules/**', 'dist/**', 'coverage/**', '**/dist/**'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
  },
  {
    files: ['src/**/*.html'],
    languageOptions: {
      parser: templateParser,
    },
    plugins: {
      '@angular-eslint/template': eslintPluginTemplateAngular,
    },
  }
);