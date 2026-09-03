import { beforeAll, describe, expect, it } from 'vitest'
import { initPhysics } from '../../src/physics/world'
import { Session } from '../../src/core/session'
import { LEVELS } from '../../src/levels'

beforeAll(async () => {
  await initPhysics()
})

/**
 * The guard that matters most with no QA team: every shipped level replays its
 * recorded solution and must still be winnable. A tuning change that quietly
 * makes a level impossible fails here rather than in a player's hands.
 */
describe('every shipped level', () => {
  it('ships at least one level', () => {
    expect(LEVELS.length).toBeGreaterThan(0)
  })

  for (const level of LEVELS) {
    describe(`${level.id} ${level.name}`, () => {
      it('carries a recorded solution', () => {
        expect(level.solution, 'authored by scripts/solve-levels.mjs').toBeDefined()
      })

      it('is still winnable with that solution', () => {
        const session = new Session(level)
        for (const placement of level.solution!.placements) {
          expect(session.place(placement.part, placement.position, placement.rotationZ)).toBe('ok')
        }
        session.fire(level.solution!.aim, level.solution!.power)
        let ticks = 0
        while (ticks < 900 && !session.step()) ticks++
        expect(session.result.stars, `${level.id} is no longer solvable`).toBeGreaterThan(0)
      })

      it('cannot be won by firing without building anything', () => {
        // Coarser than the authoring search, but enough to catch a level that
        // has become trivially winnable after a geometry edit.
        for (let aimY = -0.2; aimY <= 4; aimY += 0.25) {
          for (const power of [0.4, 0.6, 0.8, 1]) {
            const session = new Session(level)
            session.fire([1, aimY, 0], power)
            let ticks = 0
            while (ticks < 300 && !session.step()) ticks++
            expect(
              session.result.stars,
              `${level.id} is winnable with no parts at aimY ${aimY.toFixed(2)}, power ${power}`,
            ).toBe(0)
          }
        }
      })
    })
  }
})
