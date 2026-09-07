/**
 * Folds `items` into as few accumulators as possible.
 *
 * `aggregation` returns `null` when `item` does not fit into `accumulator`,
 * in which case the accumulator is closed and a new one is started.
 */
export function reduce<T, R>(
  items: T[],
  base: R,
  aggregation: (accumulator: R, item: T) => R | null
): R[] {
  const res: R[] = []
  for (const item of items) {
    const last = res.pop() ?? base
    const agg = aggregation(last, item)
    if (agg === null) {
      res.push(last)
      const newRes = aggregation(base, item)
      if (newRes !== null) {
        res.push(newRes)
      }
    } else {
      res.push(agg)
    }
  }
  return res
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
