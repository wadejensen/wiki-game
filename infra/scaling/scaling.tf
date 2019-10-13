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

resource "aws_lb" "lb" {
  count = local.count
  name = "scaling"
  internal = false
  load_balancer_type = "application"
  security_groups = data.terraform_remote_state.vpc.outputs.security_group_public
  subnets = data.terraform_remote_state.vpc.outputs.subnet_public
  enable_deletion_protection = false
}

resource "aws_lb_target_group" "target" {
  count = local.count
  name     = "scaling"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = data.terraform_remote_state.vpc.outputs.vpc_id[count.index]

  deregistration_delay = 60
  health_check {
    interval = 15
    path = "/"
    port = "3000"
    protocol = "HTTP"
    timeout = 10
    healthy_threshold = 3
    unhealthy_threshold = 3
    matcher = "200"
  }
}

resource "aws_lb_listener" "listener" {
  count = local.count
  load_balancer_arn = "${aws_lb.lb[count.index].arn}"
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = "${aws_lb_target_group.target[count.index].arn}"
  }
}

resource "aws_autoscaling_group" "asg" {
  count = local.count
  name                 = "scaling"
  # Ubuntu 18.04
  launch_configuration = "${aws_launch_configuration.ec2_conf.name}"
  min_size             = 2
  max_size             = 10
  vpc_zone_identifier = data.terraform_remote_state.vpc.outputs.subnet_public
  target_group_arns = [aws_lb_target_group.target[count.index].arn]

  default_cooldown = 60
  health_check_grace_period = 120
  health_check_type = "ELB"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_policy" "scaling_policy" {
  count = local.count
  name = "scaling"
  autoscaling_group_name = aws_autoscaling_group.asg[count.index].name
  policy_type = "TargetTrackingScaling"
  estimated_instance_warmup = 30

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 50.0
//    scale_in_cooldown = 120
//    scale_out_cooldown = 60
  }
}

resource "aws_iam_role" "scaling" {
  name = "scaling"
  assume_role_policy = data.aws_iam_policy_document.assume.json
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

resource "aws_iam_instance_profile" "scaling" {
  name = "scaling"
  role = "${aws_iam_role.scaling.name}"
}

resource "aws_launch_configuration" "ec2_conf" {
  name_prefix   = "scaling-conf-"
  image_id      = "ami-0b76c3b150c6b1423"
  instance_type = "t2.micro"
  key_name = "adhoc"
  user_data = file("${path.module}/../../bin/run_ec2.sh")

  iam_instance_profile = aws_iam_instance_profile.scaling.name
  security_groups = data.terraform_remote_state.vpc.outputs.security_group_private

  lifecycle {
    create_before_destroy = true
  }
}

output "lb_dns_name" {
  value = aws_lb.lb.*.dns_name
}
