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

# Next 15 needs Node 18.18 or newer; an older one fails in ways that look like
# code errors rather than a version problem.
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
echo "→ node $(node -v 2>/dev/null || echo 'not found'), npm $(npm -v 2>/dev/null || echo 'not found')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "   This needs Node 18.18 or newer. Set the Node version in hPanel and run again."
  exit 1
fi

echo "→ fetching the latest code"
git pull --ff-only

# The build itself needs typescript, tailwind and the prisma CLI, all of which
# are devDependencies — installing without them is the usual reason a deploy
# fails with "cannot find module" halfway through the build.
echo "→ installing packages (including the ones the build needs)"
npm ci --no-audit --no-fund || npm install --no-audit --no-fund

echo "→ building (this is the step Hostinger's auto-deploy leaves out)"
# The build also regenerates the database client, so new tables and columns
# are known to the running app.
NODE_OPTIONS="--max-old-space-size=${BUILD_MEMORY_MB:-2048}" npm run build

echo "→ restarting the app"
if command -v pm2 >/dev/null 2>&1 && pm2 describe design-sportswear >/dev/null 2>&1; then
  pm2 restart design-sportswear --update-env
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart all --update-env
else
  echo "   pm2 not found — restart the app from hPanel (Node.js → Restart)."
fi

echo
echo "Done. A shirt product page should now offer Individual / Team and Add to cart."
