export function flatMap<U, T>(fn: (u: U) => T, arr: U[]) {
  return Array.prototype.concat.apply([], arr.map(fn));
}

export function exit() {
  process.exit(1);
}
