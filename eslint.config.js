import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["src/*.{js,mjs,cjs,ts,vue}"]},
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    "env": {
      "browser": true,
      "es2022": true
    },
    "extends": [
      "plugin:vue/essential",
      "eslint:recommended"
    ],
    "plugins": [
      "vue"
    ],
    "parserOptions": {
      "ecmaVersion": 12
    },
    rules: {
      "vue/no-empty-pattern": "error",
      "no-console": "warn",
      "no-alert": "warn",
      "no-side-effects-in-computed-properties": "off",
      "no-explicit-any": "off",
      "no-case-declarations": "off",
      "ban-ts-comment": "off",
    }
  },
  {files: ["src/*.vue"], languageOptions: {parserOptions: {parser: tseslint.parser}}},
];