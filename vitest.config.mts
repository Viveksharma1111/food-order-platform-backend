import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

const result = loadEnv({ path: ".env.test", override: true });
if (result.error) {
  throw new Error("Create .env.test from .env.test.example before running tests.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || decodeURIComponent(new URL(databaseUrl).pathname.slice(1)) !== "food_order_platform_test") {
  throw new Error("Tests require DATABASE_URL to point exactly to the isolated food_order_platform_test database.");
}

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30_000,
  },
});
