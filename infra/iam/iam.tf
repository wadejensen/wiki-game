terraform {
  required_version = "0.12.6"
}

variable "region" {}

provider "aws" {
  region = var.region
  version = "2.21.1"
}

variable "enabled" {}

data "aws_caller_identity" "current" {}

resource "aws_iam_user" "wjensen" {
  name = "wjensen"
}

resource "aws_iam_user_policy_attachment" "wjensen_ec2_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
  user = aws_iam_user.wjensen.id
}

resource "aws_iam_user_policy_attachment" "wjensen_iam_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/IAMFullAccess"
  user = aws_iam_user.wjensen.id
}

resource "aws_iam_user_policy_attachment" "wjensen_vpc_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonVPCFullAccess"
  user = aws_iam_user.wjensen.id
}

resource "aws_iam_user_policy_attachment" "wjensen_elasticache_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonElastiCacheFullAccess"
  user = aws_iam_user.wjensen.id
}

resource "aws_iam_user_policy_attachment" "wjensen_rds_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonRDSFullAccess"
  user = aws_iam_user.wjensen.id
}

resource "aws_iam_user_policy_attachment" "wjensen_neptune_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/NeptuneFullAccess"
  user = aws_iam_user.wjensen.id
}

resource "aws_iam_role" "wiki" {
  name = "wiki"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy_attachment" "elasticache_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonElastiCacheFullAccess"
  role = aws_iam_role.wiki.id
}

resource "aws_iam_role_policy_attachment" "rds_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonRDSFullAccess"
  role = aws_iam_role.wiki.id
}

resource "aws_iam_role_policy_attachment" "neptune_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/NeptuneFullAccess"
  role = aws_iam_role.wiki.id
}

data "aws_iam_policy_document" "assume" {
  statement {
    effect = "Allow"
    principals {
      type = "Service"
      identifiers = [
        "ec2.amazonaws.com"
      ]
    }
    actions = [
      "sts:AssumeRole"
    ]
  }
}

resource "aws_iam_instance_profile" "wiki" {
  name = "wiki"
  role = aws_iam_role.wiki.name
}

output "wiki_worker_instance_profile_id" {
  value = aws_iam_instance_profile.wiki.id
}
