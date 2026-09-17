#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Remote reconfigure script for CRM Frontend — CentOS 7 / Bitrix
# ============================================================
# Updates configuration, environment, and restarts the container
# without rebuilding or reloading the Docker image.
# ============================================================

# ---------------------------------------------------------------
# CONSTANTS — edit these as needed
# ---------------------------------------------------------------
REMOTE_USER="crm_admin"
REMOTE_HOST="94.198.217.127"
REMOTE_PORT="22"
REMOTE_DIR="/opt/crm-frontend"

export HOST_PORT="${HOST_PORT:-3030}"
DOMAIN="dev.ssd26.srv08.ru"
EXTERNAL_PORT="3003"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"

# ---------------------------------------------------------------
# COLORS for output
# ---------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

# ---------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------
main() {
  echo ""
  echo -e "${CYAN}============================================${NC}"
  echo -e "${CYAN}  CRM Frontend — Remote Reconfigure (CentOS 7)${NC}"
  echo -e "${CYAN}  Target: $REMOTE_USER@$REMOTE_HOST:$REMOTE_PORT${NC}"
  echo -e "${CYAN}  URL:    https://$DOMAIN:$EXTERNAL_PORT${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""

  # Check prerequisites
  command -v scp   >/dev/null 2>&1 || fail "scp is not available."
  command -v ssh   >/dev/null 2>&1 || fail "ssh is not available."

  if ! ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
       -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "true" 2>/dev/null; then
    fail "Cannot connect to $REMOTE_USER@$REMOTE_HOST:$REMOTE_PORT via SSH key.\n" \
         "  Make sure your public key is added to the remote server's ~/.ssh/authorized_keys"
  fi
  ok "SSH connection OK."

  # Copy files to remote
  info "Copying files to $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR ..."
  ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "sudo mkdir -p $REMOTE_DIR && sudo chown -R $REMOTE_USER:$REMOTE_USER $REMOTE_DIR"

  scp -P "$REMOTE_PORT" "$COMPOSE_FILE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp compose failed"
  scp -P "$REMOTE_PORT" "$ENV_FILE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp env failed"

  if [ -d "config" ]; then scp -P "$REMOTE_PORT" -r config/ "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp config failed"; fi
  if [ -d "messages" ]; then scp -P "$REMOTE_PORT" -r messages/ "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp messages failed"; fi

  ok "All files copied."

  # Restart container
  info "Restarting container with updated configuration..."
  ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" \
    "cd $REMOTE_DIR && \
     sudo HOST_PORT=$HOST_PORT docker compose up -d && \
     echo '' && \
     sudo docker ps --filter name=crm-frontend --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" \
    || fail "Container restart failed."
  ok "Container restarted."

  # Show URL
  echo ""
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}  CRM Frontend running at:${NC}"
  echo -e "${GREEN}  https://$DOMAIN:$EXTERNAL_PORT${NC}"
  echo -e "${GREEN}============================================${NC}"
  echo ""
  echo "  Logs:     ssh -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_DIR && sudo docker compose logs -f'"
  echo "  Restart:  ssh -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_DIR && sudo docker compose restart'"
  echo "  Stop:     ssh -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_DIR && sudo docker compose down'"
  echo ""
}

main