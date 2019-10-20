#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
INFRA_HOME="${REPO_ROOT}/infra"
IAM_INFRA_HOME="${INFRA_HOME}/iam"
VPC_INFRA_HOME="${INFRA_HOME}/vpc"
CACHE_INFRA_HOME="${INFRA_HOME}/cache"
PERSISTENCE_INFRA_HOME="${INFRA_HOME}/persistence"
SCALING_INFRA_HOME="${INFRA_HOME}/scaling"

PROG=$(basename "$0")
export AWS_PROFILE=wjensen

usage() {
    cat <<EOF
Usage: "${PROG}" [plan|apply|deploy|teardown]
EOF
}

plan() {
  local dir
  dir="$1"

  cd "${dir}"
  terraform plan -var-file=prod.tfvars
}

apply() {
  local dir
  dir="$1"

  cd "${dir}"
  terraform apply -var-file=prod.tfvars
}

teardown() {
  local dir
  dir="$1"

  cd "${dir}"
  terraform apply -var-file=prod.tfvars -var 'enabled=false'
}

deploy() {
  local dir
  dir="$1"

  cd "${dir}"
  terraform apply -var-file=prod.tfvars -var 'enabled=true'
}

main() {
    if [[ "$#" -ne 1 ]]; then
        usage
        exit 1
    fi

    local verb="$1"
    tfenv use 0.12.6
    if [[ "${verb}" == "plan" ]]; then
        plan "${IAM_INFRA_HOME}"
        plan "${VPC_INFRA_HOME}"
        plan "${CACHE_INFRA_HOME}"
        plan "${PERSISTENCE_INFRA_HOME}"
        plan "${SCALING_INFRA_HOME}"
    elif [[ "${verb}" == "apply" ]]; then
        apply "${IAM_INFRA_HOME}"
        apply "${VPC_INFRA_HOME}"
        apply "${CACHE_INFRA_HOME}"
        apply "${PERSISTENCE_INFRA_HOME}"
        apply "${SCALING_INFRA_HOME}"
    elif [[ "${verb}" == "deploy" ]]; then
        deploy "${IAM_INFRA_HOME}"
        deploy "${VPC_INFRA_HOME}"
        deploy "${CACHE_INFRA_HOME}"
        deploy "${PERSISTENCE_INFRA_HOME}"
        deploy "${SCALING_INFRA_HOME}"
    elif [[ "${verb}" == "teardown" ]]; then
        teardown "${SCALING_INFRA_HOME}"
        teardown "${PERSISTENCE_INFRA_HOME}"
        teardown "${CACHE_INFRA_HOME}"
        teardown "${VPC_INFRA_HOME}"
    else
      echo "Unknown infra.sh argument: $1"
      usage
      exit 1
    fi
}

main "$@"
