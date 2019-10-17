#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

export AWS_DEFAULT_REGION="ap-southeast-2"

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

config_file() {
  cat <<EOF
{
  "crawler": {
    "qps": 4,
    "timeout": 3000,
    "retries": 3,
    "backoffDelayMs": 300,
    "exponentialBackoff": true
  },
  "redis": {
    "host": "wiki-redis.xvtlzg.0001.apse2.cache.amazonaws.com",
    "port": 6379,
    "qps": 10000,
    "retries": 3
  },
  "gremlin": {
    "host": "tf-20191013222604839000000001.csqfv1fly5tz.ap-southeast-2.neptune.amazonaws.com",
    "port": 8182,
    "clean": true,
    "qps": 200,
    "retries": 3
  }
}
EOF
}

seed_file() {
  echo 'https://en.wikipedia.org/wiki/Main_Page'
}

main() {
  # write config files
  HOST_CONF_DIR=~/conf
  HOST_CONF_FILE="${HOST_CONF_DIR}/wiki.json"
  HOST_SEED_FILE="${HOST_CONF_DIR}/crawler_seed.txt"
  [[ -d "${HOST_CONF_DIR}" ]] || mkdir "${HOST_CONF_DIR}"
  config_file > "${HOST_CONF_FILE}"
  seed_file > "${HOST_SEED_FILE}"

  # Populate conf file with service locations for caching and persistence
  REDIS_HOST="$(redis_host)"
  REDIS_PORT="$(redis_port)"
  NEPTUNE_HOST="$(neptune_host)"
  NEPTUNE_PORT="$(neptune_port)"

  # Rewrite config file to use new Redis and Neptune endpoints
  cat "${HOST_CONF_FILE}" \
  | jq ".redis.host = \"${REDIS_HOST}\" |
        .redis.port = \"${REDIS_PORT}\" |
        .gremlin.host = \"${NEPTUNE_HOST}\" |
        .gremlin.port = \"${NEPTUNE_PORT}\"" \
  > tmp && mv tmp "${HOST_CONF_FILE}"

  cat "${HOST_CONF_FILE}"
  cat "${HOST_SEED_FILE}"

  MOUNTED_CONF_DIR="/app/conf"
  sudo docker run \
    --volume "${HOST_CONF_DIR}:${MOUNTED_CONF_DIR}"\
    --env CONF_FILE="${MOUNTED_CONF_DIR}/wiki.json" \
    --env SEED_FILE="${MOUNTED_CONF_DIR}/crawler_seed.txt" \
    -p 3000:3000 \
    wadejensen/wiki:latest \
    > ~/server.log
}

main "$@"
