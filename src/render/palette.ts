/**
 * Colour is load-bearing, not decoration (SPEC 2.5):
 * red means "destroy this", yellow means "you can touch this".
 * Nothing else is ever red or yellow.
 */
export const PALETTE = {
  sky: 0x6f8ba8,
  ground: 0xd8b04a,
  /** Walls and ledges: solid, immovable, clearly not yours. */
  stone: 0x574c46,
  /** The overhang. Lighter than stone so it does not read as a void. */
  roof: 0x7a6a60,
  /** Loose blocks: warm, so the player can see what will move. */
  crate: 0xb07a45,
  target: 0xe23b2e,
  interactive: 0xf5c518,
  launcher: 0x3f6f6a,
  projectile: 0xf2ece0,
  /** Only ever used for a rejected placement. */
  invalid: 0x8c2f27,
  /** The area the player may build in. */
  buildZone: 0xf5c518,
} as const
