import {catchError, distinct, mergeMap} from "rxjs/operators";
import {from, of, Subject} from "rxjs";
import {RateLimitedHTTPClient} from "./http/rate_limited_http_client";
import {FetchHTTPClient} from "./http/fetch_http_client";
import {LosslessThrottle} from "./lossless_throttle";
import {HTTPClient} from "./http/http_client";
import * as Cheerio from "cheerio";
import {URL} from "url";
import {flatMap} from "./util";

export class Crawler {
  readonly source: Subject<string>;
  readonly results: Subject<CrawlerRecord>;
  readonly errors: Subject<CrawlerError>;

  constructor(
    source: Subject<string>,
    crawlerResults: Subject<CrawlerRecord>,
    crawlerErrors: Subject<CrawlerError>,
  ) {
    this.source = source;
    this.results = crawlerResults;
    this.errors = crawlerErrors;
  }

  addSeed(url: URL) {
    this.source.next(url.href);
  }

  static create(): Crawler {
    const httpClient = new RateLimitedHTTPClient(
      new FetchHTTPClient(3000, 3, 300, true),
      new LosslessThrottle(3),
    );
    const localCrawlFn = (i: number, url: string) =>
      crawl(httpClient, i, url);
    const remoteCrawlFn = (i: number, url: string) =>
      Promise.reject("Not implemented");

    const source = new Subject<string>();
    const errors = new Subject<CrawlerError>();
    const results = source.pipe(
      //TODO(wadejensen) drain distinct buffer strategy to avoid hitting memory limits
      distinct(),
      //TODO(wadejensen) drain some of the pipeline to perform remote execution
      mergeMap( (url, i) =>
        from(
          localCrawlFn(i, url)
        ).pipe(catchError((err) => {
          errors.next(new CrawlerError(i, url, err));
          return of<CrawlerRecord>()
        }))
      ),
    ) as Subject<CrawlerRecord>;

    // constantly feed crawler results back into the crawler
    results.subscribe((record) =>
      record.childUrls.forEach(
        child => source.next(child)
      )
    );

    return new Crawler(source, results, errors);
  }
}

async function crawl(
  httpClient: HTTPClient,
  i: number,
  url: string
): Promise<CrawlerRecord> {
  const html = await httpClient
    .get(url)
    .then(resp => resp.text());

  // jQuery API reimplemented for Node
  const document = Cheerio.load(html);
  // scrape page for href links
  const hrefs = document("[href]").map((i,tag) => tag.attribs["href"]).get();
  const links = flatMap(((href: string) => normaliseHref(href, url)), hrefs);
  return new CrawlerRecord(i, url, links);
}

function normaliseHref(href: string, sourceUrl: string): string[] {
  // Include only with "http" and "https" schemes
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return [href];
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

export class CrawlerRecord {
  constructor(
    readonly i: number,
    readonly parentUrl: string,
    readonly childUrls: string[],
  ) {}

  toString() {
    return JSON.stringify(this, null, 2);
  }
}


export class CrawlerError {
  constructor(
    readonly i: number,
    readonly url: string,
    readonly err: string,
  ) {}

  toString() {
    return JSON.stringify(this, null, 2);
  }
}
