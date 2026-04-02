import { test, expect } from '@playwright/test'

test.describe('Subdomain tenant routing', () => {
  test('valid slug subdomain loads store storefront', async ({ page }) => {
    // 'demo' is the seed store slug
    await page.goto('http://demo.lvh.me:3000/')
    // Storefront should load — check for store content (not 404)
    await expect(page.locator('body')).not.toContainText('Store not found')
    // The page should have rendered (not a blank error page)
    await expect(page).not.toHaveURL(/not-found/)
  })

  test('unknown subdomain shows 404 store not found', async ({ page }) => {
    await page.goto('http://nonexistent-store-xyz.lvh.me:3000/')
    await expect(page.locator('body')).toContainText('Store not found')
  })

  test('root domain does not resolve to any store', async ({ page }) => {
    await page.goto('http://lvh.me:3000/')
    // Root domain should not show store-not-found
    // It should show marketing/landing page or default Next.js page
    await expect(page.locator('body')).not.toContainText('Store not found')
  })

  test('admin route on subdomain redirects to login', async ({ page }) => {
    await page.goto('http://demo.lvh.me:3000/admin')
    // Should redirect to login (auth still enforced on subdomains)
    await expect(page).toHaveURL(/login/)
  })

  test('POS route on subdomain redirects to POS login', async ({ page }) => {
    await page.goto('http://demo.lvh.me:3000/pos')
    // Should redirect to /pos/login (auth still enforced)
    await expect(page).toHaveURL(/pos\/login/)
  })
})
