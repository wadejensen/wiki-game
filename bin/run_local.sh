#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
APP_HOME="${REPO_ROOT}/app"

CRAWLER_SEED_FILE="${APP_HOME}/server/src/main/resources/crawler_seed.txt"
DB_CONF_FILE="${APP_HOME}/server/src/main/resources/gremlin.local.json"

PROG=$(basename "$0")

usage() {
  cat <<EOF
Usage: "${PROG}" [dev|prod]
Switching between "dev" and "prod" toggles webpack build optimization settings
EOF
}

main() {
  if [[ "$#" != 1 ]]; then
    usage
    exit 1
  fi

  local webpack_mode
  webpack_mode=$1

  if [[ "${webpack_mode}" != "dev" && "${webpack_mode}" != "prod" ]]; then
    usage
    exit 1
  fi

  cd "${APP_HOME}"

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
    --exec "npm run build:server:${webpack_mode} && ../bin/run_local_graph_db.sh && npm run deploy --inpect -- --seed-file ${CRAWLER_SEED_FILE} --db-conf-file ${DB_CONF_FILE}"
}

main "$@"
