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

### Redis cache
resource "aws_elasticache_cluster" "redis" {
  count = local.count
  cluster_id           = "wiki-redis"
  engine               = "redis"
  node_type            = "cache.t2.medium"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis5.0"
  engine_version       = "5.0.3"
  port                 = 6379
  subnet_group_name = aws_elasticache_subnet_group.redis[count.index].name
  security_group_ids = data.terraform_remote_state.vpc.outputs.security_group_public
  apply_immediately = true
}

resource "aws_elasticache_subnet_group" "redis" {
  count = local.count
  name       = "wiki-redis"
  subnet_ids = data.terraform_remote_state.vpc.outputs.subnet_public
}

output "redis_cluster_address" {
  value = aws_elasticache_cluster.redis.*.cluster_address
}

//output "redis_connection" {
//  value = aws_elasticache_cluster.redis.connection
//}

output "redis_port" {
  value = aws_elasticache_cluster.redis.*.port
}

output "redis_id" {
  value = aws_elasticache_cluster.redis.*.id
}
