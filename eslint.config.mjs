import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import react from "eslint-plugin-react";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ["**/dist/", "**/node_modules/", "**/build_app/"],
}, ...fixupConfigRules(compat.extends(
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:promise/recommended",
    "standard",
    "prettier",
    "next/core-web-vitals",
    "next",
    "next/typescript",
    "plugin:import/typescript",
    "plugin:@typescript-eslint/recommended",
)), {
    plugins: {
        react: fixupPluginRules(react),
    },

    languageOptions: {
        globals: {
            ...globals.browser,
        },

        ecmaVersion: "latest",
        sourceType: "module",
    },

    rules: {
        camelcase: "off",
        "prefer-const": "off",
        "prefer-spread": ["off"],

        "spaced-comment": ["error", "always", {
            line: {
                markers: ["/"],
                exceptions: ["-", "+", "/"],
            },

            block: {
                markers: ["!"],
                exceptions: ["*"],
                balanced: true,
            },
        }],

        "import/extensions": ["error", "ignorePackages", {
            js: "never",
            jsx: "always",
            ts: "never",
            tsx: "never",
        }],

        "object-curly-spacing": "off",
        "promise/always-return": "off",
        "promise/no-callback-in-promise": "off",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-var-requires": 0,
    },
}, {
    files: ["**/*.ts", "**/*.tsx"],

    rules: {
        "no-undef": 0,
    },
}];