#!/usr/bin/env bash
# Cloud-session bootstrap (Claude Code on the web). No-op locally.
# Idempotent: pins Node from .nvmrc, installs deps and Playwright Chromium only when missing.
set -uo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "$(dirname "$0")/.."

want="$(tr -d 'v \n' < .nvmrc)"
have="$(node -v 2>/dev/null | sed 's/^v//; s/\..*//')"

if [ "$have" != "$want" ]; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash >&2
  fi
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install "$want" >&2 && nvm use "$want" >&2
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export PATH=\"$(dirname "$(nvm which "$want")"):\$PATH\"" >> "$CLAUDE_ENV_FILE"
  fi
fi

stamp=node_modules/.install-stamp
if [ ! -f "$stamp" ] || [ package-lock.json -nt "$stamp" ]; then
  npm ci >&2 && touch "$stamp"
fi

if ! ls "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"/chromium-* >/dev/null 2>&1; then
  npx playwright install --with-deps chromium >&2 || npx playwright install chromium >&2
fi

echo "pac-rogue cloud setup ready (node $(node -v))" >&2
