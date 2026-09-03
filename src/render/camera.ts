import { PerspectiveCamera, Vector3 } from 'three'

/**
 * The camera the player never controls (SPEC 2.6), but which does move.
 *
 * Two lessons from the first build on a real phone:
 *
 * 1. A portrait screen is narrow. Framing a fifteen-metre level across it puts
 *    the whole game in a thin strip with sky above and below.
 * 2. Zooming in far enough to fix that hides the target while the player is
 *    planning the shot, which is worse: this is a puzzle, and you cannot plan
 *    against something you cannot see.
 *
 * So the rig does both, at different moments. While building it pulls back far
 * enough to show the whole level, because that is when the player is thinking.
 * When the shot fires it pushes in and follows the ball, because that is when
 * the player is watching. Wide to plan, close to enjoy.
 */

/** Vertical field of view. Fixed, so object size depends only on framing. */
const FOV = 46

/** World height on screen while the shot is in flight. Sets the close-up scale. */
const ACTION_HEIGHT = 13

/**
 * Where the ground sits, as a fraction of screen height from the bottom.
 * Centring the view instead wastes the lower third on empty space below ground
 * and the upper half on empty sky.
 */
const HORIZON = 0.3

/**
 * Camera offset direction. Deliberately shallow: a steeper angle looks more
 * three-dimensional but spends screen height on ground receding into the
 * distance, which is the space a portrait phone cannot spare.
 */
const OFFSET = new Vector3(0.2, 0.24, 1).normalize()

/** Fraction of the remaining gap closed per tick when the framing changes. */
const FOLLOW = 0.12

export function createCamera(aspect: number): PerspectiveCamera {
  return new PerspectiveCamera(FOV, aspect, 0.1, 200)
}

function distanceFor(visibleHeight: number): number {
  return visibleHeight / 2 / Math.tan((FOV * Math.PI) / 180 / 2)
}

/** World height needed to fit `span` across a screen of this shape. */
export function heightToFitWidth(span: number, aspect: number): number {
  return span / Math.max(aspect, 0.2)
}

export class CameraRig {
  private x: number
  private height = ACTION_HEIGHT
  private desiredX: number
  private desiredHeight = ACTION_HEIGHT
  private minX = -Infinity
  private maxX = Infinity
  private aspect = 1

  constructor(
    private readonly camera: PerspectiveCamera,
    startX: number,
  ) {
    this.x = startX
    this.desiredX = startX
    this.apply()
  }

  /** The span of level worth showing. Panning is clamped to it. */
  setLevelBounds(minX: number, maxX: number): void {
    this.minX = minX
    this.maxX = maxX
    this.clamp()
  }

  setAspect(aspect: number): void {
    this.aspect = aspect
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
    this.clamp()
  }

  /** Pull back far enough to show the whole level, for planning. */
  frameWholeLevel(): void {
    this.desiredHeight = Math.max(
      ACTION_HEIGHT,
      heightToFitWidth(this.maxX - this.minX, this.aspect),
    )
    this.lookAt((this.minX + this.maxX) / 2)
  }

  /** Push in and follow, for the shot itself. */
  followAction(x: number): void {
    this.desiredHeight = ACTION_HEIGHT
    this.lookAt(x)
  }

  lookAt(x: number): void {
    this.desiredX = x
    this.clamp()
  }

  private clamp(): void {
    const half = (this.desiredHeight * this.aspect) / 2
    const centre = (this.minX + this.maxX) / 2
    // A level narrower than the screen is simply centred.
    this.desiredX =
      this.maxX - this.minX <= half * 2
        ? centre
        : Math.min(Math.max(this.desiredX, this.minX + half), this.maxX - half)
  }

  /** Jumps straight there. Used on load, where easing looks like a glitch. */
  snap(): void {
    this.x = this.desiredX
    this.height = this.desiredHeight
    this.apply()
  }

  update(): void {
    const moved = Math.abs(this.desiredX - this.x) > 0.002
    const zoomed = Math.abs(this.desiredHeight - this.height) > 0.002
    if (!moved && !zoomed) return
    this.x += (this.desiredX - this.x) * FOLLOW
    this.height += (this.desiredHeight - this.height) * FOLLOW
    this.apply()
  }

  private apply(): void {
    const distance = distanceFor(this.height)
    // Put the ground a fixed fraction up the screen rather than in the middle.
    const lookY = this.height * (0.5 - HORIZON)
    this.camera.position.set(
      this.x + OFFSET.x * distance,
      lookY + OFFSET.y * distance,
      OFFSET.z * distance,
    )
    this.camera.lookAt(this.x, lookY, 0)
  }
}
