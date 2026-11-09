#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# CRM Frontend — Docker cache cleanup
#
# Cleans the docker host SELECTED BY THE MODE:
#   default   — the LOCAL machine (the build cache grows here:
#               images are built locally before every deploy);
#   --remote  — the DEPLOY SERVER (nothing is built there, but every
#               `docker load` leaves the previous image dangling —
#               `docker image prune` reclaims that space).
#
# Usage:
#   scripts/docker-cleanup.sh                # LOCAL, SAFE: build cache + dangling images only
#   scripts/docker-cleanup.sh --remote       # SERVER, SAFE: dangling images (no build cache there)
#   … --deep                                 # + docker system prune: stopped containers,
#                                            # unused networks, unused images (NOT volumes)
#   … --volumes                              # implies --deep + volumes (DESTRUCTIVE:
#                                            # deletes named volumes of ALL projects —
#                                            # databases included); asks confirmation
#   … --yes                                  # skip the confirmation prompt
#   … --dry-run                              # show the plan; nothing is deleted
#                                            # (docker system df is read-only and still runs)
#
#   Flags combine, e.g.: scripts/docker-cleanup.sh --remote --deep --yes
# ============================================================

# ---------------------------------------------------------------
# CONSTANTS — remote mode (same server as the deploy scripts)
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
  local remote=0 deep=0 volumes=0 yes=0 dry_run=0
  local a
  for a in "$@"; do
    case "$a" in
      --remote)  remote=1 ;;
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

  # docker is needed on the host being cleaned; ssh only in remote mode
  if [[ $remote -eq 1 ]]; then
    command -v ssh >/dev/null 2>&1 || fail "ssh is not available."
  else
    command -v docker >/dev/null 2>&1 || fail "Docker is not installed or not in PATH."
  fi

  # Run a docker command on the selected host. The command strings are built
  # below from flags only (no user input) — safe to interpolate.
  run_docker() {
    if [[ $remote -eq 1 ]]; then
      ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "sudo $1"
    else
      eval "$1"
    fi
  }

  local where="local machine"
  if [[ $remote -eq 1 ]]; then where="deploy server $REMOTE_HOST"; fi

  local mode="safe"
  if [[ $deep -eq 1 ]]; then
    mode="deep"
    if [[ $volumes -eq 1 ]]; then mode="deep + volumes"; fi
  fi
  if [[ $dry_run -eq 1 ]]; then mode="$mode (dry run)"; fi

  echo ""
  echo -e "${CYAN}============================================${NC}"
  echo -e "${CYAN}  CRM Frontend — Docker cache cleanup${NC}"
  echo -e "${CYAN}  host: $where${NC}"
  echo -e "${CYAN}  mode: $mode${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""

  info "Docker disk usage (before):"
  run_docker "docker system df"
  echo ""

  # Build the command list. `system prune` covers the build cache and dangling
  # images as well — no need to run them separately in deep mode. The server
  # has no build cache (images arrive via `docker load`, not `build`), so the
  # remote safe mode skips `builder prune` — `image prune` removes the
  # dangling images left behind by re-loaded deploys.
  local commands=()
  if [[ $deep -eq 1 ]]; then
    local deep_cmd="docker system prune -f"
    if [[ $volumes -eq 1 ]]; then deep_cmd+=" --volumes"; fi
    commands+=("$deep_cmd")
  elif [[ $remote -eq 1 ]]; then
    commands+=("docker image prune -f")
  else
    # SAFE default, local: the builder cache (the main consumer after
    # repeated builds) + dangling (untagged) images. Containers, networks,
    # named volumes and tagged images of any project are NOT touched.
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
    for c in "${commands[@]}"; do
      if [[ $remote -eq 1 ]]; then
        echo "  \$ ssh -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST \"sudo $c\""
      else
        echo "  \$ $c"
      fi
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
