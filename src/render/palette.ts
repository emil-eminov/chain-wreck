/**
 * Colour is load-bearing, not decoration (SPEC 2.5):
 * red means "destroy this", yellow means "you can touch this".
 * Nothing else is ever red or yellow.
 */
export const PALETTE = {
  sky: 0x2a1d16,
  ground: 0xc9a227,
  structure: 0x2f2a26,
  target: 0xe23b2e,
  interactive: 0xf5c518,
  projectile: 0xe8e2d6,
} as const
