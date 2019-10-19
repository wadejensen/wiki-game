import {CrawlerRecord} from "./crawler";
import {foldApply, partition} from "../../../../common/src/main/ts/fp/array";
import {process} from "gremlin";
import {inferPageName} from "./wiki";
import {GrelimQueryBuilder, GremlinConnection} from "./graph/gremlin_connection";
import GraphTraversal = process.GraphTraversal;
import {gremlinBatchSize} from "./server_module";
import {Async} from "../../../../common/src/main/ts/async";
import {sys} from "typescript";

const addV = process.statics.addV;
const addE = process.statics.addE;
const fold = process.statics.fold;
const unfold = process.statics.unfold;
const inV = process.statics.inV;
const outV = process.statics.outV;
const inE = process.statics.inE;
const outE = process.statics.outE;

const BATCH_SIZE = gremlinBatchSize();

// Inserts page crawl results into the graph DB.
// Creates multiple insert traversals containing batches of vertices and edges
// to avoid overwhelming the database connection with large batches.
export async function insertCrawlerRecord(
    graphClient: GremlinConnection,
    record: CrawlerRecord
): Promise<void> {
  // Create small batches of inserts because the Gremlin server doesn't like large requests
  const batchesOfChildren: string[][] = partition(record.childUrls, BATCH_SIZE);
  const insertChildrenQueries: GrelimQueryBuilder[] = batchesOfChildren.map(
    (children: string[]) => buildInsertChildrenQuery(record, children));

  const errHandler = (err: any) => {
    console.error(err);
    sys.exit();
    return Promise.resolve(undefined);
  };

  // then insert batches of children sequentially
  return Async.reduceSerial(insertChildrenQueries, graphClient.iterate,
    errHandler, Promise.resolve(undefined));
}

// Lazily build batch insert query
function buildInsertChildrenQuery(
  record: CrawlerRecord, children: string[]
): (g: GraphTraversal) => GraphTraversal {
  return (g: GraphTraversal) =>
    foldApply<GraphTraversal, string>(g, (g, child) => buildInsertChildQuery({
        g,
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
    .V()
    .has("url", "href", childUrl)
    .fold()
    .coalesce(
      unfold(),
      addV("url")
        .property("href", childUrl)
        .property("name", childPageName)
    )
    .V()
    .has("url", "href", parentUrl).as("parent")
    .V()
    .has("url", "href", childUrl).as("child")
    .coalesce(
      inE().where(outV().as("parent")),
      addE("link").from_("parent")
        .property("in", parentPageName)
        .property("out", childPageName)
    );
}
