#!/usr/bin/env bash

ssh -i ~/Downloads/adhoc.pem ubuntu@52.65.9.150

sudo apt-get update
sudo apt-get upgrade
sudo apt install redis-tools
redis-cli -h wiki-redis.xvtlzg.0001.apse2.cache.amazonaws.com -p 6379 ping

wget http://apache.mirror.amaze.com.au/tinkerpop/3.4.3/apache-tinkerpop-gremlin-console-3.4.3-bin.zip
sudo apt install unzip
unzip apache-tinkerpop-gremlin-console-3.4.3-bin.zip

sudo apt-get install default-jdk

# Add neptune-remote.yaml file to conf dir

~/apache-tinkerpop-gremlin-console-3.4.3/bin/gremlin.sh
# > :remote connect tinkerpop.server conf/neptune-remote.yaml
# > :remote console
# > g.addV("url").property("href", "en.wikipedia.com/wiki/Main_Page").property("name", "Main_Page").toList()
# > g.V().limit(1)
# > g.V().has("url", "name", "Main_Page").values()

# Install node
sudo apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs

npm install gremlin

# Add gremlin-example.js
node gremlin-example.js
