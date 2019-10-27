import compression from "compression"
import express, {Request, Response} from "express";
import {URL} from "url";
import {sys} from "typescript";
import * as path from "path";
import {process} from "gremlin";
import {graphson} from "../../../../common/src/main/ts/gremlin";
import {graphmodel} from "../../../../common/src/main/ts/graph";
import {graphClient} from "./server_module";
const bodyParser = require("body-parser");
import {GremlinConnection, GremlinQueryBuilder} from "./graph/gremlin_connection";
import {GraphStats, getGraphStats, getScalingStats, ScalingStats, ApplicationStats} from "./index";
import {AutoScaling, CloudWatch} from "aws-sdk";
import {Crawler} from "./crawler";

import {x86} from "murmurhash3js"
import GraphTraversal = process.GraphTraversal;
import {logger} from "../../../../common/src/main/ts/logger";
import {Async} from "../../../../common/src/main/ts/async";
import {TryCatch} from "../../../../common/src/main/ts/fp/try";

const addV = process.statics.addV;
const addE = process.statics.addE;
const fold = process.statics.fold;
const unfold = process.statics.unfold;
const inV = process.statics.inV;
const outV = process.statics.outV;
const out = process.statics.out;
const inE = process.statics.inE;
const bothE = process.statics.bothE;
const both = process.statics.both;
const outE = process.statics.outE;
const property = process.statics.property;
const desc = process.order.desc;
const flatMap = process.statics.flatMap;

/**
 * Server instance running on Express middleware
 */
export class Server {
  constructor(
    readonly gremlinClient: GremlinConnection,
    readonly crawler: Crawler,
    readonly cloudwatchClient: CloudWatch,
    readonly autoscalingClient: AutoScaling,
    readonly asgName: string,
  ) {}

  async start() {
    try {
      console.info("Initialized server correctly");
    } catch (e) {
      console.error("Failed to initialize server clients: " + e);
      sys.exit(1);
    }

    // Create Express server
    const app = express();

    app.use(compression());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    // Register static assets relative to '/' route
    app.use('/', express.static(path.join(__dirname + '/static')));
    app.set('views', path.join(__dirname + '/static/views'));

    app.get('/', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "static/views/index.html"));
    });

    // debugging endpoint
    app.get('/healthz', (req: Request, res: Response) => {
      res.status(200);
      res.send(new Date().getTime());
    });

    // app.get('/graph', (req: Request, res: Response) => {
    //   const graph = {
    //     nodes: [
    //       { id: "n0", label: "A node", x: Math.random(), y: Math.random(), size: 1, color: '#008cc2' },
    //       { id: "n1", label: "Another node", x: Math.random(), y: Math.random(), size: 1, color: '#008cc2' },
    //       { id: "n2", label: "And a last one", x: Math.random(), y: Math.random(), size: 1, color: '#E57821' }
    //     ],
    //     edges: [
    //       { id: "e0", source: "n0", target: "n1", color: '#282c34', type:'line', size:0.5 },
    //       { id: "e1", source: "n1", target: "n2", color: '#282c34', type:'curve', size:1},
    //     ]
    //   };
    //   res.send(graph);
    // });

    app.get('/graph', async (req: Request, res: Response) => {
      const sg: graphson.GraphSON = await this.gremlinClient.next((g) => g.
        V().
        has("name", "Main_Page").
        repeat(
          flatMap(
            outE().
            as("edges").
            inV().
            dedup().
            order().by(bothE().count(), desc).by("name", desc).
            limit(8).
            select("edges").
            subgraph("subgraph").
            inV()
          ).
          dedup()
        ).
        times(6).
        simplePath().
        cap("subgraph")
      ).then(r => r.value);

      const nodes: any = sg.vertices.map( (vert: graphson.Vertex) => {
        const id = vert["@value"].id["@value"].toString();
        const rawLabel = vert["@value"].properties["name"][0]["@value"].value;
        const numLinks = getNumLinks(vert);
        const sanitizedLabel = decodeURI(rawLabel).replace(/_/g, " ") + ` (${numLinks.toString()})`;
        const degree = getVertexDegree(vert);
        return {
          id: id,
          label: sanitizedLabel,
          x: numericHash(sanitizedLabel),
          y: numericHash(reverse(sanitizedLabel)),
          color: getColour(degree),
          size: getNodeSize(numLinks),
        }
      });

      const edges: graphmodel.Edge[] = sg.edges.map((e: graphson.Edge) => {
        const id = e["@value"].id["@value"].toString();
        const label = e["@value"].label;
        const source = e["@value"].outV["@value"].toString();
        const target = e["@value"].inV["@value"].toString();
        const degree = getEdgeDegree(e);
        return {
          id: id,
          label: label,
          source: source,
          target: target,
          //color: getColour(degree),
          size: 5,
          type: "line",
        }
      });

      const data: graphmodel.Graph = { nodes, edges };
      //console.log(data);
      res.send(data);
    });

    app.get("/stats/:seed", async (req: Request, res: Response) => {
      // ignored for now
      let seedUrl = `https://en.wikipedia.org/wiki/${req.params.seed}`;
      seedUrl = "https://en.wikipedia.org/wiki/Main_Page";

      const graphStats: GraphStats = await getGraphStats(this.gremlinClient, seedUrl);
      const scaleStats: ScalingStats = await getScalingStats(this.cloudwatchClient,
        this.autoscalingClient, this.crawler, this.asgName);

      const appStats = new ApplicationStats(
        scaleStats.numPagesCrawled,
        scaleStats.queueDepth,
        scaleStats.instanceCount,
        graphStats.firstDegreeVertices,
        graphStats.secondDegreeVertices,
        graphStats.thirdDegreeVertices,
        graphStats.forthDegreeVertices,
        graphStats.totalVertices,
      );
      res.send(appStats);
    });

    app.post("/crawler/control/:action", async (req: Request, res: Response) => {
      const action = req.params.action;
      console.log(`action=${action}`);
      if (action == "start") {
        console.log("Starting crawler");
        await this.crawler.enable();
        await Async.delayP(() =>
          this.crawler.addSeed(new URL("https://en.wikipedia.org/wiki/Main_Page")),
          6000
        );
      } else if (action == "pause") {
        console.log("Pausing crawler");
        await this.crawler.pause();
      } else if (action == "reset") {
        console.log("Reseting crawler");
        await this.crawler.reset();
        await Async.delay(() => resetGraphDb(this.gremlinClient, 0), 3000);
        await Async.delay(() => resetGraphDb(this.gremlinClient, 0), 10000);
        res.status(202).send();
      } else {
        const errMsg = `Unknown crawler action: ${action}`;
        res.status(400).send(errMsg);
        throw new Error(errMsg)
      }

    });

    app.listen(3000, () => console.log("Listening on port 3000"));
  }
}

export async function resetGraphDb(gremlin: GremlinConnection, i: number): Promise<void> {
  try {
    if (i > 10) {
      const errMsg = "Failed to clear graph db state";
      console.error(errMsg);
      throw new Error(errMsg);
    }
    logger.info("Dropping vertices and edges...");
    await gremlin.iterate((g) => g.V().drop());
  } catch (err) {
    console.error(err);
    await resetGraphDb(gremlin, i + 1);
  }
}

/**
 * Returns a random number between 0 and 1 based on a murmur hash
 */
function numericHash(s: string): number {
  const INT32_MAX = 2147483648;
  return x86.hash32(s, 0) / INT32_MAX;
}


function reverse(s: string) {
  return s.split('').reverse().join('');
}

function getNodeSize(numLinks: number): number {
  return Math.pow(Math.log(numLinks + 1), 2);
}

function getNumLinks(v: graphson.Vertex): number {
  return TryCatch(() => {
    return (v as any)["@value"]
      .properties["numLinks"][0]["@value"]
      .value["@value"] as number || 0
  }).getOrElse(() => 0);
}

function getVertexDegree(v: graphson.Vertex): number {
  return TryCatch(() => {
    return (v as any)["@value"]
      .properties["degree"][0]["@value"]
      .value["@value"] as number || 0
  }).getOrElse(() => 0);
}

function getEdgeDegree(e: graphson.Edge): number {
  return TryCatch(() => {
    return (e as any)["@value"]
      .properties["degree"]["@value"]
      .value["@value"] as number || 0;
  }).getOrElse(() => 0);
}

function getColour(degree: number): string {
  const blue = "#1E90FF";
  const red = "#C23B22";
  const green = "#006400";
  const yellow = "#B8860B";
  const purple = "#800080";
  const orange = "#FF8C00";
  const black = "#333333";

  if (degree == 1) {
    return blue;
  } else if (degree == 2) {
    return red;
  } else if (degree == 3) {
    return green;
  } else if (degree == 4) {
    return yellow;
  } else if (degree == 5) {
    return purple;
  } else if (degree == 6) {
    return orange;
  } else {
    return black;
  }
}
