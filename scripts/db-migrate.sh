#!/usr/bin/env bash
# Apply or inspect Supabase migrations against the project in NEXT_PUBLIC_SUPABASE_URL.
#
# Uses a direct Postgres connection — does NOT require `supabase link`
# to match (useful when the CLI is logged into a different account).
#
# Prerequisites (.env.local):
#   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
#   SUPABASE_DB_PASSWORD=<database password from Dashboard → Database>
#
# Usage:
#   npm run db:migrate                  # apply pending migrations
#   npm run db:migration:status         # list local vs remote
#
# Optional overrides (use when direct db.<ref>.supabase.co fails — e.g. IPv6
# "no route to host" on your network):
#   SUPABASE_DB_REGION=ap-south-1
#     → session pooler at aws-0-<region>.pooler.supabase.com (IPv4-friendly)
#   SUPABASE_DB_POOLER_HOST=aws-1-ap-south-1.pooler.supabase.com
#     → override pooler hostname from Dashboard if it differs from aws-0-*
#   SUPABASE_DB_URL=postgresql://postgres.<ref>:PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" && -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_PASSWORD is not set."
  echo ""
  echo "Add it to .env.local:"
  echo "  SUPABASE_DB_PASSWORD=your-database-password"
  echo ""
  echo "Find or reset the password in Supabase Dashboard:"
  echo "  Project Settings → Database → Database password"
  exit 1
fi

if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL is not set in .env.local"
  exit 1
fi

PROJECT_REF="$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|')"

if [[ -z "$PROJECT_REF" || "$PROJECT_REF" == "$NEXT_PUBLIC_SUPABASE_URL" ]]; then
  echo "ERROR: Could not parse project ref from NEXT_PUBLIC_SUPABASE_URL"
  exit 1
fi

LINKED_REF=""
if [[ -f supabase/.temp/project-ref ]]; then
  LINKED_REF="$(tr -d '[:space:]' < supabase/.temp/project-ref)"
fi

if [[ -n "$LINKED_REF" && "$LINKED_REF" != "$PROJECT_REF" ]]; then
  echo "Note: CLI is linked to '$LINKED_REF' but targeting '$PROJECT_REF' via database URL."
  echo "      (No need to run supabase link for this project.)"
  echo ""
fi

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  DB_URL="$SUPABASE_DB_URL"
elif [[ -n "${SUPABASE_DB_REGION:-}" ]]; then
  ENCODED_PASSWORD="$(python3 -c "import urllib.parse, os; print(urllib.parse.quote(os.environ['SUPABASE_DB_PASSWORD'], safe=''))")"
  POOLER_HOST="${SUPABASE_DB_POOLER_HOST:-aws-0-${SUPABASE_DB_REGION}.pooler.supabase.com}"
  DB_URL="postgresql://postgres.${PROJECT_REF}:${ENCODED_PASSWORD}@${POOLER_HOST}:5432/postgres"
  echo "Using session pooler: ${POOLER_HOST}"
  echo ""
else
  ENCODED_PASSWORD="$(python3 -c "import urllib.parse, os; print(urllib.parse.quote(os.environ['SUPABASE_DB_PASSWORD'], safe=''))")"
  DB_URL="postgresql://postgres:${ENCODED_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
fi

COMMAND="${1:-migrate}"

case "$COMMAND" in
  migrate|push|setup)
    echo "Pushing migrations to project: $PROJECT_REF"
    echo ""
    npx supabase migration list --db-url "$DB_URL" || true
    echo ""
    npx supabase db push --db-url "$DB_URL" --yes
    echo ""
    echo "Done. Migrations applied to $PROJECT_REF."
    echo "Restart the dev server if it is running: npm run dev"
    ;;
  status|list)
    echo "Migration status for project: $PROJECT_REF"
    echo ""
    npx supabase migration list --db-url "$DB_URL"
    ;;
  *)
    echo "Unknown command: $COMMAND"
    echo ""
    echo "Usage:"
    echo "  npm run db:migrate"
    echo "  npm run db:migration:status"
    exit 1
    ;;
esac
