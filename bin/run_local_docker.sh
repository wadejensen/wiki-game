#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset

REPO_ROOT="$(git rev-parse --show-toplevel)"
APP_HOME="${REPO_ROOT}/app"
SCRIPTS="${REPO_ROOT}/bin"

PROG=$(basename "$0")

usage() {
  cat <<EOF
Usage: "${PROG}" [dev|prod]
Switching between "dev", "staging", and "prod" flavors uses different config files for
local and remote deployment.

dev:
    * Local nodejs server process (port 3000),
    * Local redis server process (port 6379),
    * Local docker container gremlin server process (docker port 8182, host port 8182),
staging:
    * Local docker container nodejs server process (docker port 3000, host port 3000),
    * Local redis server process (port 6379),
    * Local docker container gremlin server process (docker port 8182, host port 8182),
EOF
}

main() {
  if [[ "$#" != 1 ]]; then
    usage
    exit 1
  fi
  local flavor="$1"

  HOST_CONF_DIR="${APP_HOME}/conf"
  MOUNTED_CONF_DIR="/app/conf"

  CONF_FILE="${MOUNTED_CONF_DIR}/wiki.${flavor}.json"
  SEED_FILE="${MOUNTED_CONF_DIR}/crawler_seed.txt"

  cd "${APP_HOME}"
  docker build -t wiki .

  "${SCRIPTS}/run_local_graph_db.sh"
  "${SCRIPTS}/run_local_redis.sh"

  # Pause for supporting containers to spin up
  sleep 2
  docker run -it \
    --env CONF_FILE="${CONF_FILE}" \
    --env SEED_FILE="${SEED_FILE}" \
    --volume "${HOST_CONF_DIR}:${MOUNTED_CONF_DIR}"\
    -p 3000:3000 \
    wiki
}

main "$@"
