#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

main() {
  if ! nc -z localhost 6379; then
    docker run -d -p 6379:6379 redis:5.0.6-alpine
  fi
}

main "$@"
