#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# CRM Frontend — Docker container logs (docker logs -f)
#
# Usage (from anywhere, paths are anchored to the repo root):
#   scripts/docker-logs.sh                     # follow logs of the LOCAL CRM container
#   scripts/docker-logs.sh --remote            # follow logs on the deploy server (ssh + sudo)
#   scripts/docker-logs.sh --tail 200          # extra args are passed to docker logs
#   scripts/docker-logs.sh --remote --since 10m
#   CONTAINER=my-name scripts/docker-logs.sh
# Exit with Ctrl+C.
# ============================================================

# ---------------------------------------------------------------
# CONSTANTS — edit these as needed (remote mode uses the same
# server as the deploy scripts)
# ---------------------------------------------------------------
REMOTE_USER="crm_admin"
REMOTE_HOST="94.198.217.127"
REMOTE_PORT="22"

# Local container name candidates, tried in order.
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

  # Split args: --remote is our flag, the rest go to docker logs.
  # Only shell-safe characters are allowed in pass-through args (they are
  # interpolated into the remote ssh command string).
  local use_remote=0
  local pass_args=()
  local a
  for a in "$@"; do
    case "$a" in
      --remote) use_remote=1 ;;
      -h|--help)
        sed -n '4,/^# ============================================================$/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
        exit 0
        ;;
      *)
        [[ "$a" =~ ^[A-Za-z0-9=._:%/-]+$ ]] \
          || fail "Unsafe argument for pass-through: $a\\n  Allowed: letters, digits and =._:%/- (e.g. --tail 200, --since 10m)"
        pass_args+=("$a")
        ;;
    esac
  done

  command -v ssh >/dev/null 2>&1 || fail "ssh is not available."

  if [[ "$use_remote" -eq 1 ]]; then
    # Logs of the container running on the deploy server (docker-compose.yml
    # sets container_name: crm-frontend there; CONTAINER env overrides)
    local remote_container="${CONTAINER:-crm-frontend}"
    local remote_cmd="sudo docker logs -f $remote_container"
    for a in "${pass_args[@]:-}"; do
      [[ -n "$a" ]] && remote_cmd+=" $a"
    done
    info "Following logs on $REMOTE_USER@$REMOTE_HOST:$REMOTE_PORT (Ctrl+C to stop)"
    echo ""
    exec ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "$remote_cmd"
  fi

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
  if [[ ${#pass_args[@]} -gt 0 ]]; then
    exec docker logs -f "$container" "${pass_args[@]}"
  else
    exec docker logs -f "$container"
  fi
}

main "$@"
