/**
 * Searches for a working solution to each authored level and writes the level
 * plus that solution to src/levels/data.
 *
 * A level that no search can solve is a broken level, and finding that out here
 * is far cheaper than finding it out from a stuck player. The recorded solution
 * then becomes the regression test that keeps the level solvable as physics and
 * tuning change.
 *
 * Run with: node scripts/solve-levels.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEVELS } from './levels.source.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'src', 'levels', 'data')

// Imported through the built TypeScript at runtime via tsx-free dynamic import
// is not available here, so the search re-implements the attempt loop against
// the same modules using vite-node.
const { initPhysics } = await import('../src/physics/world.ts')
const { Session } = await import('../src/core/session.ts')

await initPhysics()

/**
 * Attempts are capped well below the runtime's own limit. Nearly every attempt
 * resolves inside two seconds; an uncapped search spends all its time watching
 * balls that already missed.
 */
const MAX_TICKS = 240

// Concentrated where the ballistics say a solution must live: close to the
// roof's edge, low enough to be in the ball's path, tilted to deflect the shot
// to roughly 50 to 70 degrees.
const RAMP_X = [-2.4, -2, -1.6, -1.2, -0.9, -0.6, -0.3, 0]
const RAMP_Y = [0.2, 0.3, 0.42, 0.55, 0.7]
const RAMP_ROT = [-0.75, -0.6, -0.5, -0.4, -0.3, 0.3, 0.4, 0.5, 0.6, 0.75]
const AIM_Y = [-0.05, 0, 0.06]
const POWER = [0.9, 1]

/**
 * The no-ramp check is deliberately far denser than the solution search, and
 * sweeps steep angles the solution search never tries. A cheap trivial-check
 * would flatter the design by failing to find the shortcut a player will.
 */
const TRIVIAL_AIM_Y = Array.from({ length: 45 }, (_, i) => -0.2 + i * 0.14)
const TRIVIAL_POWER = [0.35, 0.5, 0.65, 0.8, 0.9, 1]

function attempt(level, placement, aimY, power) {
  const session = new Session(level)
  if (placement) {
    const verdict = session.place('ramp', placement.position, placement.rotationZ)
    if (verdict !== 'ok') return null
  }
  session.fire([1, aimY, 0], power)
  let ticks = 0
  while (ticks < MAX_TICKS && !session.step()) ticks++
  // How close the attempt came, so a level that is merely too hard can be told
  // apart from one that is geometrically impossible.
  const targets = session.level.targets
  const progress =
    targets.reduce((sum, t) => sum + (t.destroyed ? 1 : 1 - t.health / t.maxHealth), 0) / targets.length
  return { stars: session.result.stars, ticks, progress }
}

const results = []
for (const level of LEVELS) {
  let best = null
  let closest = { progress: 0 }
  let triedWithoutRamp = false

  // A level that can be beaten without using the ramp is not teaching anything,
  // so the search checks for that first and reports it as a design failure.
  for (const aimY of TRIVIAL_AIM_Y) {
    for (const power of TRIVIAL_POWER) {
      const outcome = attempt(level, null, aimY, power)
      if (outcome && outcome.stars > 0) {
        triedWithoutRamp = { aimY, power }
        break
      }
    }
    if (triedWithoutRamp) break
  }

  search: for (const x of RAMP_X) {
    for (const y of RAMP_Y) {
      for (const rotationZ of RAMP_ROT) {
        for (const aimY of AIM_Y) {
          for (const power of POWER) {
            const placement = { position: [x, y, 0], rotationZ }
            const outcome = attempt(level, placement, aimY, power)
            if (outcome && outcome.progress > closest.progress) closest = { ...outcome, placement, aimY, power }
            if (outcome && outcome.stars > 0) {
              best = { placement, aimY, power, ...outcome }
              break search
            }
          }
        }
      }
    }
  }

  results.push({ level, best, triedWithoutRamp })
  const status = best
    ? `solved in ${best.ticks} ticks (${best.stars} stars)`
    : `NO SOLUTION FOUND (best attempt did ${(closest.progress * 100).toFixed(0)}% damage` +
      (closest.placement
        ? `, ramp x=${closest.placement.position[0]} y=${closest.placement.position[1]} rot=${closest.placement.rotationZ}, aimY=${closest.aimY}, power=${closest.power})`
        : ')')
  const trivial = triedWithoutRamp
    ? `  [!] also winnable with no ramp (aimY ${triedWithoutRamp.aimY.toFixed(2)}, power ${triedWithoutRamp.power})`
    : ''
  console.log(`${level.id} ${level.name.padEnd(12)} ${status}${trivial}`)
}

mkdirSync(outDir, { recursive: true })
for (const { level, best } of results) {
  if (!best) continue
  const withSolution = {
    ...level,
    solution: {
      placements: [{ part: 'ramp', position: best.placement.position, rotationZ: best.placement.rotationZ }],
      aim: [1, best.aimY, 0],
      power: best.power,
    },
  }
  writeFileSync(join(outDir, `${level.id}.json`), JSON.stringify(withSolution, null, 2) + '\n')
}

const unsolved = results.filter((r) => !r.best)
const trivial = results.filter((r) => r.triedWithoutRamp)
if (unsolved.length > 0) {
  console.error(`\n${unsolved.length} level(s) have no solution. Fix the geometry before shipping them.`)
  process.exit(1)
}
if (trivial.length > 0) {
  console.error(`\n${trivial.length} level(s) can be won without placing the ramp. That defeats the build phase.`)
  process.exit(2)
}
console.log('\nAll levels solvable, and none winnable without the ramp.')
