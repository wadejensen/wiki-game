// @ts-ignore

import {getGraph, getGraphLive, getGraphLive2, getStats} from "./endpoints";
import {ApplicationStats} from "../../../../server/src/main/ts";
import {getStatsContainer} from "./dom/dom_element_locator";

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

setInterval(() => updateStats(), 10000);

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

async function updateStats() {
  const seedUrl = "Main_Page";
  const stats: ApplicationStats = await getStats(seedUrl);
  const statsContainer = getStatsContainer();
  console.log("Updating stats");
  console.log(statsContainer);
  statsContainer.innerHTML =
`<p>   Pages crawled: <span class="stats-value">${stats.numPagesCrawled.toLocaleString()  || "no data"}</span></p>
<p>    Pages queued: <span class="stats-value">${stats.queueDepth.toLocaleString()  || "no data"}</span></p>
<p>    Cluster size: <span class="stats-value">${stats.instanceCount.toLocaleString()  || "no data"}</span></p>
<p>&nbsp;</p>
<p>1st degree links: <span class="stats-value">${stats.firstDegreeVertices.toLocaleString() || "no data"}</span></p>
<p>2nd degree links: <span class="stats-value">${stats.secondDegreeVertices.toLocaleString() || "no data"}</span></p>
<p>3rd degree links: <span class="stats-value">${stats.thirdDegreeVertices.toLocaleString() || "no data"}</span></p>
<p>4th degree links: <span class="stats-value">${stats.forthDegreeVertices.toLocaleString() || "no data"}</span></p>
<p> All Wikis found: <span class="stats-value">${stats.totalVertices.toLocaleString() || "no data"}</span></p>
`
}
