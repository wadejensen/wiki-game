import * as AWS from "aws-sdk";
import {Crawler} from "./crawler";
import {GremlinConnection} from "./graph/gremlin_connection";
import {logger} from "../../../../common/src/main/ts/logger";
import {AutoScalingGroup, Instance} from "aws-sdk/clients/autoscaling";
import * as gremlin from "gremlin";
import GraphTraversal = gremlin.process.GraphTraversal;
import {GraphStats, ScalingStats} from "../../../../common/src/main/ts/stats";

const addV = gremlin.process.statics.addV;
const addE = gremlin.process.statics.addE;
const fold = gremlin.process.statics.fold;
const unfold = gremlin.process.statics.unfold;
const inV = gremlin.process.statics.inV;
const outV = gremlin.process.statics.outV;
const out = gremlin.process.statics.out;
const inE = gremlin.process.statics.inE;
const bothE = gremlin.process.statics.bothE;
const both = gremlin.process.statics.both;
const outE = gremlin.process.statics.outE;
const property = gremlin.process.statics.property;
const desc = gremlin.process.order.desc;
const flatMap = gremlin.process.statics.flatMap;
const loops = gremlin.process.statics.loops;
const has = gremlin.process.statics.has;
const eq = gremlin.process.P.eq;
const gte = gremlin.process.P.gte;
const select = gremlin.process.statics.select;

export async function getScalingStats(
  cloudwatchClient: AWS.CloudWatch,
  autoscalingClient: AWS.AutoScaling,
  crawler: Crawler,
  asgName: string,
): Promise<ScalingStats> {
  const numCrawledPages = await crawler.historySize();
  const numQueuedPages = await crawler.queueDepth();
  // Record a queue depth of zero when the crawler is paused
  try {
    const queueDepthMetric = (await crawler.enabled()) ? numQueuedPages : 0;
    const instanceCount = await getAutoscalingGroupSize(autoscalingClient, asgName);
    return new ScalingStats(numCrawledPages, queueDepthMetric, instanceCount);
  } catch (err) {
    throw new Error(err);
  }
}

export async function getGraphStats(gremlinClient: GremlinConnection, seedUrl: string): Promise<GraphStats> {
  return new GraphStats(
    await numVerticesQuery(gremlinClient, seedUrl, 1),
    await numVerticesQuery(gremlinClient, seedUrl, 2),
    await numVerticesQuery(gremlinClient, seedUrl, 3),
    await numVerticesQuery(gremlinClient, seedUrl, 4),
    await countVerticesQuery(gremlinClient),
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
  repeat(outE().where(has("degree", loops())).inV().dedup()).
  times(degreesOfSeparation).
  simplePath().
  count();

  return gremlinConnection
    .next(query)
    .then(res => res.value as number)
}

function countVerticesQuery(gremlinConnection: GremlinConnection): Promise<number> {
  const query = (g: GraphTraversal) => g.V().count();
  return gremlinConnection
    .next(query)
    .then(res => res.value as number)

}

export async function publishQueueDepthMetric(
  cloudwatchClient: AWS.CloudWatch,
  queueDepth: number,
) {
  const params = {
    MetricData: [
      {
        MetricName: 'CRAWLER_QUEUE_DEPTH',
        Unit: 'None',
        Value: queueDepth,
      },
    ],
    Namespace: 'WIKI'
  };
  return await cloudwatchClient
    .putMetricData(params)
    .promise()
}


async function getAutoscalingGroupSize(autoscalingClient: AWS.AutoScaling, asgName: string): Promise<number> {
  const resp = await autoscalingClient
    .describeAutoScalingGroups({ AutoScalingGroupNames: [asgName] })!
    .promise()
    .catch((err) => logger.error(err));

  const asgs = resp
    .AutoScalingGroups
    .filter((asg: AutoScalingGroup) => asg.AutoScalingGroupName == asgName);

  return asgs.length != 0
    ? asgs.Instances!.filter((inst: Instance) => inst.LifecycleState == "InService")!.length
    : 0;
}
