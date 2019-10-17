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

local:
    * Local nodejs server process (port 3000),
    * Local redis server process (port 6379),
    * Local docker container gremlin server process (docker port 8182, host port 8182),
dev:
    * Local docker container nodejs server process (docker port 3000, host port 3000),
    * Remote AWS Elasticache Redis,
    * Remote AWS Neptune Graph DB,
staging:
    * Single node EC2 instance running docker container nodejs server process
      (docker port 3000, host port 3000),
    * Remote AWS Elasticache Redis,
    * Remote AWS Neptune Graph DB,
prod:
  * ASG of EC2 instances behind a load balancer. All running docker container
    nodejs server process (docker port 3000, host port 3000),
  * Remote AWS Elasticache Redis,
  * Remote AWS Neptune Graph DB,
EOF
}

main() {
  if [[ "$#" != 1 ]]; then
    usage
    exit 1
  fi

  local flavor="$1"

  if [[ "${flavor}" == "local" ]]; then
    "${SCRIPTS}/run_local.sh"
  elif [[ "${flavor}" == "dev" ]]; then
    "${SCRIPTS}/run_dev.sh"
  elif [[ "${flavor}" == "staging" ]]; then
    "${SCRIPTS}/run_staging.sh"
  elif [[ "${flavor}" == "prod" ]]; then
    echo "NotImplementedException"
    exit 1
  fi
}

main "$@"
