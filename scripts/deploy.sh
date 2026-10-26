#!/usr/bin/env bash
#
# Puts the latest code live on Hostinger.
#
# Hostinger's Git auto-deployment only pulls the files. A Next.js site is
# compiled, so new code sits on the server doing nothing until it is built and
# the app restarted — which is what this does.
#
# Run it from the site folder on the server:
#
#     bash scripts/deploy.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."
echo "→ in $(pwd)"

echo "→ fetching the latest code"
git pull --ff-only

echo "→ installing packages"
# npm ci needs the lockfile to match package.json; fall back when it does not.
npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

echo "→ building (this is the step that was missing)"
# The build also regenerates the database client, so new columns are known.
NODE_OPTIONS="--max-old-space-size=2048" npm run build

echo "→ restarting the app"
if command -v pm2 >/dev/null 2>&1 && pm2 describe design-sportswear >/dev/null 2>&1; then
  pm2 restart design-sportswear --update-env
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart all --update-env
else
  echo "   pm2 not found — restart the app from hPanel (Node.js → Restart)."
fi

echo
echo "Done. Check a product page for the Individual / Team choice to confirm it took."
