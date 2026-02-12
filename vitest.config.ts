import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    exclude: [...configDefaults.exclude, "test/e2e/**", "tests/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "**/*.d.ts",
        "**/*.test.*",
        "test/**",
        "node_modules/**",
        ".next/**",
      ],
      thresholds: {
        statements: 13,
        branches: 30,
        functions: 18,
        lines: 13,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
