import { beforeAll, describe, expect, it } from 'vitest'
import { initPhysics } from '../../src/physics/world'
import { Session } from '../../src/core/session'
import { insideZones, rotatedHalfExtents } from '../../src/parts/placement'
import type { LevelSpec } from '../../src/levels/types'

beforeAll(async () => {
  await initPhysics()
})

const LEVEL: LevelSpec = {
  id: 'session-test',
  name: 'Session Test',
  launcher: { position: [-7, 0.9, 0], maxSpeed: 26 },
  killLineY: -4,
  par: 1,
  inventory: [{ part: 'ramp', count: 1 }],
  buildZones: [{ min: [-5, 0, -0.7], max: [5, 5, 0.7] }],
  terrain: [{ shape: { kind: 'box', half: [12, 0.5, 3] }, position: [0, -0.5, 0] }],
  // A ledge inside the build zone, so placement can be blocked by something
  // the player can actually see rather than by the terrain below the zone.
  structures: [{ shape: { kind: 'box', half: [0.4, 0.4, 0.4] }, position: [-3.5, 3.2, 0], dynamic: false }],
  targets: [{ shape: { kind: 'box', half: [0.3, 0.3, 0.3] }, position: [4, 0.3, 0], health: 60 }],
}

describe('placement geometry', () => {
  it('grows the footprint of a rotated part', () => {
    const flat = rotatedHalfExtents([1, 0.1, 0.5], 0)
    const tilted = rotatedHalfExtents([1, 0.1, 0.5], Math.PI / 4)
    expect(tilted[1]).toBeGreaterThan(flat[1])
  })

  it('keeps a part fully inside its zone, not merely centred in it', () => {
    const zones = [{ min: [0, 0, -1] as const, max: [2, 2, 1] as const }]
    expect(insideZones([1, 1, 0], [0.5, 0.5, 0.5], zones)).toBe(true)
    expect(insideZones([1.9, 1, 0], [0.5, 0.5, 0.5], zones)).toBe(false)
  })
})

describe('session', () => {
  it('refuses a placement outside the build zone', () => {
    const session = new Session(LEVEL)
    expect(session.place('ramp', [40, 1, 0], 0)).toBe('outside-zone')
    expect(session.partsUsed).toBe(0)
  })

  it('refuses a placement that overlaps something already in the level', () => {
    const session = new Session(LEVEL)
    expect(session.place('ramp', [-3.5, 3.2, 0], 0)).toBe('blocked')
  })

  it('reports a placement below the build zone as out of zone, not blocked', () => {
    const session = new Session(LEVEL)
    expect(session.place('ramp', [0, 0.05, 0], 0)).toBe('outside-zone')
  })

  it('accepts a legal placement and spends the inventory', () => {
    const session = new Session(LEVEL)
    expect(session.remaining('ramp')).toBe(1)
    expect(session.place('ramp', [0, 1.5, 0], 0.4)).toBe('ok')
    expect(session.remaining('ramp')).toBe(0)
    expect(session.place('ramp', [2, 1.5, 0], 0)).toBe('blocked')
  })

  it('keeps the build across a retry, which is the whole loop', () => {
    const session = new Session(LEVEL)
    session.place('ramp', [0, 1.5, 0], 0.4)
    session.fire([1, 0.05, 0], 1)
    for (let i = 0; i < 600 && !session.step(); i++) {
      /* run the attempt out */
    }
    expect(session.phase).toBe('RESULT')
    session.retry()
    expect(session.phase).toBe('BUILD')
    expect(session.partsUsed).toBe(1)
    expect(session.remaining('ramp')).toBe(0)
  })

  it('undo returns the part to the tray', () => {
    const session = new Session(LEVEL)
    session.place('ramp', [0, 1.5, 0], 0)
    expect(session.undo()).toBe(true)
    expect(session.remaining('ramp')).toBe(1)
    expect(session.partsUsed).toBe(0)
  })

  it('will not fire twice in one attempt', () => {
    const session = new Session(LEVEL)
    session.fire([1, 0.05, 0], 1)
    expect(session.phase).toBe('SIMULATE')
    expect(() => session.fire([1, 0.05, 0], 1)).toThrow()
  })

  it('rebuilding a retry is reproducible: the same shot gives the same result', () => {
    const outcomes = [0, 1].map(() => {
      const session = new Session(LEVEL)
      session.place('ramp', [0, 1.2, 0], 0.5)
      session.fire([1, 0.05, 0], 1)
      for (let i = 0; i < 900 && !session.step(); i++) {
        /* run out */
      }
      return session.result
    })
    expect(outcomes[0]).toEqual(outcomes[1])
  })

  it('resolves a miss promptly instead of waiting for the ball to stop rolling', () => {
    const session = new Session(LEVEL)
    // Straight up: guaranteed to miss, and the ball lands and rolls.
    session.fire([0.05, 1, 0], 1)
    let ticks = 0
    while (ticks < 900 && !session.step()) ticks++
    expect(session.phase).toBe('RESULT')
    expect(session.result.stars).toBe(0)
    // Four seconds is already a long time to stare at a failed attempt.
    expect(ticks, `a miss took ${(ticks / 60).toFixed(1)}s to resolve`).toBeLessThan(60 * 4)
  })

  it('a direct hit destroys the target and scores stars', () => {
    const session = new Session(LEVEL)
    session.fire([1, 0.05, 0], 1)
    for (let i = 0; i < 900 && !session.step(); i++) {
      /* run out */
    }
    expect(session.result.stars).toBeGreaterThan(0)
  })
})
