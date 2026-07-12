// Vitest globalSetup: prepara um banco Postgres isolado para os testes de
// integração das server actions. Roda uma única vez antes da suíte.
//
// O `DATABASE_URL`/`DIRECT_URL` de teste são definidos em vitest.config.ts
// (test.env) e apontam para um banco Postgres local dedicado (`palco_test`).
// Aqui aplicamos o schema com `prisma db push --force-reset`, garantindo um
// banco limpo a cada execução sem depender do banco de desenvolvimento
// (`palco_dev`).
import { execSync } from "node:child_process";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/palco_test";

export default function setup() {
  execSync("npx prisma db push --force-reset --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL },
  });
}
