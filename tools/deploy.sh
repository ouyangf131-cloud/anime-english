#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch (GitHub Pages serves that branch).
# Adds a normal commit on top of the existing gh-pages history (no force-push).
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE=$(git remote get-url origin)
GIT=(git -c credential.helper= -c "credential.helper=!gh auth git-credential" -c user.name=ouyangf131-cloud -c user.email=343032344+ouyangf131-cloud@users.noreply.github.com)
npm run build
touch dist/.nojekyll
TMP=$(mktemp -d)
if "${GIT[@]}" clone -q --depth 1 --branch gh-pages "$REMOTE" "$TMP" 2>/dev/null; then :; else
  "${GIT[@]}" init -q -b gh-pages "$TMP"; (cd "$TMP" && git remote add origin "$REMOTE"); fi
find "$TMP" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r dist/. "$TMP"
cd "$TMP"
git add -A
if git diff --cached --quiet; then echo "No changes to deploy."; else
  "${GIT[@]}" commit -qm "Deploy $(date -u +%Y-%m-%dT%H:%MZ)"
  "${GIT[@]}" push origin gh-pages
  echo "Deployed."
fi
rm -rf "$TMP"
