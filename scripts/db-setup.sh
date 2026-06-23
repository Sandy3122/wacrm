#!/usr/bin/env bash
# Backward-compatible alias — prefer: npm run db:migrate
exec "$(dirname "$0")/db-migrate.sh" migrate "$@"
