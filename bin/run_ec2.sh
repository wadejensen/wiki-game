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

graph_db_host() {
  aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=GraphDB" "Name=instance-state-name,Values=running" \
    --query "Reservations[0].Instances[0].PrivateDnsName" \
    | tr -d '"'
}

graph_db_port() {
  echo 8182
}

config_file() {
  cat <<EOF
{
  "crawler": {
    "qps": 1,
    "timeout": 3000,
    "retries": 3,
    "backoffDelayMs": 300,
    "exponentialBackoff": true
  },
  "redis": {
    "host": "wiki-redis.xvtlzg.0001.apse2.cache.amazonaws.com",
    "port": "6379",
    "qps": 10000,
    "retries": 3
  },
  "gremlin": {
    "connection": "ws://wiki-neptune.cluster-csqfv1fly5tz.ap-southeast-2.neptune.amazonaws.com:8182/gremlin",
    "clean": true,
    "qps": 200,
    "retries": 3,
    "batchSize": 20,
    "concurrency": 1
  }
}
EOF
}

seed_file() {
  echo 'https://en.wikipedia.org/wiki/Main_Page'
}

main() {
  set -x
  # write config files
  HOST_CONF_DIR=~/conf
  HOST_CONF_FILE="${HOST_CONF_DIR}/wiki.json"
  HOST_SEED_FILE="${HOST_CONF_DIR}/crawler_seed.txt"
  [[ -d "${HOST_CONF_DIR}" ]] || mkdir "${HOST_CONF_DIR}"
  config_file > "${HOST_CONF_FILE}"
  seed_file > "${HOST_SEED_FILE}"

  cat "${HOST_CONF_FILE}"
  cat "${HOST_SEED_FILE}"

  # Populate conf file with service locations for caching and persistence
  REDIS_HOST="$(redis_host)"
  REDIS_PORT="$(redis_port)"
  GRAPHDB_HOST="$(graph_db_host)"
  GRAPHDB_PORT="$(graph_db_port)"

  GRAPHDB_CONNECTION="ws://${GRAPHDB_HOST}:${GRAPHDB_PORT}/gremlin"
  echo GRAPHDB_CONNECTION="${GRAPHDB_CONNECTION}"

  # Rewrite config file to use new Redis and Neptune endpoints
  cat "${HOST_CONF_FILE}" \
    | jq ".redis.host = \"${REDIS_HOST}\" |
          .redis.port = \"${REDIS_PORT}\" |
          .gremlin.connection = \"${GRAPHDB_CONNECTION}\"" \
    > tmpfile && \
    mv tmpfile "${HOST_CONF_FILE}"

  cat "${HOST_CONF_FILE}"
  cat "${HOST_SEED_FILE}"

  MOUNTED_CONF_DIR="/app/conf"
  echo 'Starting docker container'
  docker pull wadejensen/wiki:latest
  docker run \
    --volume "${HOST_CONF_DIR}:${MOUNTED_CONF_DIR}" \
    --env CONF_FILE="${MOUNTED_CONF_DIR}/wiki.json" \
    --env SEED_FILE="${MOUNTED_CONF_DIR}/crawler_seed.txt" \
    -p 3000:3000 \
    wadejensen/wiki:latest \
    > ~/server.log 2>&1
}

main "$@" | tee user_data.log
