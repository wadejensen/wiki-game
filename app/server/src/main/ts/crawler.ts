import {catchError, mergeMap, mergeMapTo, share, tap} from "rxjs/operators";
import {from, Observable, of, Subject, timer} from "rxjs";
import {HTTPClient} from "./http/http_client";
import * as Cheerio from "cheerio";
import {URL} from "url";
import {flatMap} from "./util";
import {Preconditions} from "../../../../common/src/main/ts/preconditions";
import {RemoteSet} from "./cache/remote_set";
import {PriorityQueue} from "./cache/priority_queue";
import {filterByPromise} from "filter-async-rxjs-pipe/dist/src";

export class Crawler {
  private readonly httpClient: HTTPClient;
  private readonly crawlHistory: RemoteSet;
  private readonly queue: PriorityQueue;
  private readonly isValidUrl: (url: string) => boolean;
  private readonly qps: number;

  private isStarted: boolean = false;
  source: Subject<CrawlerTask> = new Subject<CrawlerTask>();
  results: Observable<CrawlerRecord> = new Observable<CrawlerRecord>();
  errors: Subject<CrawlerError> = new Subject<CrawlerError>();

  constructor(
    httpClient: HTTPClient,
    crawlerHistory: RemoteSet,
    queue: PriorityQueue,
    isValidUrl: (url: string) => boolean,
    qps: number,
  ) {
    this.httpClient = httpClient;
    this.crawlHistory = crawlerHistory;
    this.queue = queue;
    this.isValidUrl = isValidUrl;
    this.qps = qps;
  }

  addSeed(url: URL) {
    console.log(`Added seed ${url}`);
    this.source.next(new CrawlerTask(url.href, 0));
  }

  historySize(): Promise<number> {
    return this.crawlHistory.size()
  }

  queueDepth(): Promise<number> {
    return this.queue.size();
  }

  async start() {
    Preconditions.checkState(!this.isStarted, "Crawler has already been started");
    this.isStarted = true;
    this.results = this.source.pipe(
      filterByPromise(async (task: CrawlerTask) =>
        !(await this.crawlHistory.contains(task.url))),
      mergeMap((task) =>
        from(
          this.crawl(task)
        ).pipe(
          catchError((err) => {
            console.log(err);
            this.errors.next(new CrawlerError(task.url, err));
            return of<CrawlerRecord>()
          })
        )
      ),
      tap((record) => this.crawlHistory.add(record.url)),
      share(),
    );

    this.results.subscribe(async (record) => {
      // Put crawler results onto a priority queue
      const prioritizedChildren = record
        .childUrls
        .map(url => [record.degree + 1, url] as [number, string]);
      await this.queue.add(prioritizedChildren);
    });

    // feedback priority queue results into crawler pipeline
    timer(1000, 1000).pipe(
      mergeMap(() => from(this.queue.popMin(Math.ceil(this.qps)))),
      mergeMap((batch: [string, number][]) => from(batch)),
    ).subscribe((entry: [string, number]) =>
      this.source.next(new CrawlerTask(entry[0], entry[1]))
    );

    return this;
  }

  async crawl(task: CrawlerTask): Promise<CrawlerRecord> {
    const html = await this.httpClient
      .get(task.url)
      .then(resp => resp.text());

    // jQuery API reimplemented for Node
    const document = Cheerio.load(html);
    // scrape page for href links
    const hrefs = document("[href]").map((i,tag) => tag.attribs["href"]).get();
    const links: string[] = flatMap(((href: string) => normaliseHref(href, task.url)), hrefs);
    return new CrawlerRecord(task.url, task.degree,
      Array.from(new Set(links.filter(this.isValidUrl))));
  }
}

function normaliseHref(href: string, sourceUrl: string): string[] {
  // Include only with "http" and "https" schemes
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return [href.replace("http://", "https://")];
  } else if (href.match("[-a-zA-Z0-9]+://.*")) {
    // ignore unwanted url schemes
    return [];
  }
  else {
    const url = new URL(href, sourceUrl);
    // Ignore page fragment subsection link
    url.hash = "";
    return [url.href];
  }
}

export class CrawlerTask {
  constructor(
    readonly url: string,
    readonly degree: number,
  ) {}

  toString() {
    return JSON.stringify(this, null, 2);
  }
}

export class CrawlerRecord {
  constructor(
    readonly url: string,
    readonly degree: number,
    readonly childUrls: string[],
  ) {}

  toString() {
    return JSON.stringify(this, null, 2);
  }
}

export class CrawlerError {
  constructor(
    readonly url: string,
    readonly err: string,
  ) {}

  toString() {
    return JSON.stringify(this, null, 2);
  }
}
