export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0

  const sortedValues = [...values].sort((a, b) => a - b)
  const middleIndex = Math.floor(sortedValues.length / 2)

  return sortedValues.length % 2 === 0
    ? (sortedValues[middleIndex - 1]! + sortedValues[middleIndex]!) / 2
    : sortedValues[middleIndex]!
}
