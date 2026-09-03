import { expect, test } from '@playwright/test'

/**
 * The 3D decision (SPEC 2.6) put the frame budget at risk, so this runs at the
 * foundation rather than at polish. It asserts only what a GPU-less sandbox can
 * measure honestly. If p95 step cost exceeds the budget here, it will be worse
 * on a phone, and that is a stop-and-talk moment, not a number to edit down.
 */

/** One tick has 16.6ms total. Physics may claim a quarter of it, no more. */
const STEP_BUDGET_MS = 4
const DRAW_CALL_BUDGET = 60
const BODY_BUDGET = 80

test('80 dynamic bodies stay inside the physics and draw-call budgets', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__chainwreck !== undefined, null, { timeout: 30_000 })

  await page.evaluate((n) => window.__chainwreck!.stress(n), BODY_BUDGET - 6)
  await page.waitForTimeout(500)
  await page.evaluate(() => window.__chainwreck!.resetStats())
  await page.waitForTimeout(4000)

  const stats = await page.evaluate(() => window.__chainwreck!.stats())
  expect(stats.bodies).toBe(BODY_BUDGET)
  expect(stats.frames, 'loop should still be running').toBeGreaterThan(30)
  expect(stats.stepMs, `p95 physics step ${stats.stepMs}ms`).toBeLessThan(STEP_BUDGET_MS)
  expect(stats.drawCalls, `draw calls ${stats.drawCalls}`).toBeLessThan(DRAW_CALL_BUDGET)
})
