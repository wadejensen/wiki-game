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

const conf = {
  crawler: {
    qps: 4,
    timeout: 3000,
    retries: 3,
    backoffDelayMs: 300,
    exponentialBackoff: true,
  },
  redis: {
    host: "127.0.0.1",
    port: 6379,
    qps: 10000,
    retries: 3,
  },
  gremlin: {
    host: "localhost",
    port: 8182,
    clean: true,
    qps: 200,
    retries: 3,
  }
};

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
  return new RedisSet(redisClient(), "history")
}

function crawlerPriorityQueue(): PriorityQueue {
  return new RedisPriorityQueue(redisClient(), "queue");
}

export function redisClient(): RedisClient {
  return new RateLimitedRedisClient(
    AsyncRedisClient.create({ host: conf.redis.host, port: conf.redis.port }),
    new LossyThrottle("redisClient", conf.redis.qps,
      conf.redis.retries),
  );
}

export async function graphClient(): Promise<GremlinConnection> {
  return new RateLimitedGremlinConnection(
    await createGraphDBConnection({
      hostname: conf.gremlin.host,
      port: conf.gremlin.port,
      clean: conf.gremlin.clean,
    }),
    new LossyThrottle("gremlinClient", conf.gremlin.qps, 3),
  );
}
