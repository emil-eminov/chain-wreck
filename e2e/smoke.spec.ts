import { expect, test } from '@playwright/test'

test('boots with no console errors and builds the level', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await page.waitForFunction(() => window.__chainwreck !== undefined, null, { timeout: 30_000 })
  await page.waitForTimeout(1200)

  const stats = await page.evaluate(() => window.__chainwreck!.stats())
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([])
  expect(stats.frames).toBeGreaterThan(10)
  expect(stats.bodies).toBeGreaterThan(2)
  expect(await page.evaluate(() => window.__chainwreck!.phase!())).toBe('BUILD')
})

test('the recorded solution wins the level in the browser too', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__chainwreck !== undefined, null, { timeout: 30_000 })
  expect(await page.evaluate(() => window.__chainwreck!.fireSolution!())).toBe(true)
  await page.waitForFunction(() => window.__chainwreck!.phase!() === 'RESULT', null, { timeout: 20_000 })
  await expect(page.locator('[data-card-verdict]')).toHaveText('Wrecked')
  await expect(page.locator('[data-card-stars]')).toContainText('★')
})

test('the hud offers a build with one ramp and a fire button', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__chainwreck !== undefined, null, { timeout: 30_000 })
  await expect(page.locator('[data-parts]')).toHaveText('Ramp 1/1')
  await expect(page.locator('[data-fire]')).toBeVisible()
  await expect(page.locator('[data-title]')).toContainText('Up And Over')
})

test('level 1 renders as designed', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__chainwreck !== undefined, null, { timeout: 30_000 })
  await page.waitForTimeout(1500)
  expect(await page.screenshot()).toMatchSnapshot('level-01.png', { maxDiffPixelRatio: 0.03 })
})
