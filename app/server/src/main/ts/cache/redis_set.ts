import {RemoteSet} from "./remote_set";
import {RedisClient} from "./redis_client";

export class RedisSet implements RemoteSet {
  constructor(readonly redisClient: RedisClient, readonly key: string) {}

  add(value: string): Promise<void> {
    return this.redisClient
      .sadd(this.key, value)
      .then((count) => undefined);
  }

  contains(value: string): Promise<boolean> {
    return this.redisClient
      .sismember(this.key, value)
      .then((ret) => ret == 1);
  }

  size(): Promise<number> {
    return this.redisClient.scard(this.key)
  }
}
