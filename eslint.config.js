import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "artifacts/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.{js,mjs}", "scripts/**"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["src/**/*.ts"],
    ignores: ["src/domain/runRandom.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        ...[
          ["Math", "random"],
          ["crypto", "getRandomValues"],
          ["crypto", "randomUUID"],
        ].map(([object, property]) => ({
          object,
          property,
          message: "Draw from a RunRandom stream (src/domain/runRandom.ts) so ?seed= replays it.",
        })),
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.property.name='Math'][property.name=/^(RND|Between|FloatBetween|RandomXY|RandomXYZ|RandomXYZW)$/]",
          message: "Phaser's RNG is unseeded; draw from a RunRandom stream instead.",
        },
        {
          selector: "MemberExpression[property.name=/^(Shuffle|GetRandom)$/]",
          message: "Phaser's array randomizers are unseeded; draw from a RunRandom stream instead.",
        },
        {
          selector: "CallExpression[callee.property.name='shake']",
          message:
            "Phaser camera shake uses Math.random internally; use the seeded PlayScene.shakeCamera.",
        },
      ],
    },
  },
  {
    files: ["src/game/components/**/*.ts", "src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "phaser",
              message: "Components and domain helpers are Phaser-free data/logic.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "phaser",
              message: "Domain helpers are Phaser-free.",
            },
            {
              name: "bitecs",
              message: "Domain helpers must not call bitECS world APIs.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/game/sim/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "phaser", message: "The sim layer runs headless in Vitest; no Phaser." }],
          patterns: [
            {
              group: [
                "**/scenes/**",
                "**/audio/**",
                "**/storage/**",
                "**/systems/render",
                "**/systems/playerInput",
              ],
              message:
                "The sim emits SimEvents; it must not import scenes, audio, storage or Phaser bridges.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/game/scenes/**/*.ts"],
    ignores: ["src/game/scenes/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "bitecs", message: "Scenes are adapters; ECS access lives in src/game/sim." },
          ],
          patterns: [
            {
              group: [
                "**/components/*",
                "**/systems/*",
                "!**/systems/render",
                "!**/systems/playerInput",
                "!**/systems/heldKeys",
              ],
              message:
                "Scenes are adapters: read state through the sim (snapshot/overlayModel); only the render/input bridges may touch ECS.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/game/systems/**/*.ts"],
    ignores: [
      "src/game/systems/playerInput.ts",
      "src/game/systems/render.ts",
      "src/game/systems/**/*.test.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "phaser",
              message:
                "Logic systems are Phaser-free. Only playerInput.ts and render.ts may import Phaser.",
            },
          ],
        },
      ],
    },
  },
);
