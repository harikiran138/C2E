# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/auth-suite.spec.ts >> C2E Platform v5.1 - Authentication Suite >> TC-1.12: All Logins Have Identical Error Messages
- Location: tests/auth-suite.spec.ts:87:7

# Error details

```
Error: locator.click: Error: strict mode violation: locator('main button:has-text("Sign In")') resolved to 2 elements:
    1) <button class="relative z-10 flex-1 rounded-lg py-2.5 text-xs font-bold transition-all text-primary-foreground">Sign In</button> aka locator('button').filter({ hasText: /^Sign In$/ })
    2) <button class="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">…</button> aka getByRole('button', { name: 'Sign In' }).nth(1)

Call log:
  - waiting for locator('main button:has-text("Sign In")')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e7]:
      - link "Back" [ref=e8] [cursor=pointer]:
        - /url: /
        - img [ref=e9]
        - generic [ref=e11]: Back
      - main [ref=e14]:
        - generic [ref=e16]:
          - generic [ref=e17]:
            - generic [ref=e18]:
              - img "C2X Logo" [ref=e20]
              - generic [ref=e21]:
                - generic [ref=e22]: C2X Plus+
                - generic [ref=e23]: Compliance to Excellence
            - heading "Welcome Back" [level=1] [ref=e24]
            - generic [ref=e25]:
              - button "Institute" [ref=e26]
              - button "Program" [ref=e27]
              - button "Stakeholder" [ref=e28]
            - generic [ref=e30]:
              - button "Sign In" [ref=e31]
              - button "Sign Up" [ref=e32]
          - generic [ref=e34]:
            - generic [ref=e35]:
              - generic [ref=e36]:
                - img [ref=e37]
                - text: Email Address
              - generic [ref=e41]:
                - img
                - textbox "institution@example.com" [ref=e42]: invalid@test.com
              - generic [ref=e43]:
                - img [ref=e44]
                - text: Password
              - generic [ref=e48]:
                - textbox "••••••••" [active] [ref=e49]: invalid
                - button [ref=e50]:
                  - img [ref=e51]
            - button "Sign In" [ref=e54]:
              - text: Sign In
              - img [ref=e55]
          - generic [ref=e59]: Database Connected Securely
  - button "Open Next.js Dev Tools" [ref=e65] [cursor=pointer]:
    - img [ref=e66]
  - alert [ref=e69]
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
  8   |     await page.fill('input[placeholder="admin@c2x.com"]', 'super@c2e.com');
  9   |     await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
  10  |     await page.click('button:has-text("Secure Login")');
  11  |     
  12  |     // Should navigate to /dashboard
  13  |     await expect(page).toHaveURL(/.*\/dashboard/);
  14  |   });
  15  | 
  16  |   test('TC-1.02: Super Admin Rejects Wrong Credentials', async ({ page }) => {
  17  |     await page.goto(`${BASE_URL}/login`);
  18  |     await page.fill('input[placeholder="admin@c2x.com"]', 'super@c2e.com');
  19  |     await page.fill('input[placeholder="••••••••"]', 'WrongPass!');
  20  |     await page.click('button:has-text("Secure Login")');
  21  |     
  22  |     // Look for error message
  23  |     const errorMsg = page.locator('text=Invalid email or password.');
  24  |     await expect(errorMsg).toBeVisible();
  25  |     await expect(page).toHaveURL(/.*\/login/);
  26  |   });
  27  | 
  28  |   test('TC-1.03: Super Admin Rejects "Program Admin" Login on /login', async ({ page }) => {
  29  |     await page.goto(`${BASE_URL}/login`);
  30  |     await page.fill('input[placeholder="admin@c2x.com"]', 'prog-a1@test.com');
  31  |     await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
  32  |     await page.click('button:has-text("Secure Login")');
  33  |     
  34  |     // Should remain on /login and show identical error
  35  |     const errorMsg = page.locator('text=Invalid email or password.');
  36  |     await expect(errorMsg).toBeVisible();
  37  |   });
  38  | 
  39  |   test('TC-1.04: Institute Admin Login Redirects to /institution/dashboard', async ({ page }) => {
  40  |     await page.goto(`${BASE_URL}/institution/login`);
  41  |     await page.fill('input[placeholder="institution@example.com"]', 'inst-a@test.com');
  42  |     await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
  43  |     // Specific sign-in button in form
  44  |     await page.locator('main button:has-text("Sign In")').click();
  45  |     
  46  |     await expect(page).toHaveURL(/.*\/institution\/dashboard/);
  47  |   });
  48  | 
  49  |   test('TC-1.05: Institute Admin Rejects Wrong Credentials', async ({ page }) => {
  50  |     await page.goto(`${BASE_URL}/institution/login`);
  51  |     await page.fill('input[placeholder="institution@example.com"]', 'inst-a@test.com');
  52  |     await page.fill('input[placeholder="••••••••"]', 'WrongPass!');
  53  |     await page.click('main button:has-text("Sign In")');
  54  |     
  55  |     const errorMsg = page.locator('text=Invalid email or password.');
  56  |     await expect(errorMsg).toBeVisible();
  57  |   });
  58  | 
  59  |   test('TC-1.06: Institute Admin Rejects "Super Admin" Login on /institution/login', async ({ page }) => {
  60  |     await page.goto(`${BASE_URL}/institution/login`);
  61  |     await page.fill('input[placeholder="institution@example.com"]', 'super@c2e.com');
  62  |     await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
  63  |     await page.locator('main button:has-text("Sign In")').click();
  64  |     
  65  |     const errorMsg = page.locator('text=Invalid email or password.');
  66  |     await expect(errorMsg).toBeVisible();
  67  |   });
  68  | 
  69  |   test('TC-1.07: Program Admin Login Redirects to /program/dashboard', async ({ page }) => {
  70  |     await page.goto(`${BASE_URL}/institution/login`);
  71  |     // Click Program tab
  72  |     await page.click('button:has-text("Program")');
  73  | 
  74  |     await page.fill('input[placeholder="e.g. mech@nsrit.c2x.ai"]', 'prog-a@test.com');
  75  |     await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
  76  |     await page.click('button:has-text("Program Sign In")');
  77  |     
  78  |     await expect(page).toHaveURL(/.*\/program\/dashboard/);
  79  |   });
  80  | 
  81  |   test('TC-1.10: Super Admin Login Page Is Not Linked Anywhere', async ({ page }) => {
  82  |     await page.goto(`${BASE_URL}`);
  83  |     const loginLinkCount = await page.locator('a[href="/login"]').count();
  84  |     expect(loginLinkCount).toBe(0);
  85  |   });
  86  | 
  87  |   test('TC-1.12: All Logins Have Identical Error Messages', async ({ page }) => {
  88  |     // 1. Check Super Admin Login error text
  89  |     await page.goto(`${BASE_URL}/login`);
  90  |     await page.fill('input[placeholder="admin@c2x.com"]', 'invalid@test.com');
  91  |     await page.fill('input[placeholder="••••••••"]', 'invalid');
  92  |     await page.click('button:has-text("Secure Login")');
  93  |     await expect(page.locator('text=Invalid email or password.')).toBeVisible();
  94  | 
  95  |     // 2. Check Institute/Program Admin Login error text
  96  |     await page.goto(`${BASE_URL}/institution/login`);
  97  |     await page.fill('input[placeholder="institution@example.com"]', 'invalid@test.com');
  98  |     await page.fill('input[placeholder="••••••••"]', 'invalid');
> 99  |     await page.locator('main button:has-text("Sign In")').click();
      |                                                           ^ Error: locator.click: Error: strict mode violation: locator('main button:has-text("Sign In")') resolved to 2 elements:
  100 |     await expect(page.locator('text=Invalid email or password.')).toBeVisible();
  101 |   });
  102 | 
  103 |   test('TC-1.13: Unauthorized Access Redirects to /institution/login', async ({ page }) => {
  104 |     await page.goto(`${BASE_URL}/institution/dashboard`);
  105 |     await expect(page).toHaveURL(/.*\/institution\/login/);
  106 | 
  107 |     await page.goto(`${BASE_URL}/program/dashboard`);
  108 |     await expect(page).toHaveURL(/.*\/institution\/login/);
  109 |   });
  110 | 
  111 |   test('TC-1.14: Logged-in Program Admin Cannot Reach /login', async ({ page }) => {
  112 |     await page.goto(`${BASE_URL}/institution/login`);
  113 |     await page.click('button:has-text("Program")');
  114 | 
  115 |     await page.fill('input[placeholder="e.g. mech@nsrit.c2x.ai"]', 'prog-a@test.com');
  116 |     await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
  117 |     await page.click('button:has-text("Program Sign In")');
  118 | 
  119 |     await expect(page).toHaveURL(/.*\/program\/dashboard/);
  120 | 
  121 |     // Try to go to /login
  122 |     await page.goto(`${BASE_URL}/login`);
  123 |     await expect(page).toHaveURL(/.*\/program\/dashboard/);
  124 |   });
  125 | 
  126 |   test('TC-1.17: Super Admin Logout Clears Session', async ({ page }) => {
  127 |     // 1. Login
  128 |     await page.goto(`${BASE_URL}/login`);
  129 |     await page.fill('input[placeholder="admin@c2x.com"]', 'super@c2e.com');
  130 |     await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
  131 |     await page.click('button:has-text("Secure Login")');
  132 |     await expect(page).toHaveURL(/.*\/dashboard/);
  133 | 
  134 |     // 2. Logout
  135 |     await page.click('button[title="Sign Out"]');
  136 |     
  137 |     // 3. Verify redirection
  138 |     await expect(page).toHaveURL(/.*\/login/);
  139 | 
  140 |     // 4. Verify access is revoked
  141 |     await page.goto(`${BASE_URL}/dashboard`);
  142 |     await expect(page).toHaveURL(/.*\/login/);
  143 |   });
  144 | 
  145 |   test('TC-1.18: Institute Admin Logout Clears Session', async ({ page }) => {
  146 |     // 1. Login
  147 |     await page.goto(`${BASE_URL}/institution/login`);
  148 |     await page.fill('input[placeholder="institution@example.com"]', 'inst-a@test.com');
  149 |     await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
  150 |     await page.locator('main button:has-text("Sign In")').click();
  151 |     await expect(page).toHaveURL(/.*\/institution\/dashboard/);
  152 | 
  153 |     // 2. Logout
  154 |     await page.click('button[title="Logout"]');
  155 |     
  156 |     // 3. Verify redirection
  157 |     await expect(page).toHaveURL(/.*\/institution\/login/);
  158 | 
  159 |     // 4. Verify access is revoked
  160 |     await page.goto(`${BASE_URL}/institution/dashboard`);
  161 |     await expect(page).toHaveURL(/.*\/institution\/login/);
  162 |   });
  163 | 
  164 |   test('TC-1.20: Program Admin Logout Clears Session', async ({ page }) => {
  165 |     // 1. Login
  166 |     await page.goto(`${BASE_URL}/institution/login`);
  167 |     await page.click('button:has-text("Program")');
  168 | 
  169 |     await page.fill('input[placeholder="e.g. mech@nsrit.c2x.ai"]', 'prog-a@test.com');
  170 |     await page.fill('input[placeholder="••••••••"]', 'TestPass123!');
  171 |     await page.click('button:has-text("Program Sign In")');
  172 |     await expect(page).toHaveURL(/.*\/program\/dashboard/);
  173 | 
  174 |     // 2. Logout
  175 |     await page.click('button[title="Logout"]');
  176 | 
  177 |     // 3. Verify redirection
  178 |     await expect(page).toHaveURL(/.*\/institution\/login/);
  179 | 
  180 |     // 4. Verify access is revoked
  181 |     await page.goto(`${BASE_URL}/program/dashboard`);
  182 |     await expect(page).toHaveURL(/.*\/institution\/login/);
  183 |   });
  184 | });
  185 | 
```