import {CrawlerRecord} from "./crawler";
import {foldApply, partition} from "../../../../common/src/main/ts/fp/array";
import {process, structure} from "gremlin";
import {inferPageName} from "./wiki";
import {
  GremlinConnection,
  GremlinQueryBuilder
} from "./graph/gremlin_connection";
import GraphTraversal = process.GraphTraversal;
import {gremlinBatchSize} from "./server_module";
import {Async} from "../../../../common/src/main/ts/async";
import {sys} from "typescript";
import {logger} from "../../../../common/src/main/ts/logger";
import Vertex = structure.Vertex;

const addV = process.statics.addV;
const addE = process.statics.addE;
const fold = process.statics.fold;
const unfold = process.statics.unfold;
const inV = process.statics.inV;
const outV = process.statics.outV;
const inE = process.statics.inE;
const outE = process.statics.outE;
const V = process.statics.V;

const BATCH_SIZE = gremlinBatchSize();

// Inserts page crawl results into the graph DB.
// Creates multiple insert traversals containing batches of vertices and edges
// to avoid overwhelming the database connection with large batches.
export async function insertCrawlerRecord(
    graphClient: GremlinConnection,
    record: CrawlerRecord
): Promise<void> {
  const parentVertexId = await graphClient.next((g: GraphTraversal) =>
    insertParentVertexIfNotExists(g, record)).then(val => val.value.id);

  // Create small batches of inserts because the Gremlin server doesn't like large requests
  const batchesOfChildren: string[][] = partition(record.childUrls, BATCH_SIZE);

  const insertChildrenQueries: GremlinQueryBuilder[] = batchesOfChildren.map(
    (children: string[]) => buildInsertChildrenQuery(record, parentVertexId, children));

  // insert batches of children sequentially
  return Async.reduceSerial<GremlinQueryBuilder, void>(
    insertChildrenQueries,
    (t: GremlinQueryBuilder) => graphClient.iterate(t),
    Promise.resolve(undefined));
}

function insertParentVertexIfNotExists(g: GraphTraversal, record: CrawlerRecord): GraphTraversal {
  return g
    .V()
    .has("url", "href", record.url)
    .fold()
    .coalesce(
      unfold(),
      addV("url")
        .property("href", record.url)
        .property("name", inferPageName(record.url))
    )
}

// Lazily build batch insert query
function buildInsertChildrenQuery(
    record: CrawlerRecord,
    parentId: number,
    children: string[]
): (g: GraphTraversal) => GraphTraversal {
  return (g: GraphTraversal) =>
    foldApply<GraphTraversal, string>(g, (g, child) => buildInsertChildQuery2({
        g,
        parentId: parentId,
        parentUrl: record.url,
        parentPageName: inferPageName(record.url),
        childUrl: child,
        childPageName: inferPageName(child)
      }),
      children,
    );
}

function buildInsertChildQuery({
    g,
    parentUrl,
    parentPageName,
    childUrl,
    childPageName,
}: {
    g: GraphTraversal,
    parentUrl: string,
    parentPageName: string,
    childUrl: string,
    childPageName: string,
}): GraphTraversal {
  return g
    .V()
    .has("url", "href", parentUrl)
    .fold()
    .coalesce(
      unfold(),
      addV("url")
        .property("href", parentUrl)
        .property("name", parentPageName)
    )
    .V() //
    .has("url", "href", childUrl)
    .fold()
    .coalesce(
      unfold(),
      addV("url")
        .property("href", childUrl)
        .property("name", childPageName)
    )
    .V() //
    .has("url", "href", parentUrl).as("parent")
    .V() //
    .has("url", "href", childUrl).as("child")
    .coalesce(
      inE().where(outV().as("parent")),
      addE("link").from_("parent")
        .property("in", parentPageName)
        .property("out", childPageName)
    );
}

function buildInsertChildQuery2({
    g,
    parentId,
    parentUrl,
    parentPageName,
    childUrl,
    childPageName,
}: {
  g: GraphTraversal,
  parentId: number,
  parentUrl: string,
  parentPageName: string,
  childUrl: string,
  childPageName: string,
}): GraphTraversal {
  return g
    .V()
    .has("url", "href", childUrl)
    .fold()
    .coalesce(
      unfold(),
      addV("url")
        .property("href", childUrl)
        .property("name", childPageName)
    )
    .V() //
    .has("url", "href", parentUrl).as("parent")
    .V() //
    .has("url", "href", childUrl).as("child")
    .coalesce(
      inE().where(outV().as("parent")),
      addE("link").from_("parent")
        .property("in", parentPageName)
        .property("out", childPageName)
    );
}

async function doTheNeedful(gremlin: GremlinConnection) {
  console.log("Add wadejensen");
  const addVertex = (g: GraphTraversal) => g
  //.V()
    .addV("url")
    .property("href", "wadejensen")
    .property("nameeee", "Main_page");

  const resp0 = await gremlin.toList(addVertex);
  console.log(resp0);

  console.log("Add jensenwade");
  const addVertexx = (g: GraphTraversal) => g
  //.V()
    .addV("url")
    .property("href", "jensenwade")
    .property("nameeee", "hello world");

  const resp1 = await gremlin.iterate(addVertexx);
  console.log(resp1);

  const getVertices = (g: GraphTraversal) => g
    .V()
    .limit(10)
    .valueMap();

  console.log("Report results");
  const resp2 = await gremlin.toList(getVertices);
  console.log(resp2);
  console.log(resp2);
}
