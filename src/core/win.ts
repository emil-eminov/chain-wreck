export type Outcome = 'PLAYING' | 'WON' | 'LOST'

export interface TargetView {
  readonly destroyed: boolean
  readonly bonus: boolean
}

/**
 * A level is won when every non-bonus target is gone. Bonus targets are the
 * third star only, so a player who ignores one still wins (SPEC 2.2).
 *
 * A level is lost only once the world has stopped moving: while anything is
 * still tumbling, a target might yet be knocked off, and calling the attempt
 * early would rob the player of the best moments this game has.
 */
export function evaluateOutcome(targets: readonly TargetView[], settled: boolean): Outcome {
  const required = targets.filter((t) => !t.bonus)
  if (required.length > 0 && required.every((t) => t.destroyed)) return 'WON'
  return settled ? 'LOST' : 'PLAYING'
}

/** Stars earned, 0 when the attempt failed (SPEC 2.2). */
export function starsFor(outcome: Outcome, partsUsed: number, par: number, bonusDestroyed: boolean): number {
  if (outcome !== 'WON') return 0
  let stars = 1
  if (partsUsed <= par) stars += 1
  if (bonusDestroyed) stars += 1
  return stars
}
