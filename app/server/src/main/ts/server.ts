import compression from "compression"
import express, {Request, Response} from "express";

import {sys} from "typescript";
import * as path from "path";
import {process} from "gremlin";
import {graphson} from "../../../../common/src/main/ts/gremlin";
import {graphmodel} from "../../../../common/src/main/ts/graph";
import {graphClient} from "./server_module";
import bodyParser = require("body-parser");

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
  constructor() {}

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

    app.get('/graph', (req: Request, res: Response) => {
      const graph = {
        nodes: [
          { id: "n0", label: "A node", x: Math.random(), y: Math.random(), size: 1, color: '#008cc2' },
          { id: "n1", label: "Another node", x: Math.random(), y: Math.random(), size: 1, color: '#008cc2' },
          { id: "n2", label: "And a last one", x: Math.random(), y: Math.random(), size: 1, color: '#E57821' }
        ],
        edges: [
          { id: "e0", source: "n0", target: "n1", color: '#282c34', type:'line', size:0.5 },
          { id: "e1", source: "n1", target: "n2", color: '#282c34', type:'curve', size:1},
        ]
      };
      res.send(graph);
    });

    app.get('/graph-live', async (req: Request, res: Response) => {
      const g = await graphClient();
      const sg: graphson.GraphSON = await g.next((g) => g
        .V()
        .has("num", "i", "1")
        .repeat(outE().subgraph('subGraph').inV()).times(10).cap('subGraph')
      ).then(r => r.value);
      console.log(sg);

      const nodes: any = sg.vertices.map( (vert: graphson.Vertex) => {
        return {
          id: vert["@value"].id["@value"].toString(),
          label: vert["@value"].properties["i"][0]["@value"].value,
          x: Math.random(),
          y: Math.random(),
          color: "#000",
          size: 5,
        }
      });

      const edges: graphmodel.Edge[] = sg.edges.map((e: graphson.Edge) => {
        return {
          id: e["@value"].id["@value"].toString(),
          label: e["@value"].label,
          source: e["@value"].outV["@value"].toString(),
          target: e["@value"].inV["@value"].toString(),
          color: "#000",
          size: 5,
          type: "line",
        }
      });

      const data: graphmodel.Graph = { nodes, edges };
      res.send(data);
    });

    app.get('/graph-live2', async (req: Request, res: Response) => {
      console.log("Start gremlin request");
      const g = await graphClient();
      const sg: graphson.GraphSON = await g.next((g) => g.
        V().
        has("name", "Main_Page").
        repeat(
          flatMap(
            outE().
            as("edges").
            inV().
            dedup().
            order().by(bothE().count(), desc).
            limit(10).
            select("edges").
            subgraph("subgraph").
            inV()
          ).
          dedup()
        ).
        times(3).
        simplePath().
        cap("subgraph")
      ).then(r => r.value);

      console.log(sg);
      console.log("Stop gremlin request");

      const nodes: any = sg.vertices.map( (vert: graphson.Vertex) => {
        return {
          id: vert["@value"].id["@value"].toString(),
          label: vert["@value"].properties["name"][0]["@value"].value,
          x: Math.random(),
          y: Math.random(),
          color: "#000",
          size: 5,
        }
      });

      const edges: graphmodel.Edge[] = sg.edges.map((e: graphson.Edge) => {
        return {
          id: e["@value"].id["@value"].toString(),
          label: e["@value"].label,
          source: e["@value"].outV["@value"].toString(),
          target: e["@value"].inV["@value"].toString(),
          color: "#000",
          size: 5,
          type: "line",
        }
      });

      const data: graphmodel.Graph = { nodes, edges };
      console.log(data);
      res.send(data);
    });

    app.listen(3000, () => console.log("Listening on port 3000"));
  }
}
