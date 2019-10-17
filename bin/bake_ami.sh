#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset

install_docker() {
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
  sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
  sudo apt-get update
  sudo apt-cache policy docker-ce
  sudo apt-get install -y docker-ce
  sudo systemctl --no-pager status docker
}

install_aws_cli() {
  sudo DEBIAN_FRONTEND=noninteractive apt install -y python3-pip
  sudo -H pip3 install awscli --upgrade
}

main() {
  install_docker
  install_aws_cli
  sudo apt-get install -y jq
}

main "$@"
