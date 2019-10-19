import {driver, process, structure} from "gremlin";
import GraphTraversalSource = process.GraphTraversalSource;
import Graph = structure.Graph;


export async function createGraphDBConnection({
  websocketPath,
  clean,
}: {
  websocketPath: string,
  clean: boolean,
}): Promise<GraphTraversalSource> {
  console.log("Creating connection");
  // Note: The empty object {} is to work around a bug in the
  // Gremlin JavaScript 3.3.5 and 3.4 clients.
  const DriverRemoteConnection = driver.DriverRemoteConnection;
  const connection = new DriverRemoteConnection(websocketPath, {});
  const graph = new Graph();
  console.log("Connecting to: " + websocketPath);
  const g = graph.traversal().withRemote(connection);
  console.log("Connection created");

  if (clean === true) {
    // drop any pre-existing state
    //console.warn("Dropping Graph DB data.");
    //await g.V().drop().iterate();
  }
  return g;
}
