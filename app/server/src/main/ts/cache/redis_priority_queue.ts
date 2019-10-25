import {RedisClient} from "./redis_client";
import {PriorityQueue} from "../priority_queue";

export class RedisPriorityQueue implements PriorityQueue {
  constructor(readonly redisClient: RedisClient, readonly key: string) {}

  add(entries: [number, string][]): Promise<void> {
    return this.redisClient
      .zadd(this.key, entries)
      .then((count) => undefined);
  }

  del(): Promise<void> {
    return this.redisClient
      .del(this.key)
      .then(() => undefined);
  }

  popMin(n: number): Promise<[string, number][]> {
    return this.redisClient.zpopmin(this.key, n);
  }

  size(): Promise<number> {
    return this.redisClient.zcard(this.key);
  }
}
