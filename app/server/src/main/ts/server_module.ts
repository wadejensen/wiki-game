import {Crawler} from "./crawler";
import {isValidWikiPage} from "./wiki";
import {FetchHTTPClient} from "./http/fetch_http_client";
import {RateLimitedHTTPClient} from "./http/rate_limited_http_client";
import {HTTPClient} from "./http/http_client";
import {RemoteSet} from "./cache/remote_set";
import {RedisPriorityQueue} from "./cache/redis_priority_queue";
import {PriorityQueue} from "./cache/priority_queue";
import {RedisSet} from "./cache/redis_set";
import {RateLimitedRedisClient} from "./cache/rate_limited_redis_client";
import {RedisClient} from "./cache/redis_client";
import {AsyncRedisClient} from "./cache/async_redis_client";
import {LossyThrottle} from "../../../../common/src/main/ts/throttle/lossy_throttle";
import {createGraphDBConnection} from "./graph/gremlin";
import {RateLimitedGremlinConnection} from "./graph/rate_limited_gremlin_connection";
import {GremlinConnection} from "./graph/gremlin_connection";
import * as fs from "fs";
import {Preconditions} from "../../../../common/src/main/ts/preconditions";

const configFilePath: string = process.env["CONF_FILE"]!;
console.log(`Reading config from: ${configFilePath}`);
Preconditions.checkState(!!configFilePath);
const conf: any = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
console.log(conf);

export function wikipediaCrawler(): Crawler {
  return new Crawler(
    httpClient(),
    crawlerHistory(),
    crawlerPriorityQueue(),
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

export function redisClient(name: string): RedisClient {
  return new RateLimitedRedisClient(
    AsyncRedisClient.create({ host: conf.redis.host, port: conf.redis.port }),
    new LossyThrottle(name, conf.redis.qps,
      conf.redis.retries),
  );
}

export async function graphClient(): Promise<GremlinConnection> {
  return new RateLimitedGremlinConnection(
    await createGraphDBConnection({
      websocketPath: conf.gremlin.connection,
      clean: conf.gremlin.clean,
    }),
    new LossyThrottle("gremlinClient", conf.gremlin.qps, 3),
  );
}
