export interface RemoteSet {
  add(value: string): Promise<void>
  contains(value: string): Promise<boolean>
}
