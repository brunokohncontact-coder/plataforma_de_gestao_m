import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Banco Postgres isolado para os testes de integração das server actions.
    // O schema é aplicado uma vez no globalSetup (prisma db push). Os testes
    // que tocam o banco rodam serializados para evitar corridas entre eles.
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/palco_test",
      DIRECT_URL:
        process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/palco_test",
      AUTH_SECRET: "test-secret-not-used-in-production",
    },
    globalSetup: ["./src/test/global-setup.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
