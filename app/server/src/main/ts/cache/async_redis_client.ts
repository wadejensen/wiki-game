import {flatMap} from "../util";

const syncRedis = require("redis");
import { promisifyAll } from "bluebird";
import {partition} from "../../../../../common/src/main/ts/fp/array";
const asyncRedis = promisifyAll(syncRedis);

export class AsyncRedisClient {
  static create({
    host,
    port,
  }: {
    host: string,
    port: number,
  }): AsyncRedisClient {
    const client = asyncRedis.createClient({ host, port });
    return new AsyncRedisClient(client);
  }

  private constructor(readonly client: any) {}

  del(key: string): Promise<number> {
    return this.client.delAsync(key);
  }

  sadd(key: string, value: string): Promise<number> {
    return this.client.saddAsync(key, value);
  }

  sismember(key: string, value: string): Promise<number> {
    return this.client.sismemberAsync(key, value)
  }

  zadd(key: string, values: [number, string][]): Promise<number> {
    return this.client.zaddAsync(key, flatMap((x) => x, values));
  }

  zpopmin(key: string, n: number): Promise<[string, number][]> {
    return this.client.zpopminAsync(key, n)
      .then((res: (string | number)[]) => partition(res, 2))
      .then((batch: [string, string][]) =>
        batch.map((pair: [string, string]) =>
          [pair[0], Number.parseInt(pair[1])])
      );
  }

  zcount(key: string): Promise<number> {
    return this.client.zcountAsync(key, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
  }
}