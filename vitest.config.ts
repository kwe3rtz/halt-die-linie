import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      // Nur die headless Sim ist testrelevant genug für eine Schwelle.
      include: ["src/sim/**"],
      reportsDirectory: "./coverage",
      // Weiche Schwelle — Regressionsschutz, kein Gate für jede Zeile.
      thresholds: {
        lines: 60,
      },
    },
  },
});
