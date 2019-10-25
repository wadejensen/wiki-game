import {RedisClient} from "./redis_client";
import {Flag} from "../flag";

export class RedisFlag implements Flag {
  static readonly ENABLED = "1";
  constructor(readonly redisClient: RedisClient, readonly name: string) {}

  enabled(): Promise<boolean> {
    return this.redisClient
      .get(this.name)
      .then(resp => {
        console.log(`Enabled = ${resp}`);
        return resp;
      })
      .then(resp => resp == RedisFlag.ENABLED)
  }

  set(): Promise<string> {
    return this.redisClient.set(this.name, RedisFlag.ENABLED)
  }

  clear(): Promise<number> {
    return this.redisClient.del(this.name);
  }
}
