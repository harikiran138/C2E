# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/auth-suite.spec.ts >> C2E Platform v5.1 - Authentication Suite >> TC-1.03: Super Admin Rejects "Program Admin" Login on /login
- Location: tests/auth-suite.spec.ts:28:7

# Error details

```
Error: page.fill: Test ended.
Call log:
  - waiting for locator('input[type="email"]')

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('C2E Platform v5.1 - Authentication Suite', () => {
  4   |   const BASE_URL = 'http://localhost:3000';
  5   | 
  6   |   test('TC-1.01: Super Admin Login Redirects to /dashboard', async ({ page }) => {
  7   |     await page.goto(`${BASE_URL}/login`);
  8   |     await page.fill('input[type="email"]', 'super@c2e.com');
  9   |     await page.fill('input[type="password"]', 'TestPass123!');
  10  |     await page.click('button[type="submit"]');
  11  |     
  12  |     // Should navigate to /dashboard
  13  |     await expect(page).toHaveURL(/.*\/dashboard/);
  14  |   });
  15  | 
  16  |   test('TC-1.02: Super Admin Rejects Wrong Credentials', async ({ page }) => {
  17  |     await page.goto(`${BASE_URL}/login`);
  18  |     await page.fill('input[type="email"]', 'super@c2e.com');
  19  |     await page.fill('input[type="password"]', 'WrongPass!');
  20  |     await page.click('button[type="submit"]');
  21  |     
  22  |     // Look for error message
  23  |     const errorMsg = page.locator('text=Invalid credentials');
  24  |     await expect(errorMsg).toBeVisible();
  25  |     await expect(page).toHaveURL(/.*\/login/);
  26  |   });
  27  | 
  28  |   test('TC-1.03: Super Admin Rejects "Program Admin" Login on /login', async ({ page }) => {
  29  |     await page.goto(`${BASE_URL}/login`);
> 30  |     await page.fill('input[type="email"]', 'prog-a1@test.com');
      |                ^ Error: page.fill: Test ended.
  31  |     await page.fill('input[type="password"]', 'TestPass123!');
  32  |     await page.click('button[type="submit"]');
  33  |     
  34  |     // Should remain on /login and show identical error
  35  |     const errorMsg = page.locator('text=Invalid credentials');
  36  |     await expect(errorMsg).toBeVisible();
  37  |   });
  38  | 
  39  |   test('TC-1.04: Institute Admin Login Redirects to /institution/dashboard', async ({ page }) => {
  40  |     await page.goto(`${BASE_URL}/institution/login`);
  41  |     await page.fill('input[type="email"]', 'inst-a@test.com');
  42  |     await page.fill('input[type="password"]', 'TestPass123!');
  43  |     await page.click('button[type="submit"]');
  44  |     
  45  |     await expect(page).toHaveURL(/.*\/institution\/dashboard/);
  46  |   });
  47  | 
  48  |   test('TC-1.05: Institute Admin Rejects Wrong Credentials', async ({ page }) => {
  49  |     await page.goto(`${BASE_URL}/institution/login`);
  50  |     await page.fill('input[type="email"]', 'inst-a@test.com');
  51  |     await page.fill('input[type="password"]', 'WrongPass!');
  52  |     await page.click('button[type="submit"]');
  53  |     
  54  |     const errorMsg = page.locator('text=Invalid credentials');
  55  |     await expect(errorMsg).toBeVisible();
  56  |   });
  57  | 
  58  |   test('TC-1.06: Institute Admin Rejects "Super Admin" Login on /institution/login', async ({ page }) => {
  59  |     await page.goto(`${BASE_URL}/institution/login`);
  60  |     await page.fill('input[type="email"]', 'super@c2e.com');
  61  |     await page.fill('input[type="password"]', 'TestPass123!');
  62  |     await page.click('button[type="submit"]');
  63  |     
  64  |     const errorMsg = page.locator('text=Invalid credentials');
  65  |     await expect(errorMsg).toBeVisible();
  66  |   });
  67  | 
  68  |   test('TC-1.07: Program Admin Login Redirects to /program/dashboard', async ({ page }) => {
  69  |     await page.goto(`${BASE_URL}/institution/login`);
  70  |     await page.fill('input[type="email"]', 'prog-a1@test.com');
  71  |     await page.fill('input[type="password"]', 'TestPass123!');
  72  |     await page.click('button[type="submit"]');
  73  |     
  74  |     await expect(page).toHaveURL(/.*\/program\/dashboard/);
  75  |   });
  76  | 
  77  |   test('TC-1.10: Super Admin Login Page Is Not Linked Anywhere', async ({ page }) => {
  78  |     await page.goto(`${BASE_URL}`);
  79  |     // Check that /login is not linked from the main landing page
  80  |     const loginLinkCount = await page.locator('a[href="/login"]').count();
  81  |     expect(loginLinkCount).toBe(0);
  82  |   });
  83  | 
  84  |   test('TC-1.12: All Logins Have Identical Error Messages', async ({ page }) => {
  85  |     // 1. Check Super Admin Login error text
  86  |     await page.goto(`${BASE_URL}/login`);
  87  |     await page.fill('input[type="email"]', 'invalid@test.com');
  88  |     await page.fill('input[type="password"]', 'invalid');
  89  |     await page.click('button[type="submit"]');
  90  |     await expect(page.locator('text=Invalid credentials')).toBeVisible();
  91  | 
  92  |     // 2. Check Institute/Program Admin Login error text
  93  |     await page.goto(`${BASE_URL}/institution/login`);
  94  |     await page.fill('input[type="email"]', 'invalid@test.com');
  95  |     await page.fill('input[type="password"]', 'invalid');
  96  |     await page.click('button[type="submit"]');
  97  |     await expect(page.locator('text=Invalid credentials')).toBeVisible();
  98  |   });
  99  | 
  100 |   test('TC-1.13: Unauthorized Access Redirects to /institution/login', async ({ page }) => {
  101 |     await page.goto(`${BASE_URL}/institution/dashboard`);
  102 |     await expect(page).toHaveURL(/.*\/institution\/login/);
  103 | 
  104 |     await page.goto(`${BASE_URL}/program/dashboard`);
  105 |     await expect(page).toHaveURL(/.*\/institution\/login/);
  106 |   });
  107 | 
  108 |   test('TC-1.14: Logged-in Program Admin Cannot Reach /login', async ({ page }) => {
  109 |     await page.goto(`${BASE_URL}/institution/login`);
  110 |     await page.fill('input[type="email"]', 'prog-a1@test.com');
  111 |     await page.fill('input[type="password"]', 'TestPass123!');
  112 |     await page.click('button[type="submit"]');
  113 |     await expect(page).toHaveURL(/.*\/program\/dashboard/);
  114 | 
  115 |     // Try to go to /login
  116 |     await page.goto(`${BASE_URL}/login`);
  117 |     await expect(page).toHaveURL(/.*\/program\/dashboard/);
  118 |   });
  119 | 
  120 |   test('TC-1.16: Verify "Stakeholder" Tab Is Not Present on Institution Login', async ({ page }) => {
  121 |     await page.goto(`${BASE_URL}/institution/login`);
  122 |     const stakeholderTabCount = await page.locator('text=Stakeholder').count();
  123 |     expect(stakeholderTabCount).toBe(0);
  124 |   });
  125 | });
  126 | 
```