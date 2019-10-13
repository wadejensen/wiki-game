const redis = require("redis");

const host = "wiki-redis.xvtlzg.0001.apse2.cache.amazonaws.com";
const port = 6379;

const client = redis.createClient({ host: host, port: port });

client.on("error", function (err) {
    console.log("Error " + err);
});

const addResp = client.sadd("queue", "Main_Page");
const membersResp = client.smembers("queue", function (err, reply) {
    console.log(reply.toString())
});

//console.log(client);
console.log(addResp);
console.log(membersResp);
