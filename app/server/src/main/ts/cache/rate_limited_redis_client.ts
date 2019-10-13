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

  sismember(key: string, value: string): Promise<number> {
    return this.throttle.apply(() => this.redisClient.sismember(key, value));
  }

  zadd(key: string, entries: [number, string][]): Promise<number> {
    return this.throttle.apply(() => this.redisClient.zadd(key, entries));
  }

  zpopmin(key: string, n: number): Promise<[string, number][]> {
    return this.throttle.apply(() => this.redisClient.zpopmin(key, n));
  }

  zcount(key: string): Promise<number> {
    return this.throttle.apply(() => this.redisClient.zcount(key));
  }
}
