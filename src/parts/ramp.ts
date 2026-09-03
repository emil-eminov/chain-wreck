import type { PartDefinition } from './types'

/**
 * The first and, in milestone 1, only part.
 *
 * Modelled as a thin slab rather than a wedge: the player rotates it to make
 * an incline, which is easier to read at a glance than a triangle whose useful
 * face depends on its orientation.
 */
export const RAMP: PartDefinition = {
  id: 'ramp',
  label: 'Ramp',
  cost: 1,
  // Thick enough to read as a solid object, and to be hit reliably even
  // before CCD is taken into account.
  shape: { kind: 'box', half: [0.9, 0.16, 0.55] },
  dynamic: false,
  // Low friction and a little bounce: a ramp should redirect the shot, not eat it.
  friction: 0.15,
  restitution: 0.25,
  snapDegrees: 15,
}
