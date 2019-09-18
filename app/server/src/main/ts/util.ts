export function flatMap<U, T>(fn: (u: U) => T, arr: U[]) {
  return Array.prototype.concat.apply([], arr.map(fn));
}
