import { test, expect } from '@playwright/test';

test.describe('C2E Platform v5.1 - Authentication Suite', () => {
  const BASE_URL = 'http://localhost:3000';

  test('TC-1.01: Super Admin Login Redirects to /dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[placeholder="admin@c2x.com"]', 'super@c2e.com');
    await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
    await page.click('button:has-text("Secure Login")');
    
    // Should navigate to /dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    // Ensure it's not the program dashboard
    expect(page.url()).not.toContain('/dashboard/');
  });

  test('TC-1.02: Super Admin Rejects Wrong Credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[placeholder="admin@c2x.com"]', 'super@c2e.com');
    await page.fill('input[placeholder="••••••••"]', 'WrongPass!');
    await page.click('button:has-text("Secure Login")');
    
    const errorMsg = page.locator('text=Invalid email or password.');
    await expect(errorMsg).toBeVisible();
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('TC-1.03: Super Admin Rejects "Program Admin" Login on /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[placeholder="admin@c2x.com"]', 'prog-a1@test.com');
    await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
    await page.click('button:has-text("Secure Login")');
    
    const errorMsg = page.locator('text=Invalid email or password.');
    await expect(errorMsg).toBeVisible();
  });

  test('TC-1.04: Institute Admin Login Redirects to /institution/dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/institution/login`);
    await page.fill('input[placeholder="institution@example.com"]', 'inst-a@test.com');
    await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
    
    // Use precise locator for the submit button (2nd button with "Sign In" text in v5.1)
    await page.locator('button:has-text("Sign In")').nth(1).click();
    
    await expect(page).toHaveURL(/.*\/institution\/dashboard/);
  });

  test('TC-1.05: Institute Admin Rejects Wrong Credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/institution/login`);
    await page.fill('input[placeholder="institution@example.com"]', 'inst-a@test.com');
    await page.fill('input[placeholder="••••••••"]', 'WrongPass!');
    await page.locator('button:has-text("Sign In")').nth(1).click();
    
    const errorMsg = page.locator('text=Invalid email or password.');
    await expect(errorMsg).toBeVisible();
  });

  test('TC-1.06: Institute Admin Rejects "Super Admin" Login on /institution/login', async ({ page }) => {
    await page.goto(`${BASE_URL}/institution/login`);
    await page.fill('input[placeholder="institution@example.com"]', 'super@c2e.com');
    await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
    await page.locator('button:has-text("Sign In")').nth(1).click();
    
    // v5.1 API/Service layer specifically rejects roles not matching the login context
    const errorMsg = page.locator('text=Invalid email or password.');
    await expect(errorMsg).toBeVisible();
  });

  test('TC-1.07: Program Admin Login Redirects to /dashboard/[id]', async ({ page }) => {
    await page.goto(`${BASE_URL}/institution/login`);
    await page.click('button:has-text("Program")');

    await page.fill('input[placeholder="e.g. mech@nsrit.c2x.ai"]', 'prog-a@test.com');
    await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
    await page.click('button:has-text("Program Sign In")');
    
    // Program dashboard in v5.1 is at /dashboard/[id]
    await expect(page).toHaveURL(/.*\/dashboard\/.*/);
  });

  test('TC-1.10: Super Admin Login Page Is Not Linked Anywhere', async ({ page }) => {
    await page.goto(`${BASE_URL}`);
    const loginLinkCount = await page.locator('a[href="/login"]').count();
    expect(loginLinkCount).toBe(0);
  });

  test('TC-1.12: All Logins Have Identical Error Messages', async ({ page }) => {
    // 1. Check Super Admin Login error text
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[placeholder="admin@c2x.com"]', 'invalid@test.com');
    await page.fill('input[placeholder="••••••••"]', 'invalid');
    await page.click('button:has-text("Secure Login")');
    const msg1 = page.locator('text=Invalid email or password.');
    await expect(msg1).toBeVisible();

    // 2. Check Institute Admin Login error text
    await page.goto(`${BASE_URL}/institution/login`);
    await page.fill('input[placeholder="institution@example.com"]', 'invalid@test.com');
    await page.fill('input[placeholder="••••••••"]', 'invalid');
    await page.locator('button:has-text("Sign In")').nth(1).click();
    const msg2 = page.locator('text=Invalid email or password.');
    await expect(msg2).toBeVisible();
  });

  test('TC-1.13: Unauthorized Access Redirects to /institution/login', async ({ page }) => {
    // Session is cleared on load of login page (v5.1 requirement)
    await page.goto(`${BASE_URL}/institution/dashboard`);
    await expect(page).toHaveURL(/.*\/institution\/login/);

    await page.goto(`${BASE_URL}/program/dashboard`); // Old path redirects to login or 404/dashboard/[id]
    await expect(page).toHaveURL(/.*\/institution\/login/);
  });

  test('TC-1.14: Logged-in Program Admin Cannot Reach /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/institution/login`);
    await page.click('button:has-text("Program")');

    await page.fill('input[placeholder="e.g. mech@nsrit.c2x.ai"]', 'prog-a@test.com');
    await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
    await page.click('button:has-text("Program Sign In")');

    await expect(page).toHaveURL(/.*\/dashboard\/.*/);

    // Try to go to /login (Super Admin login)
    await page.goto(`${BASE_URL}/login`);
    // Should be redirected back to their dashboard
    await expect(page).toHaveURL(/.*\/dashboard\/.*/);
  });

  test('TC-1.17: Super Admin Logout Clears Session', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[placeholder="admin@c2x.com"]', 'super@c2e.com');
    await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
    await page.click('button:has-text("Secure Login")');
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Logout
    await page.click('button[title="Logout"]');
    await expect(page).toHaveURL(/.*\/login/);

    // Verify access is revoked
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('TC-1.18: Institute Admin Logout Clears Session', async ({ page }) => {
    await page.goto(`${BASE_URL}/institution/login`);
    await page.fill('input[placeholder="institution@example.com"]', 'inst-a@test.com');
    await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
    await page.locator('button:has-text("Sign In")').nth(1).click();
    await expect(page).toHaveURL(/.*\/institution\/dashboard/);

    // Logout
    await page.click('button[title="Logout"]');
    await expect(page).toHaveURL(/.*\/institution\/login/);

    // Verify access revoked
    await page.goto(`${BASE_URL}/institution/dashboard`);
    await expect(page).toHaveURL(/.*\/institution\/login/);
  });

  test('TC-1.20: Program Admin Logout Clears Session', async ({ page }) => {
    await page.goto(`${BASE_URL}/institution/login`);
    await page.click('button:has-text("Program")');

    await page.fill('input[placeholder="e.g. mech@nsrit.c2x.ai"]', 'prog-a@test.com');
    await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
    await page.click('button:has-text("Program Sign In")');
    await expect(page).toHaveURL(/.*\/dashboard\/.*/);

    // Logout
    await page.click('button[title="Logout"]');
    await expect(page).toHaveURL(/.*\/institution\/login/);

    // Verify access revoked
    await page.goto(`${BASE_URL}/dashboard/some-id`);
    await expect(page).toHaveURL(/.*\/institution\/login/);
  });
});
