#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

main() {
  if ! nc -z localhost 8182; then
    docker run -d -p 8182:8182 tinkerpop/gremlin-server
  fi
}

main "$@"
