"use strict";

module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  parserOptions: {
    parser: "@typescript-eslint/parser",
  },
  plugins: ["@typescript-eslint", "prettier"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "eslint-config-prettier",
  ],
  rules: {
    "@typescript-eslint/ban-ts-comment": 1,
    "@typescript-eslint/member-ordering": 1,
    "@typescript-eslint/no-non-null-assertion": 0,
    "@typescript-eslint/no-unused-vars": [1, { argsIgnorePattern: "^_" }],
    "no-console": 1,
    "no-debugger": 1,
    "prettier/prettier": 2,
  },
  ignorePatterns: ["node_modules", "dist", "out"],
  overrides: [
    {
      files: ["./**/*.js", "./**/*.cjs", "./**/*.mjs"],
      env: {
        node: true,
      },
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "eslint-config-prettier",
      ],
      rules: {
        "@typescript-eslint/explicit-module-boundary-types": 0,
      },
    },
    {
      files: ["./**/*.test.{j,t}s"],
      env: {
        jest: true,
      },
    },
  ],
};
