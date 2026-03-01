import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/firestore.rules.spec.ts"],
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
