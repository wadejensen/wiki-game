import {RedisClient} from "./redis_client";

const syncRedis = require("redis");
import { promisifyAll } from "bluebird";
import {LossyThrottle} from "../../../../../common/src/main/ts/throttle/lossy_throttle";
const asyncRedis = promisifyAll(syncRedis);

export class RateLimitedRedisClient implements RedisClient {
  constructor(
    readonly redisClient: RedisClient,
    readonly throttle: LossyThrottle,
  ) {}

  del(key: string): Promise<number> {
    return this.throttle.apply(() => this.redisClient.del(key));
  }

  sadd(key: string, value: string): Promise<number> {
    return this.throttle.apply(() => this.redisClient.sadd(key, value));
  }

  scard(key: string): Promise<number> {
    return this.throttle.apply(() => this.redisClient.scard(key));
  }

  sismember(key: string, value: string): Promise<number> {
    return this.throttle.apply(() => this.redisClient.sismember(key, value));
  }

  zadd(key: string, entries: [number, string][]): Promise<number> {
    return this.throttle.apply(() => this.redisClient.zadd(key, entries));
  }

  zcard(key: string): Promise<number> {
    return this.throttle.apply(() => this.redisClient.zcard(key));
  }

  zpopmin(key: string, n: number): Promise<[string, number][]> {
    return this.throttle.apply(() => this.redisClient.zpopmin(key, n));
  }
}
