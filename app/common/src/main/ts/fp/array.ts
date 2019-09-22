export function fold<T>(initial: T, fn: (state: T, x: T) => T, xs: T[]): T {
  let result = initial;
  xs.forEach(x => {
    result = fn(result, x);
  });
  return result;
}

export function foldApply<U, T>(initial: U, fn: (state: U, x: T) => U, xs: T[]): U {
  let result = initial;
  xs.forEach(x => {
    result = fn(result, x);
  });
  return result;
}

// chunk up a list into a list of smaller lists with at most `size` elements
export function partition<T>(xs: T[], size: number): T[][] {
  const numPartitions = Math.ceil(xs.length / size);
  return range(0, numPartitions)
    .map(i => xs.slice(i * size, (i + 1) * size))

}

function range(start: number, finish: number) {
  return Array.from({length: finish-start}, (value, key) => start + key)
}
