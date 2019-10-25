export function getSourceSearch(): HTMLDivElement {
  return document.getElementById('src-search') as HTMLDivElement;
}

export function getDestSearch(): HTMLDivElement {
  return document.getElementById('src-search') as HTMLDivElement;
}

export function getStartCrawlButton(): HTMLButtonElement {
  return document.getElementById("start-crawl-button")! as HTMLButtonElement;
}

export function getPauseCrawlButton(): HTMLButtonElement {
  return document.getElementById("pause-crawl-button")! as HTMLButtonElement;
}

export function getResetCrawlButton(): HTMLButtonElement {
  return document.getElementById("reset-crawl-button")! as HTMLButtonElement;
}

export function getStatsContainer(): HTMLDivElement {
  return document.getElementById("stats-container")! as HTMLDivElement;
}
