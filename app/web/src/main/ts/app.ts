// @ts-ignore

import {getGraph, getStats, postCrawlerAction} from "./endpoints";
import {ApplicationStats} from "../../../../server/src/main/ts";
import {
  getPauseCrawlButton,
  getResetCrawlButton,
  getStartCrawlButton,
  getStatsContainer
} from "./dom/dom_element_locator";

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
    settings: {
      labelThreshold: 2.5,
      labelColor: "node",
      edgeColor: "target",
    }
  }
);

setupListeners();
renderGraph(s);
updateStats();

setInterval(() => renderGraph(s), 15000);
setInterval(() => updateStats(), 5000);

async function renderGraph(s: Sigma): Promise<void> {
  s.killForceAtlas2();
  const data = await getGraph();
  console.log("Fetching graph data");
  console.log(data);
  s.graph.clear();
  s.graph.read(data);
  s.startForceAtlas2();
  setTimeout(function() {s.killForceAtlas2()}, 7000);
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

function setupListeners() {
  console.log("Setting up event listeners");
  getStartCrawlButton().addEventListener("click", () => {
    //TODO(wadejensen) load seed
    console.log("Starting crawler");
    postCrawlerAction("start", {});
  });
  getPauseCrawlButton().addEventListener("click", () => {
    console.log("Pausing crawler");
    postCrawlerAction("pause", {});
  });
  getResetCrawlButton().addEventListener("click", async () => {
    console.log("Reset crawler");
    console.log(new Date());
    const resp = await postCrawlerAction("reset", {});
    console.log(new Date());
  });
}
