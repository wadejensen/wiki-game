#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset

REPO_ROOT="$(git rev-parse --show-toplevel)"
APP_HOME="${REPO_ROOT}/app"
SCRIPTS="${REPO_ROOT}/bin"

main() {
  HOST_CONF_DIR="${APP_HOME}/conf"
  MOUNTED_CONF_DIR="/app/conf"

  CONF_FILE="${MOUNTED_CONF_DIR}/wiki.dev.json"
  SEED_FILE="${MOUNTED_CONF_DIR}/crawler_seed.txt"

  cd "${APP_HOME}"
  docker build -t wiki .

  "${SCRIPTS}/run_local_graph_db.sh"
  "${SCRIPTS}/run_local_redis.sh"

  # Pause for supporting containers to spin up
  sleep 3
  docker run -it \
    --env CONF_FILE="${CONF_FILE}" \
    --env SEED_FILE="${SEED_FILE}" \
    --env AWS_DEFAULT_REGION="ap-southeast-2" \
    --volume "${HOST_CONF_DIR}:${MOUNTED_CONF_DIR}"\
    -p 3000:3000 \
    wiki
}

main "$@"
