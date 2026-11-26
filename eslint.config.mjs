import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next.js 16 removed `next lint`; this is the flat config its own template uses.
// `npm run lint` runs ESLint directly.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // build output
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // bundled output of swarm-server (npm run swarm:build); the source in lib/swarm is linted
    "swarm-server/dist/**",
    "tests/e2e/playwright-report/**",
    "tests/e2e/test-results/**",
    // Vengeance UI components are copied in from their registry and kept close
    // to upstream so they stay easy to diff and update; they are linted there,
    // not here. Everything this project wrote itself is linted.
    "components/vengeance/**",
    // scratch backups and one-off node asset generators (CommonJS scripts)
    ".backup_*/**",
    "tools/**/*.js",
  ]),
  {
    // React Compiler rules flag legacy patterns in the preserved game modes. Those modes are
    // frozen by the civilization overhaul (see docs/civilization-overhaul/MODE_PRESERVATION_MATRIX.md),
    // so they are reported as warnings until each mode gets its own refactor.
    files: [
      "components/Sandbox.tsx",
      "components/devlab/Gallery.tsx",
      "components/escaperoom/EscapeRoomMode.tsx",
      "components/sandbox/EmoteTray.tsx",
      "components/sandbox/SandboxGuide.tsx",
      "components/survival/SurvivalPrimer.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
