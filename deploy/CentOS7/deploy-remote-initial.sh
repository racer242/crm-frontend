#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Remote deploy script for CRM Frontend — CentOS 7 / Bitrix
# ============================================================

# ---------------------------------------------------------------
# CONSTANTS — edit these as needed
# ---------------------------------------------------------------
REMOTE_USER="crm_admin"
REMOTE_HOST="94.198.217.127"
REMOTE_PORT="22"
REMOTE_DIR="/opt/crm-frontend"

LOCAL_IMAGE_NAME="crm-frontend-crm-frontend:latest"
export HOST_PORT="${HOST_PORT:-3030}" # ДОБАВЛЕНО export для Docker Compose
DOMAIN="dev.ssd26.srv08.ru"
EXTERNAL_PORT="3003"
NGINX_CONF_SRC="./deploy/CentOS7/nginx-crm.conf"
NGINX_CONF_NAME="nginx-crm.conf"
NGINX_AVAILABLE="/etc/nginx/bx/site_avaliable"
NGINX_ENABLED="/etc/nginx/bx/site_enabled"
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
  echo -e "${CYAN}  CRM Frontend — Remote Deploy (CentOS 7)${NC}"
  echo -e "${CYAN}  Target: $REMOTE_USER@$REMOTE_HOST:$REMOTE_PORT${NC}"
  echo -e "${CYAN}  URL:    https://$DOMAIN:$EXTERNAL_PORT${NC}"
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
  docker compose build 2>&1 || fail "Docker build failed."
  ok "Docker image built."

  # Export image
  info "Exporting image to $TEMP_ARCHIVE ..."
  rm -f "$TEMP_ARCHIVE"
  docker save "$LOCAL_IMAGE_NAME" | gzip > "$TEMP_ARCHIVE" || { rm -f "$TEMP_ARCHIVE"; fail "Export failed."; }
  ok "Image exported: $(du -h "$TEMP_ARCHIVE" | cut -f1)"

  # Copy files to remote
  info "Copying files to $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR ..."
  ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "sudo mkdir -p $REMOTE_DIR && sudo chown -R $REMOTE_USER:$REMOTE_USER $REMOTE_DIR"

  scp -P "$REMOTE_PORT" "$TEMP_ARCHIVE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp image failed"
  scp -P "$REMOTE_PORT" "$COMPOSE_FILE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp compose failed"
  scp -P "$REMOTE_PORT" "$ENV_FILE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp env failed"
  
  # Проверяем наличие папок перед копированием
  if [ -d "config" ]; then scp -P "$REMOTE_PORT" -r config/ "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp config failed"; fi
  if [ -d "messages" ]; then scp -P "$REMOTE_PORT" -r messages/ "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp messages failed"; fi
  scp -P "$REMOTE_PORT" "$NGINX_CONF_SRC" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" || fail "scp nginx config failed"

  rm -f "$TEMP_ARCHIVE"
  ok "All files copied."

  # Deploy container
  info "Deploying container on remote..."
  ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" \
    "cd $REMOTE_DIR && \
     sudo docker load < $TEMP_ARCHIVE && \
     rm -f $TEMP_ARCHIVE && \
     sudo HOST_PORT=$HOST_PORT docker compose up -d && \
     echo '' && \
     sudo docker ps --filter name=crm-frontend --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" \
    || fail "Remote deployment failed."
  ok "Container started."

  # Install nginx config (Bitrix CentOS 7)
  info "Installing nginx config for Bitrix environment..."
  # ИСПРАВЛЕНО: Добавлена смена владельца конфига на root:root после копирования
  ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" \
    "sudo cp $REMOTE_DIR/$NGINX_CONF_NAME $NGINX_AVAILABLE/ && \
     sudo chown root:root $NGINX_AVAILABLE/$NGINX_CONF_NAME && \
     sudo chmod 644 $NGINX_AVAILABLE/$NGINX_CONF_NAME && \
     sudo ln -sf $NGINX_AVAILABLE/$NGINX_CONF_NAME $NGINX_ENABLED/$NGINX_CONF_NAME && \
     sudo nginx -t && sudo systemctl reload nginx" \
    || fail "Nginx config installation failed."
  ok "Nginx config installed and reloaded."

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
  echo "  Nginx config: $NGINX_AVAILABLE/$NGINX_CONF_NAME"
}

main
