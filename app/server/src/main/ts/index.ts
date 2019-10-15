import fs from "fs";
import {process, structure} from "gremlin";
import {graphClient, redisClient, wikipediaCrawler} from "./server_module";
import {CrawlerRecord} from "./crawler";
import {insertCrawlerRecord} from "./graph2";
// RxJS v6+
import {from, Observable, of, Subject, Subscription} from "rxjs";
import {catchError, mapTo, mergeMap, share, tap} from "rxjs/operators";
import {Server} from "./server";
import {URL} from "url";
import {GremlinConnection} from "./graph/gremlin_connection";

const addV = process.statics.addV;
const addE = process.statics.addE;
const fold = process.statics.fold;
const unfold = process.statics.unfold;
const inV = process.statics.inV;
const outV = process.statics.outV;
const inE = process.statics.inE;
const outE = process.statics.outE;

// // setTimeout(() => sys.exit(0), 30000);
// start();

//emit value in 1s
//const source: Observable<number> = timer(1000);

// const source = new Observable(function(observer) {
//   observer.next('https://en.wikipedia.org/wiki/Main_Page1');
//   observer.next('https://en.wikipedia.org/wiki/Main_Page2');
//   //observer.complete();
// });

const source = new Subject<string>();

//log side effect, emit result
const example: Observable<string> = source.pipe(
  tap(() => console.log('***SIDE EFFECT***')),
  mapTo('***RESULT***')
);

/*
  ***NOT SHARED, SIDE EFFECT WILL BE EXECUTED TWICE***
  output:
  "***SIDE EFFECT***"
  "***RESULT***"
  "***SIDE EFFECT***"
  "***RESULT***"
*/
const subscribe: Subscription = example.subscribe(val => console.log(val));
const subscribeTwo: Subscription = example.subscribe(val => console.log(val));

//share observable among subscribers
const sharedExample = example.pipe(
  tap(() => console.log('***SIDE EFFECT2***')),
  mapTo("***RESULT2***"),
  share()
);
/*
  ***SHARED, SIDE EFFECT EXECUTED ONCE***
  output:
  "***SIDE EFFECT***"
  "***RESULT***"
  "***RESULT***"
*/
const subscribeThree: Subscription = sharedExample.subscribe(val => console.log(val));
const subscribeFour: Subscription = sharedExample.subscribe(val => console.log(val));

source.next("https://en.wikipedia.org/wiki/Main_Page");

new Server().start();
start();

async function start() {
  try {
    const seedUrls = await getSeed();
    console.log(`Seed urls: \n${seedUrls}`);
    const redisConnection = redisClient();
    await redisConnection.del("history");
    await redisConnection.del("queue");
    const gremlin: GremlinConnection = await graphClient();
    gremlin.iterate((g) => g.V().drop());

    const crawler = await wikipediaCrawler().start();

    // log crawler results
    crawler.results.subscribe((record: CrawlerRecord) => {
      console.log(`${record.url}: found ${record.childUrls.length} links.`)
    });

    // log crawler errors
    crawler.errors.subscribe((err) => console.log(`Crawler error: ${err}`));

    // flush crawler results to Graph DB
    crawler.results.pipe(
      mergeMap((record: CrawlerRecord) =>
        from(insertCrawlerRecord(gremlin, record)).pipe(
        catchError((err) => {
          console.error(`Failed to write to Graph DB due to ${err}`);
          return of();
        })
      )),
    ).subscribe(() => console.log("Flushed"));

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
