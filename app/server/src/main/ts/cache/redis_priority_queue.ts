import {PriorityQueue} from "./priority_queue";
import {RedisClient} from "./redis_client";

export class RedisPriorityQueue implements PriorityQueue {
  constructor(readonly redisClient: RedisClient, readonly key: string) {}

  add(entries: [number, string][]): Promise<void> {
    return this.redisClient
      .zadd(this.key, entries)
      .then((count) => undefined);
  }

  popMin(n: number): Promise<[string, number][]> {
    return this.redisClient.zpopmin(this.key, n);
  }

  size(): Promise<number> {
    return this.redisClient.zcount(this.key);
  }
}
