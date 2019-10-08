import {CrawlerRecord} from "./crawler";
import {foldApply, partition} from "../../../../common/src/main/ts/fp/array";
import {process} from "gremlin";
import GraphTraversal = process.GraphTraversal;

import Traverser = process.Traverser;
import {exit} from "./util";
import GraphTraversalSource = process.GraphTraversalSource;

const addV = process.statics.addV;
const addE = process.statics.addE;
const fold = process.statics.fold;
const unfold = process.statics.unfold;
const inV = process.statics.inV;
const outV = process.statics.outV;
const inE = process.statics.inE;
const outE = process.statics.outE;

const BATCH_SIZE = 100;

// Inserts page crawl results into the graph DB.
// Creates multiple insert traversals containing batches of vertices and edges
// to avoid overwhelming the database connection with large batches.
export async function insertCrawlerRecord2(graphClient: GraphTraversalSource, record: CrawlerRecord): Promise<void> {
  // Create small batches of inserts because the Gremlin server doesn't like large requests
  const batchesOfChildren: string[][] = partition(record.childUrls, BATCH_SIZE);
  const insertChildrenQueries = batchesOfChildren.map((children: string[]) =>
    buildInsertChildrenQuery2(graphClient as unknown as GraphTraversal, record.parentUrl, children));

  // then insert batches of children concurrently
  await Promise.all(insertChildrenQueries.map(query => query.iterate()));
}

// Lazily build batch insert query
function buildInsertChildrenQuery2(graph: GraphTraversal, parent: string, children: string[]) {
  return foldApply<GraphTraversal, string>(
    graph,
    (g, child) => buildInsertChildQuery2(g, parent, child),
    children,
  )
}

function buildInsertChildQuery2(graph: GraphTraversal, parent: string, child: string) {
  return graph
    .V()
    .has("url", "href", parent)
    .fold()
    .coalesce(
      unfold(),
      addV("url").property("href", parent)
    ).as("parent")
    .V()
    .has("url", "href", child)
    .fold()
    .coalesce(
      unfold(),
      addV("url").property("href", child)
    ).as("child")
    .V()
    .has("url", "href", parent)
    .V()
    .has("url", "href", child)
    .coalesce(
      inE().where(outV().as("parent")),
      addE("link").from_("parent")
    );
}
