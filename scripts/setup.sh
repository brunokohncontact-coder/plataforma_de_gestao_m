#!/usr/bin/env bash
# Setup idempotente para o container efêmero das execuções remotas.
# Garante que `npm run build` e `npm test` funcionem do zero.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo 'DATABASE_URL="file:./dev.db"' > .env
fi

if [ ! -d node_modules ]; then
  echo "[setup] instalando dependências…"
  npm install
fi

echo "[setup] gerando Prisma Client…"
npx prisma generate >/dev/null

echo "[setup] aplicando schema ao SQLite…"
npx prisma db push --skip-generate >/dev/null

echo "[setup] pronto."
