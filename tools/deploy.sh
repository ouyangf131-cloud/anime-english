#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch (GitHub Pages serves that branch).
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE=$(git remote get-url origin)
npm run build
touch dist/.nojekyll
TMP=$(mktemp -d)
cp -r dist/. "$TMP"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="ouyangf131-cloud" -c user.email="343032344+ouyangf131-cloud@users.noreply.github.com" commit -qm "Deploy $(date -u +%Y-%m-%dT%H:%MZ)"
git -c credential.helper= -c credential.helper='!gh auth git-credential' push -f "$REMOTE" gh-pages
rm -rf "$TMP"
echo "Deployed."
