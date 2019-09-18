import * as Cheerio from "cheerio";
import {RateLimitedHTTPClient} from "./http/rate_limited_http_client";
import {FetchHTTPClient} from "./http/fetch_http_client";
import {LosslessThrottle} from "./lossless_throttle";
import {ConnectableObservable, EMPTY, from, Observable, Observer, of, Subject} from "rxjs";
import {HTTPClient} from "./http/http_client";
import fs from "fs";
import {sys} from "typescript";
import {URL} from "url";
import {
  bufferTime, catchError, concatMap,
  count,
  distinct,
  map, mergeMap,
  multicast, publish,
  scan,
  tap,
  windowCount,
  windowTime
} from 'rxjs/operators';
import {SubjectSubscriber} from "rxjs/internal/Subject";
import {url} from "inspector";

import fetch, { Request, Response } from "node-fetch"

function flatMap<U, T>(fn: (u: U) => T, arr: U[]) {
  return Array.prototype.concat.apply([], arr.map(fn));
};

start();

// do not get carried away crawling
setTimeout(() => sys.exit(0), 10000);

async function start() {
  const argv = require('yargs').argv;
  console.log("Hello World");
  console.log(`Seed file: ${argv["seed-file"]}`);

  const httpClient = new RateLimitedHTTPClient(
    new FetchHTTPClient(3000, 3, 300, true),
    new LosslessThrottle(1),
  );

  const seedFilePath = argv["seed-file"];
  const seedFile = await fs
    .promises
    .readFile(seedFilePath, "utf8");
  console.log(seedFile);
  const seedUrls = seedFile
    .split("\n")
    .filter(line => line.length !== 0)
    .map(line => line.trim());

  console.log(seedUrls);
  const crawlerSubject = new Subject<string>();

  crawlerSubject.subscribe((url) => crawl(crawlerSubject, httpClient, url));
  crawlerSubject.subscribe((u) => console.log(u));
  crawlerSubject.subscribe((u) => console.log(u));

  seedUrls.forEach(url => crawlerSubject.next(url));
  crawlerSubject.next("https://stackoverflow.com")

  // const counter = distinctUrls
  //   .pipe(
  //     map((url, i) => i),
  //   ).subscribe((count) => console.log(count));


  //const printer = distinctUrls.subscribe((url) => console.log(url));
  //
  // const distinctUrls = crawlerSubject.pipe(
  //   tap(u => console.log(u)),
  //   // ignore urls we have seen before
  //   distinct(),
  //   //TODO(wadejensen) add a remote execution strategy for fanout
  //   mergeMap((url) => crawl(httpClient, url)),
  //   // feedback child links into the crawler pipeline to recursively crawl
  //   tap(([parentUrl, links]) => links.forEach(crawlerSubject.next)),
  //   //TODO(wadejensen) flush result to graph db
  //   tap(([parentUrl, links]) => {}),
  //   map(([parentUrl, links]) => parentUrl),
  //   multicast(() => new Subject<string>()),
  // ) as ConnectableObservable<string>;
}

async function crawl(
  crawlerSubject: Subject<string>,
  httpClient: HTTPClient,
  url: string
): Promise<void> { //[string, string[]]
  try {
    const html = await httpClient
      .get(url)
      .then(resp => resp.text());

    // jQuery API reimplemented for Node
    const document = Cheerio.load(html);
    // scrape page for href links
    const hrefs = document("[href]").map((i,tag) => tag.attribs["href"]).get();
    const links = flatMap(((href: string) => normaliseHref(href, url)), hrefs);
    console.log(links);
    links.forEach(link => crawlerSubject.next(link));
    //return [url, links];
  } catch (err) {
    console.log(err);
    console.log(`Could not parse contents of ${url} as HTML`);
    //return of<[string, string[]]>()
  }
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

