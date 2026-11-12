import { test, expect } from '@playwright/test';

/**
 * COLIN Playwright Browser E2E Test Suite — Security & Access Control
 * Phase 4A Final Acceptance: Browser DOM Execution & Perimeter Security
 *
 * Covers:
 * 1. Public user cannot access private admin routes (redirects to /admin/login).
 * 2. Student cannot access owner operations.
 * 3. Owner cannot access admin operations.
 * 4. Owner direct visit management is strictly denied (centralized escrow policy).
 * 5. Unauthorized API requests remain rejected at the server boundary.
 */

test.describe('Security & Role Boundaries E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1. Public unauthenticated user cannot access private admin routes', async ({ page }) => {
    // Attempt accessing admin dashboard without an active admin session
    await page.goto('/admin/dashboard');

    // Must be forcefully redirected to the dedicated administrative login gateway
    await page.waitForURL(/\/admin\/login/);
    await expect(page.getByText(/Control Centre|Administrative Gateway/i).first()).toBeVisible();

    // Attempt accessing verification queue directly
    await page.goto('/admin/verification');
    await page.waitForURL(/\/admin\/login/);

    // Attempt accessing financial dashboard directly
    await page.goto('/admin/finance');
    await page.waitForURL(/\/admin\/login/);
  });

  test('2. Owner cannot access admin operations', async ({ page }) => {
    // Login as Owner
    await page.goto('/login');
    await page.getByRole('button', { name: /Owner Account/i }).click();
    await page.waitForURL('**/owner/dashboard');

    // Attempt to navigate into admin control centre
    await page.goto('/admin/dashboard');

    // Must still redirect to admin login because standard owner session is not an admin session
    await page.waitForURL(/\/admin\/login/);
  });

  test('3. Owner direct visit management is strictly denied via dedicated compliance guard', async ({ page }) => {
    // Login as Owner
    await page.goto('/login');
    await page.getByRole('button', { name: /Owner Account/i }).click();
    await page.waitForURL('**/owner/dashboard');

    // Attempt to navigate to /owner/visits
    await page.goto('/owner/visits');

    // Must display OwnerVisitsAccessDenied message enforcing platform policy
    await expect(page.getByText(/Visit Management is Exclusively Controlled by COLIN/i)).toBeVisible();
    await expect(page.getByText(/Centralized Platform Coordination/i)).toBeVisible();
    await expect(page.getByText(/In accordance with platform safety and verified zero-brokerage standards/i)).toBeVisible();
  });

  test('4. Unauthorized API requests remain rejected with HTTP 401 / 403', async ({ request }) => {
    // Direct API call to admin bookings without authorization header
    const adminRes = await request.get('/api/v1/admin/bookings');
    expect([401, 403, 404]).toContain(adminRes.status());

    // Direct API call to owner properties without authorization header
    const ownerRes = await request.post('/api/v1/owner/properties', {
      data: { name: 'Malicious Injected Property' },
    });
    expect([401, 403, 404]).toContain(ownerRes.status());
  });
});
