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

### AWS Neptune Cluster
resource "aws_neptune_cluster" "neptune" {
  count = local.count
  cluster_identifier = "wiki-neptune"
  engine  = "neptune"
  skip_final_snapshot  = true
  iam_database_authentication_enabled = false
  apply_immediately  = true
  vpc_security_group_ids = data.terraform_remote_state.vpc.outputs.security_group_public
  neptune_subnet_group_name = aws_neptune_subnet_group.neptune[count.index].id
  port = 8182
}


resource "aws_neptune_cluster_instance" "neptune" {
  count              = local.count
  cluster_identifier = aws_neptune_cluster.neptune[count.index].id
  engine             = "neptune"
  instance_class     = "db.r4.large"
  apply_immediately  = true
}

resource "aws_neptune_subnet_group" "neptune" {
  count              = local.count
  name       = "wiki-neptune"
  subnet_ids = data.terraform_remote_state.vpc.outputs.subnet_public
}

output "neptune_endpoint" {
  value = aws_neptune_cluster.neptune[local.count - 1].endpoint
}
