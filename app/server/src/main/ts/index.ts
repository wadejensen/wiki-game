import fs from "fs";
import * as gremlin from "gremlin";
import {graphClient, redisClient, wikipediaCrawler} from "./server_module";
import {CrawlerRecord} from "./crawler";
import {insertCrawlerRecord} from "./graph2";
// RxJS v6+
import {from, Observable, of, Subject, Subscription} from "rxjs";
import {catchError, concatMap, mapTo, mergeMap, share, tap} from "rxjs/operators";
import {Server} from "./server";
import {URL} from "url";
import {GremlinConnection} from "./graph/gremlin_connection";
import {Preconditions} from "../../../../common/src/main/ts/preconditions";
import {sys} from "typescript";

const addV = gremlin.process.statics.addV;
const addE = gremlin.process.statics.addE;
const fold = gremlin.process.statics.fold;
const unfold = gremlin.process.statics.unfold;
const inV = gremlin.process.statics.inV;
const outV = gremlin.process.statics.outV;
const inE = gremlin.process.statics.inE;
const outE = gremlin.process.statics.outE;

new Server().start();
start();

async function start() {
  try {
    const seedUrls = getSeed();
    console.log(`Seed urls: \n${seedUrls}`);
    const redisConnection = redisClient("debugger");
    await redisConnection.del("history");
    await redisConnection.del("queue");
    const gremlin: GremlinConnection = await graphClient();
    //await resetGraphDb(gremlin, 0);
    const crawler = await wikipediaCrawler().start();

    // log crawler results
    crawler.results.subscribe((record: CrawlerRecord) => {
      console.log(`${record.url}: deg ${record.degree}, found ${record.childUrls.length} links.`)
    });

    // log crawler errors
    crawler.errors.subscribe((err) => console.log(`Crawler error: ${err}`));

    // flush crawler results to Graph DB
    crawler.results.pipe(
        tap((record: CrawlerRecord) => console.log(record.childUrls.length)),
        concatMap((record: CrawlerRecord) => from(insertCrawlerRecord(gremlin, record))),
        catchError((err) => {
          console.error(`Failed to write to Graph DB due to ${err}`);
          return of();
        }),
        tap((x) => console.log(Math.random())),
      )
      .subscribe(() => console.log("Flushed"));

    // handle de-duplication
    // crawler.addSeed(new URL("https://stackoverflow.com"));
    // crawler.addSeed(new URL("https://stackoverflow.com"));
    // crawler.addSeed(new URL("https://stackoverflow.com"));

    // error handling case
    //crawler.addSeed(new URL(""));

    seedUrls.forEach(url => crawler.addSeed(new URL(url)));
  } catch (err) {
    console.error(`Unexpected error encountered: ${err}`);
  }
}

function getSeed(): string[] {
  const seedFilePath = process.env["SEED_FILE"]!;
  console.log(seedFilePath);
  Preconditions.checkState(!!seedFilePath);
  const seedFile = fs.readFileSync(seedFilePath, "utf8");
  return seedFile
    .split("\n")
    .filter(line => line.length !== 0)
    .map(line => line.trim());
}

async function resetGraphDb(gremlin: GremlinConnection, i: number): Promise<void> {
  try {
    if (i > 10) {
      console.error("Failed to clear graph db state");
      sys.exit(1);
      return
    }
    console.log("Dropping vertices and edges...");
    await gremlin.iterate((g) => g.V().drop());
  } catch (err) {
    console.error(err);
    await resetGraphDb(gremlin, i + 1);
  }
}
