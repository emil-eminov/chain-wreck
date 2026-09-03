/**
 * Phases of a single level attempt.
 *
 * SURVEY   camera pans the level, player is looking, not touching
 * BUILD    player places, rotates and removes parts
 * AIM      player is dragging the launcher, build is frozen
 * SIMULATE the one shot is in flight, physics owns the world
 * RESULT   stars or a fail card, world is frozen at the final frame
 */
export type Phase = 'SURVEY' | 'BUILD' | 'AIM' | 'SIMULATE' | 'RESULT'

/**
 * Legal transitions. Anything not listed here is a bug, not a feature: an
 * illegal transition throws rather than silently leaving the game in a state
 * where, for example, a second projectile can be fired mid-simulation.
 */
const TRANSITIONS: Readonly<Record<Phase, readonly Phase[]>> = {
  SURVEY: ['BUILD'],
  BUILD: ['AIM'],
  // AIM returns to BUILD when the player cancels a drag without firing.
  AIM: ['BUILD', 'SIMULATE'],
  SIMULATE: ['RESULT'],
  // RESULT to BUILD is retry, which keeps the placed parts (see SPEC 2.1).
  // RESULT to SURVEY is advancing to the next level.
  RESULT: ['BUILD', 'SURVEY'],
}

export function canTransition(from: Phase, to: Phase): boolean {
  return TRANSITIONS[from].includes(to)
}

export class IllegalTransitionError extends Error {
  constructor(from: Phase, to: Phase) {
    super(`Illegal phase transition: ${from} -> ${to}`)
    this.name = 'IllegalTransitionError'
  }
}

export function transition(from: Phase, to: Phase): Phase {
  if (!canTransition(from, to)) throw new IllegalTransitionError(from, to)
  return to
}
