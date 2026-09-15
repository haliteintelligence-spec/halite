#!/usr/bin/env bash
#
# Opens a psql session against the Railway Postgres for the currently linked
# Railway environment.
#
#   ./scripts/db.sh                          interactive session
#   ./scripts/db.sh -c 'select 1'            one statement
#   ./scripts/db.sh -f query.sql             a file
#   ./scripts/db.sh --tables hallie_testing  list a schema's tables
#   ./scripts/db.sh --columns <schema.table> describe one table
#
# Uses a local psql when there is one, otherwise runs the client in Docker so
# nothing has to be installed. Everything after the flags above is handed
# straight to psql.
#
# This connects to whatever `railway status` says is linked — production by
# default. It is the real database.

set -euo pipefail

SERVICE="${RAILWAY_DB_SERVICE:-Postgres}"

die() { printf '%s\n' "$*" >&2; exit 1; }

command -v railway >/dev/null 2>&1 || die "railway CLI not found — install it, then run 'railway link'."

# DATABASE_URL resolves to postgres.railway.internal, which only exists inside
# Railway's network. From a laptop the TCP-proxy URL is the one that works.
URL="$(railway variables --service "$SERVICE" --kv 2>/dev/null \
       | sed -n 's/^DATABASE_PUBLIC_URL=//p')"
[ -n "$URL" ] || die "Could not read DATABASE_PUBLIC_URL from the '$SERVICE' service.
Run 'railway link' first, or set RAILWAY_DB_SERVICE to the service name."

ENV_NAME="$(railway status 2>/dev/null | sed -n 's/^Environment: *//p' | head -1)"
# Show where we are pointed without putting the password in the scrollback.
printf '→ %s · %s\n' "${ENV_NAME:-unknown env}" "$(printf '%s' "$URL" | sed 's#//[^@]*@#//#')" >&2

# ── Convenience queries ──────────────────────────────────────────────
ARGS=()
[ $# -gt 0 ] && ARGS=("$@")
case "${1:-}" in
  --tables)
    [ $# -ge 2 ] || die "usage: $0 --tables <schema>"
    ARGS=(-c "SELECT table_name FROM information_schema.tables
              WHERE table_schema = '$2' ORDER BY table_name")
    ;;
  --columns)
    [ $# -ge 2 ] || die "usage: $0 --columns <schema.table>"
    ARGS=(-c "SELECT ordinal_position AS n, column_name, data_type, is_nullable, column_default
              FROM information_schema.columns
              WHERE table_schema = '${2%%.*}' AND table_name = '${2#*.}'
              ORDER BY ordinal_position")
    ;;
  --schemas)
    ARGS=(-c "SELECT table_schema, count(*) AS tables FROM information_schema.tables
              WHERE table_schema NOT IN ('pg_catalog','information_schema')
              GROUP BY 1 ORDER BY 1")
    ;;
esac

# ── Local psql, if there is one ──────────────────────────────────────
if command -v psql >/dev/null 2>&1; then
  exec psql "$URL" ${ARGS[@]+"${ARGS[@]}"}
fi

command -v docker >/dev/null 2>&1 || die "Neither psql nor docker is available.
Install the client with:  brew install libpq && brew link --force libpq"

# ── Otherwise run the client in Docker ───────────────────────────────
# A -f path lives on the host, so its directory has to be mounted and the
# path rewritten to where the container can see it.
MOUNT=()
REWRITTEN=()
i=0
while [ $i -lt ${#ARGS[@]} ]; do
  arg="${ARGS[$i]}"
  if [ "$arg" = "-f" ] && [ $((i + 1)) -lt ${#ARGS[@]} ]; then
    file="${ARGS[$((i + 1))]}"
    [ -f "$file" ] || die "No such file: $file"
    dir="$(cd "$(dirname "$file")" && pwd)"
    MOUNT=(-v "$dir:/sql:ro")
    REWRITTEN+=(-f "/sql/$(basename "$file")")
    i=$((i + 2))
    continue
  fi
  REWRITTEN+=("$arg")
  i=$((i + 1))
done

# -t only when there is a terminal, so the script stays usable in a pipeline.
TTY=(-i)
[ -t 0 ] && [ -t 1 ] && TTY=(-it)

exec docker run --rm "${TTY[@]}" ${MOUNT[@]+"${MOUNT[@]}"} \
  postgres:17-alpine psql "$URL" ${REWRITTEN[@]+"${REWRITTEN[@]}"}
