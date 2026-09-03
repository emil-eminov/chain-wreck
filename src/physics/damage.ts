/**
 * Destruction model.
 *
 * Damage comes from Rapier contact-force events rather than from tracking
 * velocities by hand: the solver already knows the impulse it applied, and
 * reusing it keeps damage consistent with what the player sees happen.
 */

/**
 * Contact force below this does nothing.
 *
 * It exists because resting contact generates force events forever: a crate
 * sitting on the ground would otherwise grind itself to death. Set it above
 * the weight of a typical stack and below a real hit. Raise it if targets chip
 * from being leaned on, lower it if solid hits feel like they do not count.
 */
export const DAMAGE_THRESHOLD = 45

/** Scales raw contact force into health points. Health values assume this. */
export const DAMAGE_SCALE = 1

export function damageFromContactForce(totalForceMagnitude: number): number {
  if (!Number.isFinite(totalForceMagnitude)) return 0
  const over = totalForceMagnitude - DAMAGE_THRESHOLD
  return over <= 0 ? 0 : over * DAMAGE_SCALE
}
