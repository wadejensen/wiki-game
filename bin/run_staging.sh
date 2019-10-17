#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset

export AWS_PROFILE=wjensen

REPO_ROOT="$(git rev-parse --show-toplevel)"
APP_HOME="${REPO_ROOT}/app"
SCRIPTS="${REPO_ROOT}/bin"

INFRA_HOME="${REPO_ROOT}/infra"
VPC_INFRA_HOME="${INFRA_HOME}/vpc"
CACHE_INFRA_HOME="${INFRA_HOME}/cache"
PERSISTENCE_INFRA_HOME="${INFRA_HOME}/persistence"

redis_host() {
  aws elasticache describe-cache-clusters \
    --cache-cluster-id wiki-redis \
    --show-cache-node-info \
    --query 'CacheClusters[?CacheClusterId == `wiki-redis`] | [0] | CacheNodes | [0] | Endpoint.Address' \
    | tr -d '"'
}

redis_port() {
  aws elasticache describe-cache-clusters \
    --cache-cluster-id wiki-redis \
    --show-cache-node-info \
    --query 'CacheClusters[?CacheClusterId == `wiki-redis`] | [0] | CacheNodes | [0] | Endpoint.Port' \
    | tr -d '"'
}

neptune_host() {
  aws neptune describe-db-clusters \
    --db-cluster-identifier wiki-neptune \
    --query 'DBClusters[?DBClusterIdentifier == `wiki-neptune`] | [0] | Endpoint' \
    | tr -d '"'
}

neptune_port() {
  aws neptune describe-db-clusters \
    --db-cluster-identifier wiki-neptune \
    --query 'DBClusters[?DBClusterIdentifier == `wiki-neptune`] | [0] | Port' \
    | tr -d '"'
}

main() {
  if [[ ! -z "${SKIP_INFRA:+x}" ]]; then
    echo 'Skipping infra deployment (SKIP_INFRA env var set)'
  else
    "${SCRIPTS}/infra.sh" deploy
  fi

  HOST_CONF_DIR="${APP_HOME}/conf"
  MOUNTED_CONF_DIR="/app/conf"
  HOST_CONF_FILE="${HOST_CONF_DIR}/wiki.staging.json"
  MOUNTED_CONF_FILE="${MOUNTED_CONF_DIR}/wiki.staging.json"

  cd "${VPC_INFRA_HOME}"
  BASTION_HOST="$(terraform output -state terraform.tfstate bastion_public_ip)"
  ssh -i ~/Downloads/adhoc.pem "ubuntu@${BASTION_HOST}"

  REDIS_HOST="$(redis_host)"
  REDIS_PORT="$(redis_port)"
  NEPTUNE_HOST="$(neptune_host)"
  NEPTUNE_PORT="$(neptune_port)"

  echo REDIS_HOST="${REDIS_HOST}"
  echo REDIS_PORT="${REDIS_PORT}"
  echo NEPTUNE_HOST="${NEPTUNE_HOST}"
  echo NEPTUNE_PORT="${NEPTUNE_PORT}"
  # Rewrite config file to use new Redis and Neptune endpoints
  cat "${HOST_CONF_FILE}" \
  | jq ".redis.host = \"${REDIS_HOST}\" |
        .redis.port = \"${REDIS_PORT}\" |
        .gremlin.host = \"${NEPTUNE_HOST}\" |
        .gremlin.port = \"${NEPTUNE_PORT}\"" \
  > tmp && mv tmp "${HOST_CONF_FILE}"

  cat "${HOST_CONF_FILE}"
  MOUNTED_CONF_DIR="/app/conf"

  exit 0

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
