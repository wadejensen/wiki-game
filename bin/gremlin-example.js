const gremlin = require("gremlin");
const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

dc = new DriverRemoteConnection('wss://tf-20191013222604839000000001.csqfv1fly5tz.ap-southeast-2.neptune.amazonaws.com:8182/gremlin',{});

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
