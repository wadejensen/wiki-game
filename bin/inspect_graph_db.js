#!/usr/bin/env node

const gremlin = require('gremlin');
const Graph = gremlin.structure.Graph;
const hostname = 'localhost';
const port=8182;
console.log("Creating connection");
wspath = `ws://${hostname}:${port}/gremlin`;
const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const connection = new DriverRemoteConnection(wspath,{});
const graph = new Graph();
console.log("Connecting to :" + wspath);
const g = graph.traversal().withRemote(connection);
console.log("Connection created");
