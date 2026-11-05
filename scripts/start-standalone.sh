#!/bin/sh
# Serves the last `pnpm build` (next.config `output: 'standalone'`, so `next start` can't): copies
# the static files and public/ next to server.js, then runs it. Lighter on RAM than `pnpm dev`.
# Logs go to stdout; keep them with tee (CLAUDE.md, "Local server").
set -e
if [ ! -f .next/standalone/server.js ]; then
  echo "no build in .next/standalone: run pnpm build first" >&2
  exit 1
fi
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
HOSTNAME=0.0.0.0 PORT="${PORT:-3025}" exec node .next/standalone/server.js
