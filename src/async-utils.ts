export async function asyncReduce<T, R>(
  asyncItems: Promise<T>[],
  base: R,
  aggregation: (accumulator: R, item: T) => R | null
): Promise<R[]> {
  const res: R[] = []
  for await (const item of asyncItems) {
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
