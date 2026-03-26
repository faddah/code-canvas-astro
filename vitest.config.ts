/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./src/shared"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/test/**/*.test.ts", "src/test/**/*.test.tsx"],
    exclude: ["node_modules", "dist", "e2e"],
    coverage: {
      provider: "v8",
      include: [
        "src/hooks/**",
        "src/lib/db/**",
        "src/shared/**",
        "src/components/**",
      ],
      exclude: [
        "src/hooks/use-toast.ts",
        "src/hooks/use-mobile.tsx",
        "src/components/ui/**",
      ],
      thresholds: {
        "src/hooks/**": {
          lines: 80,
        },
        "src/lib/db/**": {
          lines: 80,
        },
        "src/shared/**": {
          lines: 80,
        },
        "src/components/**": {
          lines: 60,
        },
      },
    },
  },
});
