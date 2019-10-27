import fs from "fs";
import * as AWS from 'aws-sdk';
import * as gremlin from "gremlin";
import {process as p} from "gremlin";
import {
  crawlerFlag,
  graphClient,
  gremlinConcurrency,
  redisClient,
  wikipediaCrawler
} from "./server_module";
import {CrawlerRecord} from "./crawler";
import {insertCrawlerRecord} from "./graph";

import {from, of} from "rxjs";
import {catchError, mergeMap, tap} from "rxjs/operators";
import {Server} from "./server";
import {GremlinConnection} from "./graph/gremlin_connection";
import {Preconditions} from "../../../../common/src/main/ts/preconditions";
import {sys} from "typescript";
import {logger} from "../../../../common/src/main/ts/logger";
import {Async} from "../../../../common/src/main/ts/async";
import {Flag} from "./flag";
import GraphTraversal = p.GraphTraversal;
import {getGraphStats, getScalingStats, publishQueueDepthMetric} from "./stats";

const addV = gremlin.process.statics.addV;
const addE = gremlin.process.statics.addE;
const fold = gremlin.process.statics.fold;
const unfold = gremlin.process.statics.unfold;
const inV = gremlin.process.statics.inV;
const outV = gremlin.process.statics.outV;
const inE = gremlin.process.statics.inE;
const outE = gremlin.process.statics.outE;
const out = gremlin.process.statics.out;
const values = gremlin.process.statics.values;
const value = gremlin.process.statics.value;
const loops = gremlin.process.statics.loops;
const has = gremlin.process.statics.has;
const eq = gremlin.process.P.eq;
const gte = gremlin.process.P.gte;
const select = gremlin.process.statics.select;

const ASG_NAME = "wiki";

try {
  start();
} catch (err) {
  logger.error(err);
  sys.exit();
}

async function start() {
  try {
    const seedUrls = getSeed();
    logger.info(`Seed urls: \n${seedUrls}`);
    const gremlin: GremlinConnection = await graphClient();

    const vertexCountQuery = (g: GraphTraversal) => g.V().count();
    await gremlin
      .toList(vertexCountQuery)
      .then(cntArr => logger.info(`Num vertices = ${cntArr[0]}`));

    const cloudwatchClient = new AWS.CloudWatch({ region: process.env.AWS_DEFAULT_REGION });
    const autoscalingClient = new AWS.AutoScaling({ region: process.env.AWS_DEFAULT_REGION });
    const crawler = await wikipediaCrawler().start();
    const server = new Server(gremlin, crawler, cloudwatchClient, autoscalingClient, ASG_NAME).start();

    // log crawler results
    crawler.results.subscribe((record: CrawlerRecord) => {
      logger.info(`${record.url}: deg ${record.degree}, found ${record.childUrls.length} links.`)
    });

    // log crawler errors
    crawler.errors.subscribe((err) => logger.info(`Crawler error: ${err}`));

    // flush crawler results to Graph DB
    const concurrency: number = gremlinConcurrency();
    const flag = crawlerFlag();
    crawler.results.pipe(
        tap((record: CrawlerRecord) => logger.info(record.childUrls.length.toString())),
        mergeMap((record: CrawlerRecord) =>
          from(writeToGraphDb(gremlin, flag, record)),
          concurrency
        ),
        catchError((err) => {
          console.error(`Failed to write to Graph DB due to ${err} ${err.stack}`);
          return of();
        }),
      )
      .subscribe(() => logger.info("Flushed"));

    // publish metrics
    setInterval(async () => {
        const stats = await getScalingStats(cloudwatchClient, autoscalingClient, crawler, ASG_NAME);
        console.info(stats);
        await publishQueueDepthMetric(cloudwatchClient, stats.queueDepth);
    },
      30000
    );
    setInterval(async () =>
        console.info(await getGraphStats(gremlin, "https://en.wikipedia.org/wiki/Main_Page")),
      10000
    );
  } catch (err) {
    console.error(`Unexpected error encountered: ${err}`);
  }
}

async function writeToGraphDb(
  gremlinClient: GremlinConnection,
  flag: Flag,
  record: CrawlerRecord
): Promise<void> {
  if (await flag.enabled()) {
    console.log("Submitting work............");
    return Async.exponentialBackoff(() =>
      insertCrawlerRecord(gremlinClient, record), 3, 3000)
  } else {
    return Promise.resolve();
  }
}

function getSeed(): string[] {
  const seedFilePath = process.env["SEED_FILE"]!;
  logger.info(seedFilePath);
  Preconditions.checkState(!!seedFilePath);
  const seedFile = fs.readFileSync(seedFilePath, "utf8");
  return seedFile
    .split("\n")
    .filter(line => line.length !== 0)
    .map(line => line.trim());
}
