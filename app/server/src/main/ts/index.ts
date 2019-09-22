import fs from "fs";
import {sys} from "typescript";
import {URL} from "url";
import {Crawler, CrawlerRecord} from "./crawler";
import {driver, process, structure} from "gremlin";
import {catchError, mergeMap} from "rxjs/operators";
import {insertCrawlerRecord} from "./graph";
import {from, of} from "rxjs";
import GraphTraversalSource = process.GraphTraversalSource;
import Graph = structure.Graph;

setTimeout(() => sys.exit(0), 30000);
start();

async function start() {
  try {
    const seedUrls = await getSeed();
    console.log(seedUrls);

    const graphClient: GraphTraversalSource = await createGraphDBConnection();
    const crawler = Crawler.create();

    // log crawler results
    crawler.results.subscribe((record: CrawlerRecord) => {
      console.log(`${record.i}: ${record.parentUrl}: found ${record.childUrls.length} links.`)
    });

    // log crawler errors
    crawler.errors.subscribe((err) => console.log(`Crawler error: ${err}`));

    // flush crawler results to Graph DB
    crawler.results.pipe(
      mergeMap((record: CrawlerRecord) =>
        from(insertCrawlerRecord(graphClient, record)).pipe(
        catchError((err) => {
          console.error(`Failed to write to Graph DB due to ${err}`);
          return of();
        })
      )),
    ).subscribe(() => console.log("Flushed"));

    seedUrls.forEach(url => crawler.addSeed(new URL(url)));
    // handle de-duplication
    crawler.addSeed(new URL("https://stackoverflow.com"));
    crawler.addSeed(new URL("https://stackoverflow.com"));
    crawler.addSeed(new URL("https://stackoverflow.com"));

    // error handling case
    crawler.addSeed(new URL(""));
  } catch (err) {
    console.error(`Unexpected error encountered: ${err}`);
  }
}

async function getSeed(): Promise<string[]> {
  const argv = require('yargs').argv;
  console.log(`Seed file: ${argv["seed-file"]}`);

  const seedFilePath = argv["seed-file"];
  const seedFile = await fs
    .promises
    .readFile(seedFilePath, "utf8");
  return seedFile
    .split("\n")
    .filter(line => line.length !== 0)
    .map(line => line.trim());
}

async function createGraphDBConnection(): Promise<GraphTraversalSource> {
  const argv = require('yargs').argv;
  console.log(`Graph DB config file: ${argv["db-conf-file"]}`);

  const dbConfigFilePath = argv["db-conf-file"];
  if (dbConfigFilePath === undefined) {
    throw Error(`Invalid Gremlin config file path: ${dbConfigFilePath}`)
  }
  const dbConfigFile = await fs
    .promises
    .readFile(dbConfigFilePath, "utf-8");

  const conf = JSON.parse(dbConfigFile);
  if (conf.hostname === undefined && conf.port === undefined) {
    throw Error(`Invalid Gremlin config file contents: ${conf}`)
  } else {
    console.log("Creating connection");
    const websocketPath = `ws://${conf.hostname}:${conf.port}/gremlin`;
    // Note: The empty object {} is to work around a bug in the
    // Gremlin JavaScript 3.3.5 and 3.4 clients.
    const DriverRemoteConnection = driver.DriverRemoteConnection;
    const connection = new DriverRemoteConnection(websocketPath, {});
    const graph = new Graph();
    console.log("Connecting to :" + websocketPath);
    const g = graph.traversal().withRemote(connection);
    console.log("Connection created");

    if (conf.clean === true) {
      // drop any pre-existing state
      console.warn("Dropping Graph DB data.");
      await g.V().drop().iterate();
    }
    return g;
  }
}
