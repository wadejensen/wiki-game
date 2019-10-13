export interface PriorityQueue {
  add(entries: [number, string][]): Promise<void>;
  popMin(n: number): Promise<[string, number][]>;
  size(): Promise<number>;
}
