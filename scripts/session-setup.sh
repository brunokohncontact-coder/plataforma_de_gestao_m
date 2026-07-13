#!/usr/bin/env bash
# Prepara o ambiente no início de cada sessão remota (idempotente):
# instala dependências (se faltarem), sobe um Postgres local, garante .env de
# dev, gera o client Prisma e sincroniza o schema. Mantém a base pronta para
# build/test/run. Ver DECISIONS.md D294/D305 (produção exige Postgres — dev e
# CI agora usam o mesmo banco, sem divergência de provider).
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

DEV_DB_URL="postgresql://postgres:postgres@localhost:5432/palco_dev"

# Garante o .env de dev — mas NÃO só quando ausente. Um `.env` gitignored sobrevive
# entre imagens/sessões e pode ficar OBSOLETO frente ao schema atual: o caso real é o
# `.env` de SQLite (`DATABASE_URL="file:./dev.db"`, sem `DIRECT_URL`) herdado de antes
# da migração para Postgres (D306), que passa pelo antigo guard `[ ! -f .env ]` intacto
# e quebra todo `prisma`/build da sessão com "Environment variable not found: DIRECT_URL"
# (ou provider divergente). Por isso agora REPARAMOS as chaves obrigatórias mesmo com o
# arquivo presente — de forma idempotente e sem pisar num Postgres já customizado.
touch .env

# upsert_env CHAVE VALOR: garante `CHAVE="VALOR"` no .env (adiciona se faltar,
# reescreve se já existir), preservando as demais linhas.
upsert_env() {
  local key="$1" value="$2"
  if grep -q "^${key}=" .env; then
    # Substitui a linha inteira; o valor é dev-only e não tem `#` nem `|`.
    sed -i "s|^${key}=.*|${key}=\"${value}\"|" .env
  else
    echo "${key}=\"${value}\"" >> .env
  fi
}

# DATABASE_URL: só (re)escreve quando falta ou aponta para SQLite (`file:`) — um
# Postgres válido já customizado (ex.: outra porta/host) é preservado.
current_db_url="$(sed -n 's/^DATABASE_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' .env | head -n1)"
case "$current_db_url" in
  postgres*|postgresql*) : ;; # já é Postgres — não mexe
  *)
    upsert_env DATABASE_URL "$DEV_DB_URL"
    echo "session-setup: DATABASE_URL ausente/obsoleto (SQLite) — apontado para o Postgres de dev."
    ;;
esac

# DIRECT_URL: exigido pelo schema (usado pelas migrations). Em dev, espelha
# DATABASE_URL; adiciona se faltar (o caso do .env de SQLite legado).
if ! grep -q "^DIRECT_URL=" .env; then
  db_for_direct="$(sed -n 's/^DATABASE_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' .env | head -n1)"
  upsert_env DIRECT_URL "${db_for_direct:-$DEV_DB_URL}"
  echo "session-setup: DIRECT_URL ausente — adicionado (exigido por prisma/schema.prisma)."
fi

# AUTH_SECRET: qualquer segredo de dev serve; adiciona se faltar.
grep -q "^AUTH_SECRET=" .env \
  || echo 'AUTH_SECRET="dev-secret-only-change-in-production-aaaaaaaaaaaaaaaaaaaa"' >> .env

# Sobe o Postgres local (pacote `postgresql` já instalado na imagem) e garante
# os bancos de dev/teste. Idempotente: `service start` e `CREATE DATABASE ...
# IF NOT EXISTS` não falham se já estiverem prontos.
if command -v pg_lsclusters >/dev/null 2>&1; then
  if ! pg_lsclusters 2>/dev/null | grep -q online; then
    service postgresql start >/dev/null 2>&1 || sudo service postgresql start >/dev/null 2>&1 || true
  fi
  sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" >/dev/null 2>&1 || true
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'palco_dev'" | grep -q 1 \
    || sudo -u postgres psql -c "CREATE DATABASE palco_dev;" >/dev/null 2>&1 || true
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'palco_test'" | grep -q 1 \
    || sudo -u postgres psql -c "CREATE DATABASE palco_test;" >/dev/null 2>&1 || true
else
  echo "session-setup: aviso — Postgres não encontrado nesta imagem; build/test/db precisam de DATABASE_URL apontando para um Postgres acessível."
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

# Provisiona o schema do banco de dev pelo MESMO caminho que o build/produção
# (`npm run build` roda `prisma migrate deploy`), não por `db push`: aplicar as
# migrations grava o histórico em `_prisma_migrations`, então o `migrate deploy`
# subsequente do build vira no-op ("already applied"). Usar `db push` aqui criava
# um schema SEM histórico e fazia o `migrate deploy` do build abortar com P3005
# ("database schema is not empty") num banco já populado. Idempotente: reaplicar
# migrations já aplicadas não faz nada. `db push` fica como fallback só se não
# houver migrations versionadas.
if [ -d prisma/migrations ] && ls prisma/migrations/*/migration.sql >/dev/null 2>&1; then
  npx prisma migrate deploy >/dev/null 2>&1 || true
else
  npx prisma db push --skip-generate >/dev/null 2>&1 || true
fi

echo "session-setup: ambiente pronto."
