import {CrawlerRecord} from "./crawler";
import {foldApply, partition} from "../../../../common/src/main/ts/fp/array";
import {process} from "gremlin";
import GraphTraversal = process.GraphTraversal;

import Traverser = process.Traverser;
import {exit} from "./util";
import GraphTraversalSource = process.GraphTraversalSource;

const BATCH_SIZE = 100;

// Inserts page crawl results into the graph DB.
// Creates multiple insert traversals containing batches of vertices and edges
// to avoid overwhelming the database connection with large batches.
export async function insertCrawlerRecord(graphClient: GraphTraversalSource, record: CrawlerRecord): Promise<void> {
  // Insert the parent node first and get its id
  const resp = await graphClient
    .addV("url").as(record.url).property("href", record.url)
    .next();
  const parentId: number = resp.value.id;
  // Create small batches of inserts because the Gremlin server doesn't like large requests
  const batchesOfChildren: string[][] = partition(record.childUrls, BATCH_SIZE);
  const insertChildrenQueries = batchesOfChildren.map((children: string[]) =>
    buildInsertChildrenQuery(graphClient as unknown as GraphTraversal, parentId, children));

  // then insert batches of children concurrently
  await Promise.all(insertChildrenQueries.map(query => query.iterate()));
}

// Lazily build batch insert query
// Because combinators are hard to visualize, the final insert traversal
// would look something like:
//
// graph
//   .V(parentId).as("parent")
//   .addV(children[0])
//   .addE("links").from_("parent").to(children[0])
//   .addV(children[1])
//   .addE("links").from_("parent").to(children[1])
//   .addV(children[2])
//   .addE("links").from_("parent").to(children[2])
//   ...
function buildInsertChildrenQuery(graph: GraphTraversal, parentId: number, children: string[]) {
  return foldApply<GraphTraversal, string>(
    graph.V(parentId).as("parent"),
    (g, child) => buildInsertChildQuery(g, child),
    children,
  )
}

function buildInsertChildQuery(graph: GraphTraversal, child: string) {
  return graph
    .addV("url").property("href", child).as(child)
    .addE("link").from_("parent").to(child)
}
