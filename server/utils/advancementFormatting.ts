export function formatAdvancementCompletedAt(completedAt: string | null): string {
  if (!completedAt) return '–'
  return new Date(completedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}
