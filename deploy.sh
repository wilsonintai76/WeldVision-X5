#!/usr/bin/env bash
# WeldVision-X5 — Linux/macOS deploy script
# Equivalent of deploy.ps1 for bash environments.
#
# Usage:
#   ./deploy.sh                          # patch bump
#   ./deploy.sh minor
#   ./deploy.sh major
#   ./deploy.sh patch "My release note"
#   ./deploy.sh patch "" --skip-worker
#   ./deploy.sh patch "" --skip-frontend
#
# Arguments:
#   $1  bump type: patch (default) | minor | major
#   $2  release message (optional, default "Release vX.Y.Z")
#   --skip-worker     skip Cloudflare Worker deploy
#   --skip-frontend   skip Vite build + Pages deploy

set -euo pipefail

BUMP="patch"
MESSAGE=""
SKIP_WORKER=false
SKIP_FRONTEND=false
ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Parse arguments ───────────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    patch|minor|major) BUMP="$arg" ;;
    --skip-worker)     SKIP_WORKER=true ;;
    --skip-frontend)   SKIP_FRONTEND=true ;;
    *)                 MESSAGE="$arg" ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────
step()  { echo -e "\n\033[36m>> $*\033[0m"; }
ok()    { echo -e "   \033[32mOK\033[0m  $*"; }
warn()  { echo -e "   \033[33m!!\033[0m  $*"; }
fail()  { echo -e "\n\033[31m FAIL\033[0m  $*" >&2; exit 1; }

bump_semver() {
  local version="$1" part="$2"
  IFS='.' read -r major minor patch <<< "$version"
  case "$part" in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "${major}.$((minor + 1)).0" ;;
    patch) echo "${major}.${minor}.$((patch + 1))" ;;
    *) fail "Unknown bump type: $part" ;;
  esac
}

update_pkg_version() {
  local path="$1" newver="$2"
  [[ -f "$path" ]] || fail "package.json not found: $path"
  # Use sed to replace the "version": "x.y.z" line
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${newver}\"/" "$path"
  ok "Updated $path"
}

# ── 0. Pre-flight ─────────────────────────────────────────────────────────────
step "Pre-flight checks"

command -v npx  >/dev/null || fail "npx not found — install Node.js"
command -v git  >/dev/null || fail "git not found"

REMOTE=$(git -C "$ROOT" remote get-url origin 2>/dev/null) || fail "No git remote 'origin' found"
ok "Git remote: $REMOTE"

# ── 1. Read & bump version ────────────────────────────────────────────────────
step "Bumping version ($BUMP)"

ROOT_PKG="$ROOT/package.json"
FRONT_PKG="$ROOT/welding_server/frontend/package.json"
WORKER_PKG="$ROOT/cloud_worker/package.json"

OLD_VERSION=$(node -p "require('$ROOT_PKG').version")
NEW_VERSION=$(bump_semver "$OLD_VERSION" "$BUMP")
TAG="v${NEW_VERSION}"
[[ -n "$MESSAGE" ]] || MESSAGE="Release ${TAG}"

ok "${OLD_VERSION}  ->  ${NEW_VERSION}  (${BUMP})"

# ── 2. Show pending changes (informational) ──────────────────────────────────
step "Pending changes to be included in this release"
PENDING=$(git -C "$ROOT" status --porcelain || true)
if [[ -n "$PENDING" ]]; then
  echo "$PENDING"
else
  ok "(none — version bump only)"
fi

# ── 3. Bump versions ──────────────────────────────────────────────────────────
step "Updating package.json files to ${NEW_VERSION}"
update_pkg_version "$ROOT_PKG"    "$NEW_VERSION"
update_pkg_version "$FRONT_PKG"   "$NEW_VERSION"
update_pkg_version "$WORKER_PKG"  "$NEW_VERSION"

# ── 4. Build frontend ─────────────────────────────────────────────────────────
if [[ "$SKIP_FRONTEND" == false ]]; then
  step "Building frontend (Vite + TypeScript)"
  pushd "$ROOT/welding_server/frontend" > /dev/null
  npm run build || fail "Frontend build failed"
  popd > /dev/null
  ok "Frontend built to welding_server/frontend/dist/"
else
  warn "SkipFrontend: skipping Vite build"
fi

# ── 5. Deploy Cloudflare Worker ───────────────────────────────────────────────
if [[ "$SKIP_WORKER" == false ]]; then
  step "Deploying Cloudflare Worker  ->  api.weldvision-x5.com"
  pushd "$ROOT/cloud_worker" > /dev/null
  npx wrangler deploy || fail "Worker deployment failed"
  popd > /dev/null
  ok "Worker deployed"
else
  warn "SkipWorker: skipping worker deployment"
fi

# ── 6. Deploy frontend to Cloudflare Pages ────────────────────────────────────
if [[ "$SKIP_FRONTEND" == false ]]; then
  step "Deploying frontend  ->  Cloudflare Pages (weldvision-frontend)"
  pushd "$ROOT/welding_server/frontend" > /dev/null
  npx wrangler pages deploy dist \
    --project-name weldvision-frontend \
    --branch main \
    --commit-message "${MESSAGE}" || fail "Pages deployment failed"
  popd > /dev/null
  ok "Frontend deployed  ->  https://www.weldvision-x5.com"
else
  warn "SkipFrontend: skipping Pages deployment"
fi

# ── 7. Git commit (all changes + version bump), annotated tag, push ─────────
step "Committing all changes + version bump, tagging ${TAG}"

git -C "$ROOT" add -A
if git -C "$ROOT" diff --cached --quiet; then
  warn "Nothing to commit (all files already up to date)"
else
  git -C "$ROOT" commit -m "chore: release ${TAG} — ${MESSAGE}" || fail "git commit failed"
fi
git -C "$ROOT" tag -a "${TAG}" -m "${MESSAGE}"  || fail "git tag failed (tag ${TAG} may already exist)"
git -C "$ROOT" push origin main --follow-tags   || fail "git push failed"

ok "Pushed main + ${TAG} to GitHub"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "  \033[32mDeployed ${TAG} successfully!\033[0m"
echo    "  API:      https://api.weldvision-x5.com"
echo    "  Frontend: https://www.weldvision-x5.com"
echo    "  Tag:      ${TAG}  (\"${MESSAGE}\")"
echo ""
