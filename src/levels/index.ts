import { parseLevel } from './schema'
import type { LevelSpec } from './types'

// Eager glob: every level is validated at startup rather than when a player
// first reaches it, so a broken level file fails loudly and immediately.
const modules = import.meta.glob<{ default: unknown }>('./data/*.json', { eager: true })

export const LEVELS: readonly LevelSpec[] = Object.keys(modules)
  .sort()
  .map((path) => parseLevel(modules[path]!.default))

export function levelById(id: string): LevelSpec {
  const level = LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`Unknown level "${id}"`)
  return level
}
