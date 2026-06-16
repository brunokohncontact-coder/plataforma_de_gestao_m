#!/usr/bin/env bash
# Prepara o ambiente no início de cada sessão remota (idempotente):
# instala dependências (se faltarem), garante .env de dev, gera o client
# Prisma e sincroniza o banco SQLite. Mantém a base pronta para build/test/run.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f package.json ]; then
  echo "session-setup: package.json ausente — nada a fazer (provável pré-Fase 1)."
  exit 0
fi

if [ ! -f .env ]; then
  echo 'DATABASE_URL="file:./dev.db"' > .env
  echo 'AUTH_SECRET="dev-secret-only-change-in-production-aaaaaaaaaaaaaaaaaaaa"' >> .env
  echo "session-setup: .env de desenvolvimento criado."
fi

if [ ! -d node_modules ]; then
  echo "session-setup: instalando dependências..."
  npm install --no-audit --no-fund
fi

npx prisma generate >/dev/null 2>&1 || true
npx prisma db push --skip-generate >/dev/null 2>&1 || true

echo "session-setup: ambiente pronto."
