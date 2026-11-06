import { createHash } from 'node:crypto'

export function buildContentVersion(content: unknown): string {
  return createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 16)
}
