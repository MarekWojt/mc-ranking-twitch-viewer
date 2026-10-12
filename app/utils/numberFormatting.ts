const TYPOGRAPHIC_MINUS_SIGN = '−'

export function formatNumberWithTypographicMinus(value: number): string {
  // negative zero (e.g. 0 points × weight −1) would otherwise be rendered as "-0" by toLocaleString
  const valueWithoutNegativeZero = value === 0 ? 0 : value
  return valueWithoutNegativeZero.toLocaleString('de-DE').replace('-', TYPOGRAPHIC_MINUS_SIGN)
}

export function formatRoundedPoints(points: number): string {
  return formatNumberWithTypographicMinus(Math.round(points))
}
