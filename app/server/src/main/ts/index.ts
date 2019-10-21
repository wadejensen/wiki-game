import fs from "fs";
import * as AWS from 'aws-sdk';
import * as gremlin from "gremlin";
import {process as p} from "gremlin";
import {
  graphClient,
  gremlinConcurrency,
  redisClient,
  wikipediaCrawler
} from "./server_module";
import {Crawler, CrawlerRecord} from "./crawler";
import {insertCrawlerRecord} from "./graph";
// RxJS v6+
import {from, of} from "rxjs";
import {catchError, concatMap, mergeMap, tap} from "rxjs/operators";
import {Server} from "./server";
import {URL} from "url";
import {GremlinConnection, GremlinQueryBuilder} from "./graph/gremlin_connection";
import {Preconditions} from "../../../../common/src/main/ts/preconditions";
import {sys} from "typescript";
import GraphTraversal = p.GraphTraversal;
import {createGraphDBConnection} from "./graph/gremlin";
import {logger} from "../../../../common/src/main/ts/logger";
import {Async} from "../../../../common/src/main/ts/async";
import CloudWatch = require("aws-sdk/clients/cloudwatch");
import {AutoScaling} from "aws-sdk";
import {AutoScalingGroup, Instance} from "aws-sdk/clients/autoscaling";


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

new Server().start();
try {
  start();
} catch (err) {
  logger.error(err);
  sys.exit();
}

// async function start() {
//   const g = await createGraphDB();
//   await g.V().drop().iterate();
//   await g
//     .addV("url")
//       .property("hreff", "en.wikipedia.com/wiki/Main_page")
//       .property("namee", "Main_page")
//     .iterate();
//
//   setTimeout(() => {
//     g.V().limit(10).valueMap().toList().
//     then(data => {
//       console.info(data);
//     }).catch(error => {
//       console.info('ERROR', error);
//     });
//   }, 1000);
//
//   const gremlin: GremlinConnection = await graphClient();
//   const addVertex = (grr: GraphTraversal) => grr
//     .V()
//     .addV("url")
//     .property("hreffff", "en.wikipedia.com/wiki/Main_page")
//     .property("nameeee", "Main_page");
//
//   const resp = await gremlin.iterate(addVertex);
//   console.info(resp);
//   setTimeout(() => {
//     g.V().limit(10).valueMap().toList().
//     then(data => {
//       console.info("Part 1");
//       console.info(data);
//     }).catch(error => {
//       console.info('ERROR', error);
//     });
//   }, 1000);
//   setTimeout(() => {
//     gremlin.toList((ggrr: any) => ggrr.V().limit(10).valueMap()).
//     then(data => {
//       console.info("Part 2");
//       console.info(data);
//     }).catch(error => {
//       console.info('ERROR', error);
//     });
//   }, 1000);
// }

async function start() {
  try {
    const seedUrls = getSeed();
    logger.info(`Seed urls: \n${seedUrls}`);
    //const redisConnection = redisClient("debugger");
    //await redisConnection.del("history");
    //await redisConnection.del("queue");
    const gremlin: GremlinConnection = await graphClient();

    const vertexCountQuery = (g: GraphTraversal) => g.V().count();
    const vertexShowQuery = (g: GraphTraversal) => g.V().limit(10).valueMap();

    logger.info("Drop all vertices");
    //await gremlin.iterate((g: GraphTraversal) => g.V().drop());
    await gremlin
      .toList(vertexCountQuery)
      .then(cntArr => logger.info(`Num vertices = ${cntArr[0]}`));

    logger.info("Schedule vertex count");
    setInterval(() => gremlin.toList(vertexCountQuery).then(logger.info), 1000);
    //setInterval(() => gremlin.toList(vertexShowQuery).then(logger.info), 2000);

    //await resetGraphDb(gremlin, 0);
    const crawler = await wikipediaCrawler().start();

    // log crawler results
    crawler.results.subscribe((record: CrawlerRecord) => {
      logger.info(`${record.url}: deg ${record.degree}, found ${record.childUrls.length} links.`)
    });

    // log crawler errors
    crawler.errors.subscribe((err) => logger.info(`Crawler error: ${err}`));

    // flush crawler results to Graph DB
    const concurrency: number = gremlinConcurrency();
    crawler.results.pipe(
        tap((record: CrawlerRecord) => logger.info(record.childUrls.length.toString())),
        mergeMap((record: CrawlerRecord) => from(
          Async.exponentialBackoff(() =>
            insertCrawlerRecord(gremlin, record), 3, 3000)
        ), concurrency),
        catchError((err) => {
          console.error(`Failed to write to Graph DB due to ${err} ${err.stack}`);
          return of();
        }),
      )
      .subscribe(() => logger.info("Flushed"));

    seedUrls.forEach(url => crawler.addSeed(new URL(url)));

    // publish metrics
    const cloudwatchClient = new AWS.CloudWatch({ region: 'ap-southeast-2' });
    const autoscalingClient = new AWS.AutoScaling({ region: 'ap-southeast-2' })

    setInterval(async () =>
        console.info(await scalingStats(cloudwatchClient, autoscalingClient, crawler, ASG_NAME)),
      3000
    );
    setInterval(async () =>
        console.info(await graphStats(gremlin, "https://en.wikipedia.org/wiki/Main_Page")),
      10000
    );

  } catch (err) {
    console.error(`Unexpected error encountered: ${err}`);
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

async function resetGraphDb(gremlin: GremlinConnection, i: number): Promise<void> {
  try {
    if (i > 10) {
      console.error("Failed to clear graph db state");
      sys.exit(1);
      return
    }
    logger.info("Dropping vertices and edges...");
    //await gremlin.iterate((g) => g.V().drop());
  } catch (err) {
    console.error(err);
    await resetGraphDb(gremlin, i + 1);
  }
}

class ScalingStats {
  constructor(
    readonly numPagesCrawled: number,
    readonly queueDepth: number,
    readonly instanceCount: number,
  ) {}

  toString() {
    return JSON.stringify(this, null, 2);
  }
}

class GraphStats {
  constructor(
    readonly firstDegreeVertices: number,
    readonly secondDegreeVertices: number,
    readonly thirdDegreeVertices: number,
    readonly forthDegreeVertices: number,
  ) {}

  toString() {
    return JSON.stringify(this, null, 2);
  }
}

async function scalingStats(
    cloudwatchClient: CloudWatch,
    autoscalingClient: AutoScaling,
    crawler: Crawler,
    asgName: string,
): Promise<ScalingStats> {
  const numCrawledPages = await crawler.historySize();
  console.log(`Num crawled pages: ${numCrawledPages}`);
  const numQueuedPages = await crawler.queueDepth();
  console.log(`Num queued pages: ${numQueuedPages}`);
  const instanceCount = await getAutoscalingGroupSize(autoscalingClient, asgName);
  console.log(`Num instances: ${instanceCount}`);
  return new ScalingStats(numCrawledPages, numQueuedPages, instanceCount);
}

async function graphStats(gremlinClient: GremlinConnection, seedUrl: string): Promise<GraphStats> {
  return new GraphStats(
    await numVerticesQuery(gremlinClient, seedUrl, 1),
    await numVerticesQuery(gremlinClient, seedUrl, 2),
    await numVerticesQuery(gremlinClient, seedUrl, 3),
    await numVerticesQuery(gremlinClient, seedUrl, 4),
  );
}

function numVerticesQuery(
    gremlinConnection: GremlinConnection,
    url: string,
    degreesOfSeparation: number,
): Promise<number> {
  const query = (g: GraphTraversal) => g.
    V().
    has("url", "href", url).
    repeat(outE().where(has("degree", loops())).inV()).
    times(degreesOfSeparation).
    simplePath().
    count();

  return gremlinConnection
    .next(query)
    .then(res => res.value as number)
}

//aws describe-auto-scaling-groups --auto-scaling-group-names wiki
async function publishCrawlerMetrics(
    cloudwatchClient: CloudWatch,
    autoscalingClient: AutoScaling,
    crawler: Crawler
): Promise<void> {


  await cloudwatchClient.putMetricData().promise();
  var params = {
    MetricData: [
      {
        MetricName: 'PAGES_VISITED',
        Dimensions: [
          {
            Name: 'UNIQUE_PAGES',
            Value: 'URLS'
          },
        ],
        Unit: 'None',
        Value: 1.0
      },
    ],
    Namespace: 'SITE/TRAFFIC'
  };
}

async function getAutoscalingGroupSize(autoscalingClient: AutoScaling, asgName: string): Promise<number> {
  const resp = await autoscalingClient
    .describeAutoScalingGroups({ AutoScalingGroupNames: [ASG_NAME] })!
    .promise()
    .catch((err) => logger.error(err));

  const asgs = resp
    .AutoScalingGroups
    .filter((asg: AutoScalingGroup) => asg.AutoScalingGroupName == asgName);

  logger.info(asgs);

  return asgs.length != 0
    ? asgs.Instances!.filter((inst: Instance) => inst.LifecycleState == "InService")!.length
    : 0;
}
