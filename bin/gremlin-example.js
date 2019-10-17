const gremlin = require("gremlin");
const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

const wsUrl = "wss://wiki-neptune.cluster-csqfv1fly5tz.ap-southeast-2.neptune.amazonaws.com:8182/gremlin";
console.log(wsUrl);
dc = new DriverRemoteConnection(wsUrl,{});

const graph = new Graph();
const g = graph.traversal().withRemote(dc);

g.addV("url").property("href", "en.wikipedia.com/wiki/Main_page").property("name", "Main_page").iterate()

setTimeout(() => {
    g.V().limit(1).toList().
    then(data => {
        console.log(data);
        dc.close();
    }).catch(error => {
        console.log('ERROR', error);
        dc.close();
    });

}, 3000)
