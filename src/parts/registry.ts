import { RAMP } from './ramp'
import type { PartDefinition } from './types'

export const PARTS: Readonly<Record<string, PartDefinition>> = {
  [RAMP.id]: RAMP,
}

export const PART_IDS = Object.keys(PARTS)

export function partById(id: string): PartDefinition {
  const part = PARTS[id]
  if (!part) throw new Error(`Unknown part "${id}". Known parts: ${PART_IDS.join(', ')}`)
  return part
}

export type { PartDefinition }
