#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# CRM Frontend — Remote Docker Logs (docker logs -f)
# Usage:
#   ./remote-docker-logs.sh                 # follow logs of the CRM container
#   ./remote-docker-logs.sh --tail 200      # extra args are passed to docker logs
#   ./remote-docker-logs.sh --since 10m
#   CONTAINER=my-name ./remote-docker-logs.sh
# Exit with Ctrl+C.
# ============================================================

# ---------------------------------------------------------------
# CONSTANTS — edit these as needed
# ---------------------------------------------------------------
# Container name candidates, tried in order.
# NOTE: "crm-frontend-crm-frontend" is the IMAGE name (compose default
# <project>-<service>); the CONTAINER itself is named "crm-frontend"
# (docker-compose.yml: container_name). Both are accepted here.
NAME_CANDIDATES=("crm-frontend" "crm-frontend-crm-frontend")
# Fallback pattern if none of the candidates is found
NAME_PATTERN="crm-frontend"

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
  echo -e "${CYAN}  CRM Frontend — Container Logs (follow)${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""

  command -v docker >/dev/null 2>&1 || fail "Docker is not installed or not in PATH."

  # Resolve container name:
  # 1) explicit override (env CONTAINER)
  # 2) candidates in order: "crm-frontend" (compose container_name),
  #    "crm-frontend-crm-frontend" (same string as the compose image name)
  # 3) unique container matching the pattern (covers -1 suffixed names)
  local container=""
  if [[ -n "${CONTAINER:-}" ]]; then
    container="$CONTAINER"
    info "Using container from CONTAINER env: $container"
  else
    local c name
    for c in "${NAME_CANDIDATES[@]}"; do
      if docker ps -a --format '{{.Names}}' | grep -qx "$c"; then
        container="$c"
        break
      fi
    done
    if [[ -z "$container" ]]; then
      local candidates
      candidates="$(docker ps -a --format '{{.Names}}' | grep -- "$NAME_PATTERN" || true)"
      local count
      count="$(echo "$candidates" | grep -c . || true)"
      if [[ "$count" -eq 1 ]]; then
        container="$candidates"
        warn "None of the known names found, using single pattern match: $container"
      else
        echo ""
        fail "No container from the known names found (${NAME_CANDIDATES[*]}) and pattern '$NAME_PATTERN' is ambiguous or empty.\n" \
             "  Found: ${candidates:-<none>}\n" \
             "  Run:   docker ps -a --format '{{.Names}}'\n" \
             "  Then:  CONTAINER=<name> $0"
      fi
    fi
  fi
  ok "Container: $container"

  docker ps --format '{{.Names}}' | grep -qx "$container" \
    || warn "Container '$container' is not running — logs will end immediately (no -f stream)."

  info "Following logs of container: $container   (Ctrl+C to stop)"
  echo ""
  exec docker logs -f "$container" "$@"
}

main "$@"
