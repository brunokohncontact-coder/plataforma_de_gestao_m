import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Banco SQLite isolado para os testes de integração das server actions.
    // O schema é aplicado uma vez no globalSetup (prisma db push). Os testes
    // que tocam o banco rodam serializados para evitar corridas no arquivo.
    env: {
      DATABASE_URL: "file:./test.db",
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
