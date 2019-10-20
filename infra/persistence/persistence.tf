terraform {
  required_version = "0.12.6"
}

provider "aws" {
  region = "${var.region}"
  version = "2.21.1"
}

variable "region" {}

variable "enabled" {
  default = false
}

locals {
  count = "${var.enabled ? 1 : 0}"
}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "terraform_remote_state" "vpc" {
  backend = "local"
  config = {
    path = "../vpc/terraform.tfstate"
  }
}

data "terraform_remote_state" "iam" {
  backend = "local"
  config = {
    path = "../iam/terraform.tfstate"
  }
}

resource "aws_instance" "graph_db" {
  count = local.count
  # Ubuntu 18.04 with Docker and the AWS CLI pre-installed
  ami = "ami-0c59395006484f97a"
  instance_type = "m5.2xlarge"
  instance_initiated_shutdown_behavior = "terminate"
  key_name = "adhoc"
  vpc_security_group_ids = data.terraform_remote_state.vpc.outputs.security_group_public
  subnet_id = data.terraform_remote_state.vpc.outputs.subnet_public[count.index]
  iam_instance_profile = data.terraform_remote_state.iam.outputs.wiki_worker_instance_profile_id
  user_data = file("${path.module}/../../bin/run_graph_db.sh")
  tags = {
    "Name" = "GraphDB"
  }
}

output "graph_db_public_ip" {
  value = length(aws_instance.graph_db.*.public_dns) == 1 ? aws_instance.graph_db.*.public_dns[0] : ""
}

output "graph_db_private_ip" {
  value = length(aws_instance.graph_db.*.private_dns) == 1 ? aws_instance.graph_db.*.private_dns[0] : ""
}
