export interface RedisClient {
  del(key: string): Promise<number>
  sadd(key: string, value: string): Promise<number>
  scard(key: string): Promise<number>
  sismember(key: string, value: string): Promise<number>
  zadd(key: string, values: [number, string][]): Promise<number>
  zcard(key: string): Promise<number>
  zpopmin(key: string, n: number): Promise<[string, number][]>
}
