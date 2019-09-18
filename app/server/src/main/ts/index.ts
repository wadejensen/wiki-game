import fs from "fs";
import {sys} from "typescript";
import {URL} from "url";
import {Crawler} from "./crawler";

setTimeout(() => sys.exit(0), 15000);
start();

async function start() {
  try {
    const seedUrls = await getSeed();
    console.log(seedUrls);

    const crawler = Crawler.create();
    crawler.results.subscribe((record) => {
      console.log(`${record.i}: ${record.parentUrl}: found ${record.childUrls.length} links.`)
    });
    crawler.errors.subscribe((err) => console.log(`Crawler error: ${err}`));

    seedUrls.forEach(url => crawler.addSeed(new URL(url)));
    // handle de-duplication
    crawler.addSeed(new URL("https://stackoverflow.com"));
    crawler.addSeed(new URL("https://stackoverflow.com"))
    crawler.addSeed(new URL("https://stackoverflow.com"))

    // error handling case
    crawler.addSeed(new URL(""));
  } catch (err) {
    console.error(`Unexpected error encountered: ${err}`);
  }
}

async function getSeed(): Promise<string[]> {
  const argv = require('yargs').argv;
  console.log(`Seed file: ${argv["seed-file"]}`);

  const seedFilePath = argv["seed-file"];
  const seedFile = await fs
    .promises
    .readFile(seedFilePath, "utf8");
  return seedFile
    .split("\n")
    .filter(line => line.length !== 0)
    .map(line => line.trim());
}
