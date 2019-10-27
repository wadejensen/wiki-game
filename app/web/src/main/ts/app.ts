// @ts-ignore

import {getGraph, getStats, postCrawlerAction} from "./endpoints";
import {ApplicationStats} from "../../../../server/src/main/ts";
import {
  getPauseCrawlButton,
  getStartCrawlButton,
  getStatsContainer
} from "./dom/dom_element_locator";

declare const sigma: any;

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

let paused = false;

setupListeners();
renderGraph(s);
updateStats();

setInterval(() => renderGraph(s), 15000);
setInterval(() => updateStats(), 5000);

async function renderGraph(s: Sigma): Promise<void> {
  if (!paused) {
    const data = await getGraph();
    s.graph.clear();
    s.graph.read(data);
    s.startForceAtlas2();
    setTimeout(function() {s.killForceAtlas2()}, 100);
    s.refresh();
  }
}

async function updateStats() {
  const seedUrl = "Main_Page";
  const stats: ApplicationStats = await getStats(seedUrl);
  const statsContainer = getStatsContainer();
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
  getStartCrawlButton().addEventListener("click", async () => {
    //TODO(wadejensen) load seed
    console.log("Starting crawler");
    try {
      const resp = await postCrawlerAction("start", {});
      console.log("Crawler start acknowledged");
      paused = false;
    } catch (err) {
      console.error("Failed to start crawler!!!")
    }
  });
  getPauseCrawlButton().addEventListener("click", async () => {
    console.log("Pausing crawler");
    try {
      const resp = await postCrawlerAction("pause", {});
      console.log("Crawler pause acknowledged");
      paused = true;
    } catch (err) {
      console.error("Failed to start crawler!!!")
    }
  });
  // getResetCrawlButton().addEventListener("click", async () => {
  //   console.log("Reset crawler");
  //   console.log(new Date());
  //   const resp = await postCrawlerAction("reset", {});
  //   console.log(new Date());
  // });
}
