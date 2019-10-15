#!/usr/bin/env node

const gremlin = require('gremlin');

const addV = gremlin.process.statics.addV;
const addE = gremlin.process.statics.addE;
const fold = gremlin.process.statics.fold;
const unfold = gremlin.process.statics.unfold;
const inV = gremlin.process.statics.inV;
const outV = gremlin.process.statics.outV;
const inE = gremlin.process.statics.inE;
const outE = gremlin.process.statics.outE;

const Graph = gremlin.structure.Graph;
const hostname = 'localhost';
const port=8182;
console.log("Creating connection");
wspath = `ws://${hostname}:${port}/gremlin`;
const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const connection = new DriverRemoteConnection(wspath,{});
const graph = new Graph();
console.log("Connecting to: " + wspath);
const g = graph.traversal().withRemote(connection);
console.log("Connection created");

g.V().drop();

for (let i = 0; i < 100; i++) {
    g
        .V()
        .has("num", "i", i.toString())
        .fold()
        .coalesce(
            unfold(),
            addV("num").property("i", i.toString())
        ).as("parent")
        .V()
        .has("num", "i", (i * 2).toString())
        .fold()
        .coalesce(
            unfold(),
            addV("num").property("i", (i * 2).toString())
        ).as("child")
        .V()
        .has("num", "i", i.toString()).as("parent")
        .V()
        .has("num", "i", (i * 2).toString()).as("child")
        .coalesce(
            inE().where(outV().as("parent")),
            addE("double")
                .from_("parent")
                .property("i", (i * 3).toString())
        )
        .toList()
        .then(console.log)
}

for (let i = 0; i < 100; i++) {
    g
        .V()
        .has("num", "i", i.toString()).as("parent")
        .V()
        .has("num", "i", (i * 2).toString()).as("child")
        .coalesce(
            inE("num").where(outV().as("parent")),
            addE("double")
                .from_("parent")
                .to("child")
                .property("i", (i * 3).toString())
        )
        .next()
        .then(console.log)
}

g.V().has('event','id','1').
fold().
coalesce(unfold(),
    addV('event').property('id','1')).as('start').
coalesce(outE('link').has('id','3'),
    coalesce(V().has('event','id','2'),
        addV('event').property('id','2')).
    addE('link').from('start').property('id','3'))

.fold()
    .coalesce(
        unfold(),
        addV("num").property("i", (i*2).toString())
    ).as("child")
    .coalesce(
        inV("double").has("i", (i*3).toString()),
        addE("double").from("parent").to("child").property("i", (i*3).toString())

    ).iterate()

g
    .V()
    .has('event','id','1')
    .fold()
    .coalesce(
        unfold(),
        addV('event').property('id','1')
    ).as('start')
    .coalesce(
        outE('link').has('id','3'),
        coalesce(
            V().has('event','id','2'),
            addV('event').property('id','2')
        ).addE('link').from('start').property('id','3')
    )


}


g.V().has('person','name','vadas').as('v').
V().has('software','name','ripple').
coalesce(__.inE('created').where(outV().as('v')),
    addE('created').from('v').property('weight',0.5))


g.V()
    .has('event','id','1')
    .fold()
    .coalesce(
        unfold(),
        addV('event').property('id','1')
    ).as('start')
    .coalesce(
        outE('link').has('id','3'),
        coalesce(V().has('event','id','2'),
        addV('event').property('id','2')).
    addE('link').from('start').property('id','3'))


g
    .V().has('person','name','vadas').as('v1')
    .V().has('software','name','ripple').as('v2')
    .coalesce(__.inE('created').where(outV().as('v')),
    addE('created').from('v').property('weight',0.5))


g
    .V()
    .has("num", "i", "100").as("v")
    .fold()
    .coalesce(
        unfold(),
        addV("num").as("100").property("i", "100")
    )
