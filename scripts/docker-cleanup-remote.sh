#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# CRM Frontend — Docker cleanup on the DEPLOY SERVER
#
# Nothing is built on the server (images arrive via `docker load`),
# so there is no build cache there — but every re-loaded deploy
# leaves the previous image dangling, and `docker image prune`
# reclaims that space. All docker commands run via ssh with sudo
# (same server as the deploy scripts). For the LOCAL machine use
# scripts/docker-cleanup-local.sh.
#
# Usage:
#   scripts/docker-cleanup-remote.sh              # SAFE: dangling images only
#   scripts/docker-cleanup-remote.sh --deep       # + docker system prune: stopped containers,
#                                                 # unused networks, unused images (NOT volumes)
#   scripts/docker-cleanup-remote.sh --volumes    # implies --deep + volumes (DESTRUCTIVE:
#                                                 # deletes named volumes of ALL projects —
#                                                 # databases included); asks confirmation
#   scripts/docker-cleanup-remote.sh --yes        # skip the confirmation prompt
#   scripts/docker-cleanup-remote.sh --dry-run    # show the plan; nothing is deleted
#                                                 # (docker system df is read-only and still runs)
#
#   Flags combine, e.g.: scripts/docker-cleanup-remote.sh --deep --yes
# ============================================================

# ---------------------------------------------------------------
# CONSTANTS — deploy server (same as the deploy scripts)
# ---------------------------------------------------------------
REMOTE_USER="crm_admin"
REMOTE_HOST="94.198.217.127"
REMOTE_PORT="22"

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
  local deep=0 volumes=0 yes=0 dry_run=0
  local a
  for a in "$@"; do
    case "$a" in
      --deep)    deep=1 ;;
      --volumes) volumes=1; deep=1 ;;
      --yes|-y)  yes=1 ;;
      --dry-run) dry_run=1 ;;
      -h|--help)
        sed -n '4,/^# ============================================================$/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
        exit 0
        ;;
      *) fail "Unknown option: $a (see --help)" ;;
    esac
  done

  # Local docker is not needed here — only ssh
  command -v ssh >/dev/null 2>&1 || fail "ssh is not available."

  # Run a docker command on the deploy server. The command strings are built
  # below from flags only (no user input) — safe to interpolate.
  run_docker() {
    ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "sudo $1"
  }

  local mode="safe"
  if [[ $deep -eq 1 ]]; then
    mode="deep"
    if [[ $volumes -eq 1 ]]; then mode="deep + volumes"; fi
  fi
  if [[ $dry_run -eq 1 ]]; then mode="$mode (dry run)"; fi

  echo ""
  echo -e "${CYAN}============================================${NC}"
  echo -e "${CYAN}  CRM Frontend — Docker cleanup (DEPLOY SERVER)${NC}"
  echo -e "${CYAN}  host: deploy server $REMOTE_HOST${NC}"
  echo -e "${CYAN}  mode: $mode${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""

  info "Docker disk usage (before):"
  run_docker "docker system df"
  echo ""

  # Build the command list. `system prune` covers dangling images as well —
  # no need to run them separately in deep mode. There is no build cache on
  # the server (images arrive via `docker load`), so the safe mode skips
  # `builder prune` — `image prune` removes the dangling images left behind
  # by re-loaded deploys.
  local commands=()
  if [[ $deep -eq 1 ]]; then
    local deep_cmd="docker system prune -f"
    if [[ $volumes -eq 1 ]]; then deep_cmd+=" --volumes"; fi
    commands+=("$deep_cmd")
  else
    # SAFE default: dangling (untagged) images only. Containers, networks,
    # named volumes and tagged images of any project are NOT touched.
    commands+=("docker image prune -f")
  fi

  if [[ $volumes -eq 1 && $dry_run -eq 0 && $yes -eq 0 ]]; then
    warn "--volumes deletes named volumes of ALL docker projects on this host"
    warn "(databases included) — not only the CRM frontend!"
    local answer
    read -r -p "  Type YES to continue: " answer
    if [[ "$answer" != "YES" ]]; then fail "Aborted."; fi
  fi

  if [[ $dry_run -eq 1 ]]; then
    info "Dry run — the following commands would be executed:"
    local c
    for c in "${commands[@]}"; do
      echo "  \$ ssh -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST \"sudo $c\""
    done
    ok "Nothing was deleted (dry run)."
    exit 0
  fi

  for c in "${commands[@]}"; do
    info "Running: $c"
    run_docker "$c" || fail "Command failed: $c"
    echo ""
  done

  info "Docker disk usage (after):"
  run_docker "docker system df"
  ok "Cleanup finished."
}

main "$@"