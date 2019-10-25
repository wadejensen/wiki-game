export interface Flag {
  enabled(): Promise<boolean>
  set(): Promise<string>
  clear(): Promise<number>
}
