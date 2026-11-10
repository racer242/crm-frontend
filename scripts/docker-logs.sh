#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# CRM Frontend — container logs on the deploy server (follow)
#
# Usage:
#   scripts/docker-logs.sh        # follow the logs, exit with Ctrl+C
#
# The application runs ONLY on the deploy server: deploy-remote.sh
# builds the image locally and starts the container there, so there
# is no local container and no local mode. Any extra arguments are
# ignored — the script takes no parameters on purpose.
# ============================================================

# ---------------------------------------------------------------
# CONSTANTS — edit these as needed (same server as the deploy
# scripts)
# ---------------------------------------------------------------
REMOTE_USER="crm_admin"
REMOTE_HOST="94.198.217.127"
REMOTE_PORT="22"
CONTAINER_NAME="crm-frontend"

# ---------------------------------------------------------------
# COLORS for output
# ---------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

# ---------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------
main() {
  echo ""
  echo -e "${CYAN}============================================${NC}"
  echo -e "${CYAN}  CRM Frontend — Container Logs (follow)${NC}"
  echo -e "${CYAN}  server: $REMOTE_USER@$REMOTE_HOST:$REMOTE_PORT${NC}"
  echo -e "${CYAN}  container: $CONTAINER_NAME${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""

  command -v ssh >/dev/null 2>&1 || fail "ssh is not available."

  # Fail fast with a clear message when the server is unreachable
  # (missing ssh key / network) instead of ssh's raw error.
  info "Checking ssh connection..."
  if ! ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new \
       -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "true" 2>/dev/null; then
    fail "Cannot connect to $REMOTE_USER@$REMOTE_HOST:$REMOTE_PORT via ssh key.\n" \
         "  The deploy uses the same channel (scripts/deploy-remote.sh) — make sure\n" \
         "  your public key is added to the server's ~/.ssh/authorized_keys."
  fi
  ok "ssh connection OK."

  info "Following logs of '$CONTAINER_NAME' on $REMOTE_HOST   (Ctrl+C to stop)"
  echo ""
  exec ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" \
    "sudo docker logs -f $CONTAINER_NAME"
}

main "$@"
