#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Remote deploy script for CRM Frontend
#
# Builds Docker image locally, copies it + config to remote
# server via SSH, installs Docker if needed, and starts
# the container.
#
# Usage:
#   ./deploy-remote.sh
#
# Prerequisites:
#   - SSH key must be added to remote server
#   - Docker Desktop (or Docker) must be running locally
# ============================================================

# ---------------------------------------------------------------
# CONSTANTS — edit these as needed
# ---------------------------------------------------------------
REMOTE_USER="root"
REMOTE_HOST="94.198.217.127"
REMOTE_PORT="22"
REMOTE_DIR="/opt/crm-frontend"

LOCAL_IMAGE_NAME="crm-frontend-crm-frontend:latest"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"
TEMP_ARCHIVE="crm-image.tar.gz"

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
  echo -e "${CYAN}  CRM Frontend — Remote Deploy${NC}"
  echo -e "${CYAN}  Target: $REMOTE_USER@$REMOTE_HOST:$REMOTE_PORT${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""

  # Check prerequisites
  command -v docker >/dev/null 2>&1 || fail "Docker is not installed locally."
  command -v scp   >/dev/null 2>&1 || fail "scp is not available."
  command -v ssh   >/dev/null 2>&1 || fail "ssh is not available."

  if ! ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
       -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "true" 2>/dev/null; then
    fail "Cannot connect to $REMOTE_USER@$REMOTE_HOST:$REMOTE_PORT via SSH key.\n" \
         "  Make sure your public key is added to the remote server's ~/.ssh/authorized_keys"
  fi
  ok "SSH connection OK."

  # Build Docker image
  info "Building Docker image..."
  docker compose build --quiet 2>&1 || fail "Docker build failed."
  ok "Docker image built."

  # Export image
  info "Exporting image to $TEMP_ARCHIVE ..."
  rm -f "$TEMP_ARCHIVE"
  docker save "$LOCAL_IMAGE_NAME" | gzip > "$TEMP_ARCHIVE" || { rm -f "$TEMP_ARCHIVE"; fail "Export failed."; }
  ok "Image exported: $(du -h "$TEMP_ARCHIVE" | cut -f1)"

  # Copy files to remote
  info "Copying files to $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR ..."
  ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_DIR"

  scp -P "$REMOTE_PORT" "$TEMP_ARCHIVE" \
    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp image failed"
  scp -P "$REMOTE_PORT" "$COMPOSE_FILE" \
    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp compose failed"
  scp -P "$REMOTE_PORT" "$ENV_FILE" \
    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp env failed"
  scp -P "$REMOTE_PORT" -r config/ \
    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp config failed"
  scp -P "$REMOTE_PORT" -r messages/ \
    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp messages failed"

  rm -f "$TEMP_ARCHIVE"
  ok "All files copied."

  # Install Docker on remote if needed
  info "Checking Docker on remote..."
  if ! ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" \
       "command -v docker && docker --version" 2>/dev/null; then
    warn "Installing Docker on remote..."
    ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" \
      "curl -fsSL https://get.docker.com -o /tmp/get-docker.sh && \
       sh /tmp/get-docker.sh && \
       systemctl enable docker && \
       systemctl start docker" || fail "Docker install failed."
    ok "Docker installed."
  else
    ok "Docker already installed."
  fi

  # Deploy
  info "Deploying container on remote..."
  ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" \
    "cd $REMOTE_DIR && \
     docker load < crm-image.tar.gz && \
     rm -f crm-image.tar.gz && \
     docker compose up -d && \
     echo '' && \
     docker ps --filter name=crm-frontend --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" \
    || fail "Remote deployment failed."
  ok "Container started."

  # Show URL
  local host_port="${HOST_PORT:-3028}"
  echo ""
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}  CRM Frontend running at:${NC}"
  echo -e "${GREEN}  http://$REMOTE_HOST:$host_port${NC}"
  echo -e "${GREEN}============================================${NC}"
  echo ""
  echo "  Logs:     ssh -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_DIR && docker compose logs -f'"
  echo "  Restart:  ssh -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_DIR && docker compose restart'"
  echo "  Stop:     ssh -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_DIR && docker compose down'"
}

main