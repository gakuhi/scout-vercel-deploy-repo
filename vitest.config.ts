import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "json"],
      exclude: [
        "node_modules/",
        ".next/",
        "*.config.*",
        "src/instrumentation*",
        "sentry.*",
        "src/app/**",
        "src/shared/types/**",
        "src/test/**",
        "src/components/ui/**",
      ],
      // @ts-expect-error -- all/include are valid v8 runtime options but missing from Vitest v4 types
      all: true,
      include: ["src/**/*.{ts,tsx}"],
      // Phase 1: 15/15/15 → Phase 2: 30/30/20 → Phase 3: 50/50/35 → Phase 4: 70/70/50
      thresholds: {
        lines: 15,
        functions: 15,
        branches: 15,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
