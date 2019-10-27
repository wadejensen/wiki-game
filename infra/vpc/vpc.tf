terraform {
  required_version = "0.12.6"
}

variable "region" {}

provider "aws" {
  region = var.region
  version = "2.21.1"
}

variable "enabled" {
  default = false
}

data "terraform_remote_state" "iam" {
  backend = "local"
  config = {
    path = "../iam/terraform.tfstate"
  }
}

locals {
  azs = ["ap-southeast-2a", "ap-southeast-2b", "ap-southeast-2c"]
  count = var.enabled ? 1 : 0
  subnet_count = var.enabled ? length(local.azs) : 0
}

resource "aws_vpc" "main" {
  count = local.count
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = {
    Name = "main"
  }
}

resource "aws_internet_gateway" "gw" {
  count = local.count
  vpc_id = aws_vpc.main[count.index].id
}

resource "aws_route_table" "public" {
  count = local.count
  vpc_id = aws_vpc.main[count.index].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw[count.index].id
  }
}

resource "aws_eip" "nat" {
  count = local.count
  vpc = "true"
}

resource "aws_nat_gateway" "nat" {
  count = local.count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id = aws_subnet.public[count.index].id
}

resource "aws_route_table" "private" {
  count = local.count
  vpc_id = aws_vpc.main[count.index].id

  route {
    cidr_block = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat[count.index].id
  }
}

resource "aws_subnet" "public" {
  count = local.subnet_count
  vpc_id = aws_vpc.main[local.count - 1].id
  cidr_block = "10.0.${count.index + length(local.azs)}.0/24"
  availability_zone = local.azs[count.index]
  map_public_ip_on_launch = true
  tags = {
    Name = "main.public"
  }
}

resource "aws_route_table_association" "public" {
  count = local.subnet_count
  subnet_id = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[local.count - 1].id
}

resource "aws_subnet" "private" {
  count = local.subnet_count
  vpc_id = aws_vpc.main[local.count - 1].id
  cidr_block = "10.0.${count.index}.0/24"
  availability_zone = local.azs[count.index]
  tags = {
    Name = "main.private"
  }
}

resource "aws_route_table_association" "private_aa" {
  count = local.subnet_count
  subnet_id = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[local.count - 1].id
}

resource "aws_security_group" "public" {
  count = local.count
  vpc_id = aws_vpc.main[count.index].id
  name = "public"

  // ALLOW all ingress
  ingress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = [
      "49.255.94.0/24",
      "103.243.110.0/24",
      "10.0.0.0/12",
    ]
    self = true
  }

  // ALLOW ALL
  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = [
      "49.255.94.0/24",
      "103.243.110.0/24",
      "10.0.0.0/12",
      "0.0.0.0/0"
    ]
    self = true
  }
}

resource "aws_security_group" "private" {
  count = local.count
  vpc_id = aws_vpc.main[local.count - 1].id
  name = "private"

  // ALLOW 3000 from load balancer
  ingress {
    from_port = 3000
    to_port = 3000
    protocol = "tcp"
    security_groups = [
      aws_security_group.public[count.index].id
    ]
  }

  // ALLOW ALL
  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "bastion" {
  count = local.count
  # Ubuntu 18.04 with Docker and the AWS CLI pre-installed
  ami = "ami-0c59395006484f97a"
  instance_type = "t2.micro"
  instance_initiated_shutdown_behavior = "terminate"
  key_name = "adhoc"
  vpc_security_group_ids = aws_security_group.public.*.id
  subnet_id = aws_subnet.public.*.id[0]
  iam_instance_profile = data.terraform_remote_state.iam.outputs.wiki_worker_instance_profile_id
}

output "bastion_public_ip" {
  value = length(aws_instance.bastion.*.public_ip) == 1 ? aws_instance.bastion.*.public_ip[0] : ""
}

output "vpc_id" {
  value = aws_vpc.main.*.id
}

output "subnet_public" {
  value = aws_subnet.public.*.id
}

output "subnet_private" {
  value = aws_subnet.private.*.id
}

output "security_group_public" {
  value = aws_security_group.public.*.id
}

output "security_group_private" {
  value = aws_security_group.private.*.id
}
