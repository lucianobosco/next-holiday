import js from "@eslint/js";
import ts from "typescript-eslint";
import astro from "eslint-plugin-astro";
import globals from "globals";

export default [
  { ignores: ["dist/**", ".astro/**", ".wrangler/**", "coverage/**", "node_modules/**"] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ["**/*.{ts,tsx,astro,mjs}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // Apps Script is not part of the site build: it runs inside Google's editor, where
    // the globals are Google's and the entry points are called by Google rather than by
    // anything in this repository -- so neither "undefined" nor "unused" means here what
    // it means in the rest of the tree.
    files: ["apps-script/**/*.gs", "apps-script/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ContentService: "readonly",
        Logger: "readonly",
        SpreadsheetApp: "readonly",
        UrlFetchApp: "readonly",
      },
    },
    rules: { "@typescript-eslint/no-unused-vars": "off", "no-unused-vars": "off" },
  },
];
