import { beforeAll, describe, expect, it } from 'vitest'
import { createWorld, initPhysics } from '../../src/physics/world'
import { LevelRuntime } from '../../src/levels/runtime'
import { parseLevel, validateLevel, LevelValidationError } from '../../src/levels/schema'
import { evaluateOutcome, starsFor } from '../../src/core/win'
import { damageFromContactForce, DAMAGE_THRESHOLD } from '../../src/physics/damage'
import type { LevelSpec } from '../../src/levels/types'

beforeAll(async () => {
  await initPhysics()
})

const MINIMAL: LevelSpec = {
  id: 'test',
  name: 'Test',
  launcher: { position: [-6, 2, 0], maxSpeed: 24 },
  killLineY: -4,
  par: 1,
  inventory: [{ part: 'ramp', count: 1 }],
  buildZones: [{ min: [-4, 0, -0.7], max: [4, 4, 0.7] }],
  terrain: [{ shape: { kind: 'box', half: [12, 0.5, 3] }, position: [0, -0.5, 0] }],
  structures: [],
  targets: [{ shape: { kind: 'box', half: [0.3, 0.3, 0.3] }, position: [3, 0.3, 0], health: 100 }],
}

describe('level validation', () => {
  it('accepts a well-formed level', () => {
    expect(validateLevel(MINIMAL)).toEqual([])
  })

  it('rejects a level with no winnable target', () => {
    const issues = validateLevel({ ...MINIMAL, targets: [{ ...MINIMAL.targets[0]!, bonus: true }] })
    expect(issues).toContain('targets must include at least one non-bonus target')
  })

  it('rejects an unknown part in the inventory', () => {
    const issues = validateLevel({ ...MINIMAL, inventory: [{ part: 'jetpack', count: 1 }] })
    expect(issues.join()).toMatch(/inventory\[0\]\.part must be one of/)
  })

  it('rejects a build zone whose min is not below its max', () => {
    const issues = validateLevel({ ...MINIMAL, buildZones: [{ min: [4, 0, 0], max: [-4, 4, 1] }] })
    expect(issues.join()).toMatch(/min must be less than max/)
  })

  it('rejects a malformed shape', () => {
    const issues = validateLevel({ ...MINIMAL, terrain: [{ shape: { kind: 'blob' }, position: [0, 0, 0] }] })
    expect(issues.join()).toMatch(/kind must be box, cylinder or sphere/)
  })

  it('names the level in the thrown error so the author knows which file', () => {
    expect(() => parseLevel({ ...MINIMAL, par: -1 })).toThrow(LevelValidationError)
    expect(() => parseLevel({ ...MINIMAL, par: -1 })).toThrow(/Level "test" is invalid/)
  })
})

describe('damage model', () => {
  it('ignores contact below the threshold, so resting weight never chips a target', () => {
    expect(damageFromContactForce(DAMAGE_THRESHOLD - 1)).toBe(0)
    expect(damageFromContactForce(0)).toBe(0)
  })

  it('scales with force above the threshold', () => {
    expect(damageFromContactForce(DAMAGE_THRESHOLD + 10)).toBeGreaterThan(0)
    expect(damageFromContactForce(DAMAGE_THRESHOLD + 100)).toBeGreaterThan(
      damageFromContactForce(DAMAGE_THRESHOLD + 10),
    )
  })
})

describe('outcome rules', () => {
  it('does not call a loss while the world is still moving', () => {
    expect(evaluateOutcome([{ destroyed: false, bonus: false }], false)).toBe('PLAYING')
    expect(evaluateOutcome([{ destroyed: false, bonus: false }], true)).toBe('LOST')
  })

  it('wins without the bonus target', () => {
    expect(
      evaluateOutcome([{ destroyed: true, bonus: false }, { destroyed: false, bonus: true }], false),
    ).toBe('WON')
  })

  it('awards stars per SPEC 2.2', () => {
    expect(starsFor('WON', 1, 1, false)).toBe(2)
    expect(starsFor('WON', 2, 1, false)).toBe(1)
    expect(starsFor('WON', 1, 1, true)).toBe(3)
    expect(starsFor('LOST', 1, 1, true)).toBe(0)
  })
})

describe('level runtime', () => {
  it('destroys a target that falls past the kill line', () => {
    const world = createWorld()
    const level: LevelSpec = { ...MINIMAL, terrain: [], targets: [{ ...MINIMAL.targets[0]!, position: [0, 1, 0] }] }
    const runtime = new LevelRuntime(world, level)
    expect(runtime.targets[0]!.destroyed).toBe(false)
    for (let i = 0; i < 120; i++) runtime.step()
    expect(runtime.targets[0]!.destroyed).toBe(true)
    expect(runtime.outcome).toBe('WON')
  })

  it('leaves an undisturbed target alive and reports a loss once things stop', () => {
    const world = createWorld()
    const runtime = new LevelRuntime(world, MINIMAL)
    for (let i = 0; i < 180; i++) runtime.step()
    expect(runtime.targets[0]!.destroyed).toBe(false)
    expect(runtime.settled).toBe(true)
    expect(runtime.outcome).toBe('LOST')
  })

  it('announces each body exactly once, targets included', () => {
    const world = createWorld()
    const seen: string[] = []
    new LevelRuntime(world, MINIMAL, (info) => seen.push(info.role))
    expect(seen).toEqual(['terrain', 'target'])
  })

  it('destroys a target hit hard enough', () => {
    const world = createWorld()
    const level: LevelSpec = { ...MINIMAL, targets: [{ ...MINIMAL.targets[0]!, position: [0, 0.3, 0], health: 60 }] }
    const runtime = new LevelRuntime(world, level)
    const shot = runtime.spawn(
      { shape: { kind: 'sphere', radius: 0.28 }, position: [-4, 0.5, 0], dynamic: true, density: 8 },
      'projectile',
    )
    shot.setLinvel({ x: 26, y: 0, z: 0 }, true)
    for (let i = 0; i < 180; i++) runtime.step()
    expect(runtime.targets[0]!.destroyed).toBe(true)
  })
})
