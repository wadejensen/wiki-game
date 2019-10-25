// @ts-ignore

import {getGraph, getGraphLive, getGraphLive2} from "./endpoints";

declare const sigma: any;

console.log("Hello World!!");

console.log(sigma);
type Sigma = any;

const s = new sigma(
  {
    renderers: [{
      container: document.getElementById('graph'),
      type: 'canvas'
    }],
    settings: {}
  }
);

//renderGraph(s);

renderGraphLive2(s);

//setInterval(() => renderGraphLive2(s), 7000);

async function renderGraph(s: Sigma): Promise<void> {
  const data = await getGraph();
  console.log(data);
  s.graph.read(data);
  s.startForceAtlas2();
  window.setTimeout(function() {s.killForceAtlas2()}, 10000);
  s.refresh();
}

async function renderGraphLive(s: Sigma): Promise<void> {
  const data = await getGraphLive();
  console.log(data);
  s.graph.read(data);
  s.startForceAtlas2();
  window.setTimeout(function() {s.killForceAtlas2()}, 10000);
  s.refresh();
}

async function renderGraphLive2(s: Sigma): Promise<void> {
  const data = await getGraphLive2();
  console.log("Fetching graph data");
  console.log(data);
  s.graph.read(data);
  s.startForceAtlas2();
  window.setTimeout(function() {s.killForceAtlas2()}, 10000);
  s.refresh();
}
