#!/usr/bin/env bash
# Prepara o ambiente no início de cada sessão remota (idempotente):
# instala dependências (se faltarem), garante .env de dev, gera o client
# Prisma e sincroniza o banco SQLite. Mantém a base pronta para build/test/run.
#
# RESILIÊNCIA A PROXY (ver D112): em sessões remotas o tráfego sai por um proxy
# que NÃO é respeitado pelo downloader embutido do Prisma — a baixa dos "engines"
# (query/schema) falha com ECONNRESET e deixa o container sem client gerado.
# Quando isso acontece, baixamos os engines manualmente via curl (que respeita o
# proxy/CA) e fixamos os caminhos no .env (dev-only, fora do git), de modo que o
# `prisma generate` do `npm run build` também os encontre sem rede. Em máquinas
# com rede aberta (ex.: CI), o caminho normal funciona e o fallback nem roda.
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

# CA do proxy, quando presente — usada apenas pelo fallback via curl.
CA_BUNDLE="${NODE_EXTRA_CA_CERTS:-/root/.ccr/ca-bundle.crt}"
[ -f "$CA_BUNDLE" ] || CA_BUNDLE=""

if [ ! -d node_modules ]; then
  echo "session-setup: instalando dependências..."
  # --ignore-scripts evita o postinstall do @prisma/engines, que baixa os engines
  # e pode falhar atrás do proxy; os engines são garantidos no passo seguinte.
  npm install --no-audit --no-fund --ignore-scripts
fi

# Baixa os engines do Prisma via curl e fixa os caminhos no .env. Idempotente:
# só baixa o que falta; só anexa a variável uma vez.
fetch_prisma_engines_via_curl() {
  local commit platform base dest qe se
  commit="$(node -e "process.stdout.write(require('@prisma/engines-version').enginesVersion)")"
  platform="$(node -e "require('@prisma/get-platform').getBinaryTargetForCurrentPlatform().then(p=>process.stdout.write(p))")"
  base="https://binaries.prisma.sh/all_commits/${commit}/${platform}"
  dest="node_modules/@prisma/engines"
  qe="${dest}/libquery_engine-${platform}.so.node"
  se="${dest}/schema-engine-${platform}"
  mkdir -p "$dest"

  if [ ! -f "$qe" ]; then
    echo "session-setup: baixando query engine (${platform})..."
    curl -fsSL ${CA_BUNDLE:+--cacert "$CA_BUNDLE"} "${base}/libquery_engine.so.node.gz" | gunzip > "$qe"
  fi
  if [ ! -f "$se" ]; then
    echo "session-setup: baixando schema engine (${platform})..."
    curl -fsSL ${CA_BUNDLE:+--cacert "$CA_BUNDLE"} "${base}/schema-engine.gz" | gunzip > "$se"
    chmod +x "$se"
  fi

  # Fixa os caminhos para TODA invocação seguinte do Prisma (inclusive o
  # `prisma generate` de `npm run build`), via .env que o Prisma carrega sozinho.
  grep -q '^PRISMA_QUERY_ENGINE_LIBRARY=' .env || echo "PRISMA_QUERY_ENGINE_LIBRARY=\"${PWD}/${qe}\"" >> .env
  grep -q '^PRISMA_SCHEMA_ENGINE_BINARY=' .env || echo "PRISMA_SCHEMA_ENGINE_BINARY=\"${PWD}/${se}\"" >> .env
}

# Tenta o caminho normal; só cai no fallback se a baixa embutida falhar.
if ! npx prisma generate >/dev/null 2>&1; then
  echo "session-setup: download embutido do Prisma falhou — usando fallback via curl."
  fetch_prisma_engines_via_curl
  npx prisma generate >/dev/null 2>&1 || true
fi

npx prisma db push --skip-generate >/dev/null 2>&1 || true

echo "session-setup: ambiente pronto."
