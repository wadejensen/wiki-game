export interface RemoteSet {
  add(value: string): Promise<void>
  del(): Promise<void>
  contains(value: string): Promise<boolean>
  size(): Promise<number>
}
