#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
APP_HOME="${REPO_ROOT}/app"
SCRIPTS="${REPO_ROOT}/bin"

main() {
  local webpack_mode="dev"

  CONF_DIR="${APP_HOME}/conf"
  CONF_FILE="${CONF_DIR}/wiki.local.json"
  SEED_FILE="${CONF_DIR}/crawler_seed.txt"

  cd "${APP_HOME}"

  "${SCRIPTS}/run_local_graph_db.sh"
  "${SCRIPTS}/run_local_redis.sh"

  # Pause for supporting containers to spin up
  sleep 2

  # Build frontend in watch mode
  nodemon \
    --ignore dist \
    --ignore server \
    --watch web/ \
    --ext "ts,html,css" \
    --exec "npm run build:web:${webpack_mode}" &

  # Build and deploy backend in watch mode
  nodemon \
    --ignore dist \
    --ignore static \
    --ignore web \
    --watch server/src \
    --ext ts \
    --exec "npm run build:server:${webpack_mode} && ../bin/run_local_graph_db.sh && CONF_FILE=${CONF_FILE} SEED_FILE=${SEED_FILE} npm run deploy"
}

main "$@"
