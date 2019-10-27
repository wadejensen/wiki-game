import {Crawler} from "./crawler";
import {isValidWikiPage} from "./wiki";
import {FetchHTTPClient} from "./http/fetch_http_client";
import {RateLimitedHTTPClient} from "./http/rate_limited_http_client";
import {HTTPClient} from "./http/http_client";
import {RedisPriorityQueue} from "./cache/redis_priority_queue";
import {RedisSet} from "./cache/redis_set";
import {RateLimitedRedisClient} from "./cache/rate_limited_redis_client";
import {RedisClient} from "./cache/redis_client";
import {AsyncRedisClient} from "./cache/async_redis_client";
import {LossyThrottle} from "../../../../common/src/main/ts/throttle/lossy_throttle";
import {createGraphDBConnection} from "./graph/gremlin";
import {RateLimitedGremlinConnectionPool} from "./graph/rate_limited_gremlin_connection";
import {GremlinConnection} from "./graph/gremlin_connection";
import * as fs from "fs";
import {Preconditions} from "../../../../common/src/main/ts/preconditions";
import {logger} from "../../../../common/src/main/ts/logger";
import {range} from "../../../../common/src/main/ts/fp/array";
import {Flag} from "./flag";
import {RedisFlag} from "./cache/redis_flag";
import {RemoteSet} from "./remote_set";
import {PriorityQueue} from "./priority_queue";

const configFilePath: string = process.env["CONF_FILE"]!;
logger.info(`Reading config from: ${configFilePath}`);
Preconditions.checkState(!!configFilePath);
const conf: any = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
logger.info(conf);

export function wikipediaCrawler(): Crawler {
  return new Crawler(
    httpClient(),
    crawlerHistory(),
    crawlerPriorityQueue(),
    crawlerFlag(),
    isValidWikiPage,
    conf.crawler.qps,
  )
}

function httpClient(): HTTPClient {
  return new RateLimitedHTTPClient(
    new FetchHTTPClient(
      conf.crawler.timeout,
      conf.crawler.retries,
      conf.crawler.backoffDelayMs,
      conf.crawler.exponentialBackoff
    ),
    new LossyThrottle("httpClient", conf.crawler.qps * 2, 3),
  );
}

function crawlerHistory(): RemoteSet {
  return new RedisSet(redisClient("redisHistory"), "history")
}

function crawlerPriorityQueue(): PriorityQueue {
  return new RedisPriorityQueue(redisClient("redisQueue"), "queue");
}

export function crawlerFlag(): Flag {
  return new RedisFlag(redisClient("flag"), "enableCrawler");
}

export function redisClient(name: string): RedisClient {
  return new RateLimitedRedisClient(
    AsyncRedisClient.create({ host: conf.redis.host, port: conf.redis.port }),
    new LossyThrottle(name, conf.redis.qps,
      conf.redis.retries),
  );
}

export async function graphClient(): Promise<GremlinConnection> {
  const connections = await Promise.all(range(0, 9).map(() => createGraphDBConnection({
    websocketPath: conf.gremlin.connection,
    clean: conf.gremlin.clean,
  })));

  return new RateLimitedGremlinConnectionPool(
    connections,
    new LossyThrottle("gremlinClient", conf.gremlin.qps, 3),
  );
}

export function gremlinBatchSize(): number {
  Preconditions.checkArgument(!!conf.gremlin.batchSize, "Invalid Gremlin batch size");
  return conf.gremlin.batchSize;
}

export function gremlinConcurrency(): number {
  Preconditions.checkArgument(!!conf.gremlin.concurrency, "Invalid Gremlin concurrency");
  return conf.gremlin.concurrency;
}
