#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset

REPO_ROOT="$(git rev-parse --show-toplevel)"
APP_HOME="${REPO_ROOT}/app"

main() {
  cd "${APP_HOME}"
  git_sha=$(git rev-parse --short=8 HEAD)
  docker build -t "wadejensen/wiki:${git_sha}" -t wadejensen/wiki:latest .
  docker push wadejensen/wiki
}

main "$@"
