import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "prototyp-td/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,js}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    // Die goldene Regel (siehe src/ARCHITEKTUR.md): src/sim/** ist headless.
    files: ["src/sim/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            // Renderer-, Input- und UI-Schichten — in beliebiger Verschachtelungstiefe.
            "**/render",
            "**/render/**",
            "**/input",
            "**/input/**",
            "**/ui",
            "**/ui/**",
            // Babylon in jeder Form.
            "babylonjs",
            "babylonjs/**",
            "@babylonjs/**",
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        "window",
        "document",
        "performance",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "Date",
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now" },
        { object: "Math", property: "random" },
        { object: "performance", property: "now" },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date']",
          message: "Date is not allowed in src/sim; pass dt and seed instead.",
        },
        {
          selector: "CallExpression[callee.name='Date']",
          message: "Date is not allowed in src/sim; pass dt and seed instead.",
        },
      ],
    },
  },
  eslintConfigPrettier,
);
