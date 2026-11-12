import { test, expect } from '@playwright/test';

/**
 * COLIN Playwright Browser E2E Test Suite — Student Journey
 * Phase 4A Final Acceptance: Browser DOM Execution
 *
 * Covers:
 * 1. Registration / Login flow.
 * 2. Student dashboard presentation.
 * 3. Find My Stay & explore search/filters.
 * 4. Property details view (pricing, 55% refund badge, house rules).
 * 5. Guided visit slot request & simulated payment.
 * 6. Booking status tracking in Student Visits page.
 * 7. Student 12-hour decision lifecycle interaction.
 */

test.describe('Student Browser Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Clear client storage to ensure isolated test runs
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1. Student login, dashboard navigation, and personal greeting', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/COLIN/i);

    // Verify presence of login card and branding
    await expect(page.getByRole('heading', { name: /Sign in to your account/i })).toBeVisible();

    // Use deterministic student demo account fill
    const studentDemoBtn = page.getByRole('button', { name: /Student Account/i });
    await expect(studentDemoBtn).toBeVisible();
    await studentDemoBtn.click();

    // Verify successful redirection to Student Portal Dashboard
    await page.waitForURL('**/student/dashboard');
    await expect(page.getByText(/Aarav Mehra|Verified Scholar/i).first()).toBeVisible();

    // Verify key dashboard widgets
    await expect(page.getByText(/Quick Actions|Explore Accommodations|Find My Stay|Explore Stays/i).first()).toBeVisible();
  });

  test('2. Find My Stay: search, category filters, and property discovery', async ({ page }) => {
    // Authenticate as student
    await page.goto('/login');
    await page.getByRole('button', { name: /Student Account/i }).click();
    await page.waitForURL('**/student/dashboard');

    // Navigate to Find My Stay / Explore
    await page.goto('/student/explore');
    await expect(page.getByPlaceholder(/Search by city, campus, locality/i)).toBeVisible();

    // Verify initial property cards render
    const firstCard = page.getByRole('article').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    // Filter by clicking Popular North Campus pill
    const popularPill = page.getByRole('button', { name: 'North Campus' });
    if (await popularPill.isVisible()) {
      await popularPill.click();
    }

    // Verify filtered card is visible
    await expect(page.getByRole('article').first()).toBeVisible();
    await expect(page.getByText(/North Campus/i).first()).toBeVisible();
  });

  test('3. Property Details: verifies 55% refund guarantee badge, house rules, and visit pricing', async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.getByRole('button', { name: /Student Account/i }).click();
    await page.waitForURL('**/student/dashboard');

    // Open explore directory
    await page.goto('/student/explore');
    const firstCard = page.getByRole('article').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    // Click on the first property title to navigate to details
    await firstCard.getByRole('heading', { level: 3 }).click();

    // Verify property details page
    await expect(page.getByText(/Monthly Indicative Rent|Starting from|Rent/i).first()).toBeVisible();

    // Verify mandatory 55% refund guarantee banner
    await expect(page.getByText(/55% Eligible Refund/i)).toBeVisible();
    await expect(page.getByText(/₹82.50 Refundable/i)).toBeVisible();

    // Verify house rules section
    await expect(page.getByText(/House Rules & Community Norms/i)).toBeVisible();

    // Verify visit booking button
    const bookVisitBtn = page.getByRole('button', { name: /Book Guided Visit/i });
    await expect(bookVisitBtn).toBeVisible();
  });

  test('4. Guided Visit Request: opens modal, processes simulated payment, and creates booking', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Student Account/i }).click();
    await page.waitForURL('**/student/dashboard');

    // Go to explore and open first accommodation
    await page.goto('/student/explore');
    const firstCard = page.getByRole('article').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    // Click property to open detail view
    await firstCard.getByRole('heading', { level: 3 }).click();

    // Click Book Guided Visit CTA
    const bookVisitBtn = page.getByRole('button', { name: /Book Guided Visit/i });
    await bookVisitBtn.click();

    // Modal should be visible
    await expect(page.getByText(/Book Guided Visit & Inspection/i)).toBeVisible();
    await expect(page.getByText(/COLIN In-Person Visit Slot/i)).toBeVisible();

    // Submit booking with simulated fee payment via Confirm Slot Pass button
    const confirmBtn = page.getByRole('button', { name: /Confirm Slot Pass/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify receipt modal confirmation view
    await expect(page.getByText(/Visit Booking Request Submitted/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Reference:/i)).toBeVisible();
  });

  test('5. Booking Status & Student Decision tracking', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Student Account/i }).click();
    await page.waitForURL('**/student/dashboard');

    // Navigate to Student Visits Page
    await page.goto('/student/visits');

    // Verify page header and tabs
    await expect(page.getByRole('heading', { name: /My Visit Passes & Inspections/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Upcoming Visits/i })).toBeVisible();

    // Verify 12-hour decision protocol summary card
    await expect(page.getByText(/12-hour window|55% Visit Refund Guarantee/i).first()).toBeVisible();
  });
});
