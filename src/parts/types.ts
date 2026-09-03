import type { ShapeSpec } from '../physics/bodies'

export interface PartDefinition {
  readonly id: string
  readonly label: string
  /** Parts used counts against the level's par for the second star. */
  readonly cost: number
  readonly shape: ShapeSpec
  /** Fixed parts redirect the shot. Dynamic parts are knocked about by it. */
  readonly dynamic: boolean
  readonly friction: number
  readonly restitution: number
  readonly density?: number
  /** Rotation increment, in degrees, when the player taps a placed part. */
  readonly snapDegrees: number
}
