// Vitest globalSetup: prepara um banco SQLite isolado para os testes de
// integração das server actions. Roda uma única vez antes da suíte.
//
// O `DATABASE_URL` de teste é definido em vitest.config.ts (test.env) e aponta
// para `prisma/test.db` (relativo ao schema). Aqui aplicamos o schema com
// `prisma db push --force-reset`, garantindo um banco limpo a cada execução
// sem depender do banco de desenvolvimento (`prisma/dev.db`).
import { execSync } from "node:child_process";

const TEST_DATABASE_URL = "file:./test.db";

export default function setup() {
  execSync("npx prisma db push --force-reset --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
