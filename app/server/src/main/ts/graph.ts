import {CrawlerRecord} from "./crawler";
import {foldApply, partition} from "../../../../common/src/main/ts/fp/array";
import {process} from "gremlin";
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
  //await doTheNeedful(graphClient);

  // const insertQuery = (g: GraphTraversal) => buildInsertChildQuery({
  //   g: g,
  //   parentUrl: record.url,
  //   parentPageName: inferPageName(record.url),
  //   childUrl: record.childUrls[0],
  //   childPageName: inferPageName(record.childUrls[0]),
  // });
  //
  // return await graphClient.iterate(insertQuery);

  try {
    // console.log(record);
    // console.log(inferPageName(record.url));
    // console.log(inferPageName(record.childUrls[1]));
    // Create small batches of inserts because the Gremlin server doesn't like large requests
    const batchesOfChildren: string[][] = partition(record.childUrls, BATCH_SIZE);
    const insertChildrenQueries: GremlinQueryBuilder[] = batchesOfChildren.map(
      (children: string[]) => buildInsertChildrenQuery(record, children));

    // const insert1 = (g: GraphTraversal) => buildInsertChildQuery({
    //   g: g,
    //   parentUrl: record.url,
    //   parentPageName: inferPageName(record.url),
    //   childUrl: record.childUrls[1],
    //   childPageName: inferPageName(record.childUrls[1]),
    // });
    //
    // const insert2 = (g: GraphTraversal) => buildInsertChildQuery({
    //   g: g,
    //   parentUrl: record.url,
    //   parentPageName: inferPageName(record.url),
    //   childUrl: record.childUrls[2],
    //   childPageName: inferPageName(record.childUrls[2]),
    // });
    //
    // const insert = (g: GraphTraversal) => insert2(insert1(g));
    //
    //
    // console.log(typeof insertChildrenQueries[0]);
    // console.log(insertChildrenQueries[0]);
    //
    // return await graphClient.iterate(insert);
    //

    const errHandler = (err: any) => {
      console.error(err);
      console.error(err.stack);
      sys.exit();
      return Promise.resolve(undefined);
    };

    // insert batches of children sequentially
    return Async.reduceSerial<GremlinQueryBuilder, void>(
      insertChildrenQueries,
      (t: GremlinQueryBuilder) => {
        return Promise
          .resolve()
          .then(() => logger.info("Before"))
          .then(() => graphClient.iterate(t))
          .then(() => logger.info("After"))
          .then(() => Promise.resolve(undefined));
      },
      errHandler,
      Promise.resolve(undefined));
  } catch (err) {
    console.error(err);
    return undefined;
  }
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
