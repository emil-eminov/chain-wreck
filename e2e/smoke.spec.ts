import { expect, test } from '@playwright/test'

test('boots with no console errors and renders the scene', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await page.waitForFunction(() => window.__chainwreck !== undefined, null, { timeout: 30_000 })
  await page.waitForTimeout(1500)

  const stats = await page.evaluate(() => window.__chainwreck!.stats())
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([])
  expect(stats.frames).toBeGreaterThan(10)
  expect(stats.bodies).toBe(6)
  expect(stats.drawCalls).toBeGreaterThan(0)
})

test('the dropped stack comes to rest instead of jittering forever', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__chainwreck !== undefined, null, { timeout: 30_000 })
  await page.waitForTimeout(4000)
  expect(await page.screenshot()).toMatchSnapshot('resting-stack.png', { maxDiffPixelRatio: 0.02 })
})
