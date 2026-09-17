#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# CRM Frontend — follow container logs (docker logs -f)
# Usage:
#   ./logs.sh                 # follow logs of the CRM container
#   ./logs.sh --tail 200      # extra args are passed to docker logs
#   ./logs.sh --since 10m
#   CONTAINER=my-name ./logs.sh
# Exit with Ctrl+C.
# ============================================================

# ---------------------------------------------------------------
# CONSTANTS — edit these as needed
# ---------------------------------------------------------------
# Preferred container name (docker-compose.yml: container_name)
DEFAULT_CONTAINER="crm-frontend"
# Fallback pattern if the preferred name is not found
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
  # 1) explicit override (env CONTAINER or $1 when it is a name, not a docker logs flag)
  # 2) compose container_name ("crm-frontend")
  # 3) unique container matching the pattern (covers crm-frontend-crm-frontend / -1 suffixed names)
  local container=""
  if [[ -n "${CONTAINER:-}" ]]; then
    container="$CONTAINER"
    info "Using container from CONTAINER env: $container"
  elif docker ps -a --format '{{.Names}}' | grep -qx "$DEFAULT_CONTAINER"; then
    container="$DEFAULT_CONTAINER"
  else
    local candidates
    candidates="$(docker ps -a --format '{{.Names}}' | grep -- "$NAME_PATTERN" || true)"
    local count
    count="$(echo "$candidates" | grep -c . || true)"
    if [[ "$count" -eq 1 ]]; then
      container="$candidates"
      warn "Container '$DEFAULT_CONTAINER' not found, using single match: $container"
    else
      echo ""
      fail "Container '$DEFAULT_CONTAINER' not found and name pattern '$NAME_PATTERN' is ambiguous or empty.\n" \
           "  Found: ${candidates:-<none>}\n" \
           "  Run:   docker ps -a --format '{{.Names}}'\n" \
           "  Then:  CONTAINER=<name> ./logs.sh"
    fi
  fi

  docker ps --format '{{.Names}}' | grep -qx "$container" \
    || warn "Container '$container' is not running — logs will end immediately (no -f stream)."

  info "Following logs of container: $container   (Ctrl+C to stop)"
  echo ""
  exec docker logs -f "$container" "$@"
}

main "$@"
