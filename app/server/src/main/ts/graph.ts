import {CrawlerRecord} from "./crawler";
import {foldApply, partition} from "../../../../common/src/main/ts/fp/array";
import {process, structure} from "gremlin";
import {inferPageName} from "./wiki";
import {GremlinConnection, GremlinQueryBuilder} from "./graph/gremlin_connection";
import {gremlinBatchSize} from "./server_module";
import {Async} from "../../../../common/src/main/ts/async";
import GraphTraversal = process.GraphTraversal;

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
    (children: string[]) => buildInsertChildrenQuery(record, parentVertexId, children, record.childUrls.length));

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
      unfold()
        .property("numLinks", record.childUrls.length)
        .property("crawled", "true"),
      addV("url")
        .property("href", record.url)
        .property("name", inferPageName(record.url))
        .property("degree", record.degree)
        .property("numLinks", record.childUrls.length)
        .property("crawled", "true")
    )
}

// Lazily build batch insert query
function buildInsertChildrenQuery(
    record: CrawlerRecord,
    parentId: number,
    children: string[],
    numTotalChildren: number,
): (g: GraphTraversal) => GraphTraversal {
  return (g: GraphTraversal) =>
    foldApply<GraphTraversal, string>(g, (g, child) => buildInsertChildQuery2({
        g,
        parentId: parentId,
        parentUrl: record.url,
        parentPageName: inferPageName(record.url),
        childUrl: child,
        childPageName: inferPageName(child),
        childDegree: record.degree + 1,
      }),
      children,
    );
}

function buildInsertChildQuery2({
    g,
    parentId,
    parentUrl,
    parentPageName,
    childUrl,
    childPageName,
    childDegree,
}: {
  g: GraphTraversal,
  parentId: number,
  parentUrl: string,
  parentPageName: string,
  childUrl: string,
  childPageName: string,
  childDegree: number,
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
        .property("degree", childDegree)
        .property("numLinks", 0)
        .property("crawled", "false")
    )
    .V() //
    .has("url", "href", parentUrl).as("parent")
    .V() //
    .has("url", "href", childUrl).as("child")
    .coalesce(
      inE().where(outV().as("parent")),
      addE("link").from_("parent")
        .property("out", parentPageName)
        .property("in", childPageName)
        .property("degree", childDegree)
    );
}
