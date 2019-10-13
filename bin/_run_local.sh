#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

main() {
    redis-cli shutdown || true
    redis-server &
    node --inspect dist/index.js "$@"
    #pid="$!"
    #kill -SIGUSR1 "$pid"
}

main "$@"
