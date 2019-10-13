terraform {
  required_version = "0.12.6"
}

variable "region" {}

provider "aws" {
  region = "${var.region}"
  version = "2.21.1"
}

variable "enabled" {}

data "aws_caller_identity" "current" {}

resource "aws_iam_user" "wjensen" {
  name = "wjensen"
}

resource "aws_iam_user_policy_attachment" "wjensen_ec2_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
  user = "${aws_iam_user.wjensen.id}"
}

resource "aws_iam_user_policy_attachment" "wjensen_iam_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/IAMFullAccess"
  user = "${aws_iam_user.wjensen.id}"
}

resource "aws_iam_user_policy_attachment" "wjensen_vpc_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonVPCFullAccess"
  user = "${aws_iam_user.wjensen.id}"
}

resource "aws_iam_user_policy_attachment" "wjensen_elasticache_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonElastiCacheFullAccess"
  user = "${aws_iam_user.wjensen.id}"
}

resource "aws_iam_user_policy_attachment" "wjensen_rds_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonRDSFullAccess"
  user = "${aws_iam_user.wjensen.id}"
}

resource "aws_iam_user_policy_attachment" "wjensen_neptune_policy_attach" {
  policy_arn = "arn:aws:iam::aws:policy/NeptuneFullAccess"
  user = "${aws_iam_user.wjensen.id}"
}
