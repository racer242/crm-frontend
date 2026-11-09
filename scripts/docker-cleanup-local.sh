#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# CRM Frontend — Docker cache cleanup (LOCAL machine)
#
# Images are built locally before every deploy, so the build cache
# grows HERE (tens of GB after repeated builds). This script cleans
# the LOCAL docker only. For the deploy server use
# scripts/docker-cleanup-remote.sh.
#
# Usage:
#   scripts/docker-cleanup-local.sh               # SAFE: build cache + dangling images only
#   scripts/docker-cleanup-local.sh --deep        # + docker system prune: stopped containers,
#                                                 # unused networks, unused images (NOT volumes)
#   scripts/docker-cleanup-local.sh --volumes     # implies --deep + volumes (DESTRUCTIVE:
#                                                 # deletes named volumes of ALL projects —
#                                                 # databases included); asks confirmation
#   scripts/docker-cleanup-local.sh --yes         # skip the confirmation prompt
#   scripts/docker-cleanup-local.sh --dry-run     # show the plan; nothing is deleted
#                                                 # (docker system df is read-only and still runs)
#
#   Flags combine, e.g.: scripts/docker-cleanup-local.sh --deep --yes
# ============================================================

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

  command -v docker >/dev/null 2>&1 || fail "Docker is not installed or not in PATH."

  local mode="safe"
  if [[ $deep -eq 1 ]]; then
    mode="deep"
    if [[ $volumes -eq 1 ]]; then mode="deep + volumes"; fi
  fi
  if [[ $dry_run -eq 1 ]]; then mode="$mode (dry run)"; fi

  echo ""
  echo -e "${CYAN}============================================${NC}"
  echo -e "${CYAN}  CRM Frontend — Docker cache cleanup (LOCAL)${NC}"
  echo -e "${CYAN}  host: local machine${NC}"
  echo -e "${CYAN}  mode: $mode${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""

  info "Docker disk usage (before):"
  docker system df
  echo ""

  # Build the command list. `system prune` covers the build cache and dangling
  # images as well — no need to run them separately in deep mode.
  local commands=()
  if [[ $deep -eq 1 ]]; then
    local deep_cmd="docker system prune -f"
    if [[ $volumes -eq 1 ]]; then deep_cmd+=" --volumes"; fi
    commands+=("$deep_cmd")
  else
    # SAFE default: the builder cache (the main consumer after repeated
    # builds) + dangling (untagged) images. Containers, networks, named
    # volumes and tagged images of any project are NOT touched.
    commands+=("docker builder prune -f" "docker image prune -f")
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
    for c in "${commands[@]}"; do echo "  \$ $c"; done
    ok "Nothing was deleted (dry run)."
    exit 0
  fi

  for c in "${commands[@]}"; do
    info "Running: $c"
    eval "$c" || fail "Command failed: $c"
    echo ""
  done

  info "Docker disk usage (after):"
  docker system df
  ok "Cleanup finished."
}

main "$@"