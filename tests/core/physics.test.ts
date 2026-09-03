import { beforeAll, describe, expect, it } from 'vitest'
import { TICK_HZ } from '../../src/core/loop'
import { createWorld, initPhysics } from '../../src/physics/world'
import { addBody, clampToSlab } from '../../src/physics/bodies'

beforeAll(async () => {
  await initPhysics()
})

describe('physics world', () => {
  it('settles a dropped box within 3 seconds without jitter', () => {
    const world = createWorld()
    addBody(world, {
      shape: { kind: 'box', half: [10, 0.5, 2] },
      position: [0, -0.5, 0],
      dynamic: false,
    })
    const box = addBody(world, {
      shape: { kind: 'box', half: [0.25, 0.25, 0.25] },
      position: [0, 3, 0],
      dynamic: true,
    })

    for (let i = 0; i < TICK_HZ * 3; i++) world.step()

    expect(box.isSleeping()).toBe(true)
    expect(box.translation().y).toBeCloseTo(0.25, 1)
  })

  it('keeps a stack of five boxes standing', () => {
    const world = createWorld()
    addBody(world, {
      shape: { kind: 'box', half: [10, 0.5, 2] },
      position: [0, -0.5, 0],
      dynamic: false,
    })
    const stack = Array.from({ length: 5 }, (_, i) =>
      addBody(world, {
        shape: { kind: 'box', half: [0.25, 0.25, 0.25] },
        position: [0, 0.25 + i * 0.5, 0],
        dynamic: true,
      }),
    )

    for (let i = 0; i < TICK_HZ * 4; i++) world.step()

    const top = stack[4]!
    expect(top.translation().y).toBeGreaterThan(2)
    expect(Math.abs(top.translation().x)).toBeLessThan(0.05)
  })

  it('clamps authored depth into the playable slab', () => {
    expect(clampToSlab(50)).toBeLessThanOrEqual(0.75)
    expect(clampToSlab(-50)).toBeGreaterThanOrEqual(-0.75)
    expect(clampToSlab(0.2)).toBe(0.2)
  })
})
