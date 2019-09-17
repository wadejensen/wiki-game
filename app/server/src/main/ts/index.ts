import * as Cheerio from "cheerio";
import {RateLimitedHTTPClient} from "./http/rate_limited_http_client";
import {FetchHTTPClient} from "./http/fetch_http_client";
import {LosslessThrottle} from "./lossless_throttle";
import {Observable, Observer, Subject} from "rxjs";
import {HTTPClient} from "./http/http_client";
import fs from "fs";
import {sys} from "typescript";
import {URL} from "url";
import {bufferTime, count, distinct, map, scan, tap, windowCount, windowTime} from 'rxjs/operators';
import {SubjectSubscriber} from "rxjs/internal/Subject";
import {url} from "inspector";

start();

async function start() {
  const argv = require('yargs').argv;
  console.log("Hello World");
  console.log(`Seed file: ${argv["seed-file"]}`);

  const httpClient = new RateLimitedHTTPClient(
    new FetchHTTPClient(3000, 3, 300, true),
    new LosslessThrottle(2),
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
  const crawler = new Subject<string>()

  const sub1 = crawler
    .pipe(
      distinct(),
      map(url => 1),
      scan(count => count + 1),
    ).subscribe((res: number) => console.log(res));


  seedUrls.map(url => crawl(crawler, httpClient, url));
}

async function crawl(subject: Subject<string>, httpClient: HTTPClient, url: string): Promise<void> {
  try {
    const resp = await httpClient.get(url);
    const html = await resp.text();

    // jQuery API reimplemented for Node
    const document = Cheerio.load(html);
    // scrape page for href links
    const hrefs = document("[href]").map((i,tag) => tag.attribs["href"]).get();
    const links = hrefs.map(href => normaliseHref(href, url));
    links.forEach((val, i) => subject.next(val));
    links.forEach(link => crawl(subject, httpClient, link));
  } catch (err) {
    console.log(err);
    console.log(`Could not parse contents of ${url} as HTML`);
  }
}

function normaliseHref(href: string, sourceUrl: string): string {
  // Include only with "http" and "https" schemes
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  } else {
    const url = new URL(href, sourceUrl);
    // Ignore page fragment subsection link
    url.hash = "";
    return url.href
  }
}

