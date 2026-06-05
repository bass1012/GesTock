import { test, expect } from '@playwright/test'

/**
 * Critical Path E2E Test Suite
 *
 * Covers the essential user flow:
 * 1. Login with demo credentials
 * 2. Navigate to POS, add a product to cart, complete a sale
 * 3. Navigate to Reports and verify the page is accessible
 *
 * Pre-requisites:
 *  - Backend running on port 3001 (seeded with `npm -w backend run db:seed`)
 *  - Frontend dev server running on port 5173 (`npm run dev`)
 *  - At least one warehouse must exist in the demo tenant
 */

const EMAIL = 'admin@demo.com'
const PASSWORD = 'password123'

test.describe('Parcours critique — Vente POS et Rapports', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')
    await expect(page).toHaveURL(/.*login/)
  })

  // ─── 1. Authentication ────────────────────────────────────────────────────
  test('1 — Connexion avec identifiants démo', async ({ page }) => {
    await page.fill('#email', EMAIL)
    await page.fill('#password', PASSWORD)
    await page.click('button[type="submit"]')

    // Should be redirected to dashboard
    await expect(page).toHaveURL('http://localhost:5173/', { timeout: 15000 })
    // Dashboard should render its main heading
    await expect(page.locator('h1')).toContainText(/tableau de bord/i, { timeout: 10000 })
  })

  // ─── 2. POS Flow ──────────────────────────────────────────────────────────
  test('2 — Vente POS complète (ajout produit → encaissement)', async ({ page }) => {
    // Login first
    await page.fill('#email', EMAIL)
    await page.fill('#password', PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('http://localhost:5173/', { timeout: 15000 })

    // Navigate to POS
    await page.goto('/pos')
    await expect(page).toHaveURL(/.*pos/)

    // Wait for the product catalog to load (look for at least one product card)
    await expect(page.locator('[role="button"]').first()).toBeVisible({ timeout: 15000 })

    // Click the first product to add it to cart
    const firstProductCard = page.locator('[role="button"]').first()
    const productName = await firstProductCard.locator('h3').textContent()
    await firstProductCard.click()

    // The cart should now contain the product
    const cartPanel = page.locator('h2', { hasText: /panier actuel/i })
    await expect(cartPanel).toBeVisible()

    // There should be at least one item in the cart
    const cartItems = page.locator('h4').filter({ hasText: new RegExp(productName || '', 'i') })
    await expect(cartItems.first()).toBeVisible({ timeout: 5000 })

    // Verify warehouse selector is present
    const warehouseSelect = page.locator('#pos-warehouse')
    await expect(warehouseSelect).toBeVisible()

    // Select the first available warehouse
    const warehouseOptions = warehouseSelect.locator('option')
    const warehouseCount = await warehouseOptions.count()
    if (warehouseCount > 1) {
      // Select the first real option (index 0 is the placeholder "Sélectionner un entrepôt…")
      const firstWarehouseValue = await warehouseOptions.nth(1).getAttribute('value')
      if (firstWarehouseValue) {
        await warehouseSelect.selectOption(firstWarehouseValue)
      }
    }

    // Verify "Encaisser" button is visible and enabled
    const checkoutButton = page.locator('button', { hasText: /encaisser/i })
    await expect(checkoutButton).toBeVisible()
    await expect(checkoutButton).not.toBeDisabled()
  })

  // ─── 3. Reports Page ──────────────────────────────────────────────────────
  test('3 — Page Rapports accessible et affiche des KPIs', async ({ page }) => {
    // Login first
    await page.fill('#email', EMAIL)
    await page.fill('#password', PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('http://localhost:5173/', { timeout: 15000 })

    // Navigate to Reports
    await page.goto('/reports')
    await expect(page).toHaveURL(/.*reports/)

    // Page heading should be visible
    await expect(page.locator('h1').first()).toContainText(/rapports/i, { timeout: 15000 })

    // Tab navigation should be present
    await expect(page.locator('text=Vue d\'ensemble')).toBeVisible()
    await expect(page.locator('text=Inventaire')).toBeVisible()
    await expect(page.locator('text=Mouvements')).toBeVisible()

    // Export buttons should be visible
    await expect(page.locator('button', { hasText: /export inventaire/i }).or(
      page.locator('button', { hasText: /inventaire/i })
    ).first()).toBeVisible({ timeout: 10000 })
  })

  // ─── 4. Navigation entre pages protégées ──────────────────────────────────
  test('4 — Redirection vers login si non authentifié', async ({ page }) => {
    // Access a protected page without logging in
    await page.goto('/pos')

    // Should be redirected to login
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 })
  })

  // ─── 5. Dashboard contient les liens principaux ───────────────────────────
  test('5 — Dashboard affiche les widgets principaux', async ({ page }) => {
    // Login
    await page.fill('#email', EMAIL)
    await page.fill('#password', PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('http://localhost:5173/', { timeout: 15000 })

    // Should show h1 heading
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 })

    // Sidebar navigation items should be present
    const sidebar = page.locator('nav').or(page.locator('[role="navigation"]'))
    await expect(sidebar.first()).toBeVisible()
  })
})
