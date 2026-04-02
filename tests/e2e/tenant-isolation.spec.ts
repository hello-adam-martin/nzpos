import { test, expect } from '@playwright/test'

test.describe('Cross-tenant subdomain isolation', () => {
  test('visiting different subdomain does not leak store data', async ({ page }) => {
    // Visit demo store, then visit nonexistent — should get 404, not demo data
    await page.goto('http://demo.lvh.me:3000/')
    await expect(page.locator('body')).not.toContainText('Store not found')

    await page.goto('http://other-store.lvh.me:3000/')
    await expect(page.locator('body')).toContainText('Store not found')
  })

  test('navigating between valid and invalid subdomains resolves correctly each time', async ({ page }) => {
    // Invalid -> valid -> invalid to confirm no stale tenant state
    await page.goto('http://fake-shop.lvh.me:3000/')
    await expect(page.locator('body')).toContainText('Store not found')

    await page.goto('http://demo.lvh.me:3000/')
    await expect(page.locator('body')).not.toContainText('Store not found')

    await page.goto('http://another-fake.lvh.me:3000/')
    await expect(page.locator('body')).toContainText('Store not found')
  })
})
