# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/auth-suite.spec.ts >> C2E Platform v5.1 - Authentication Suite >> TC-1.02: Super Admin Rejects Wrong Credentials
- Location: tests/auth-suite.spec.ts:16:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="email"]')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - link "C2X Logo" [ref=e5] [cursor=pointer]:
        - /url: /
        - img "C2X Logo" [ref=e8]
      - navigation [ref=e9]:
        - link "Home" [ref=e10] [cursor=pointer]:
          - /url: /
          - text: Home
        - link "About" [ref=e12] [cursor=pointer]:
          - /url: /#about
        - link "Services" [ref=e13] [cursor=pointer]:
          - /url: /#services
    - link "Login" [ref=e15] [cursor=pointer]:
      - /url: /institution/login
      - img [ref=e16]
      - generic [ref=e19]: Login
  - main [ref=e20]:
    - generic [ref=e25]:
      - link "Back" [ref=e26] [cursor=pointer]:
        - /url: /
        - img [ref=e27]
        - generic [ref=e29]: Back
      - main [ref=e32]:
        - generic [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]:
              - img "C2X Logo" [ref=e38]
              - generic [ref=e39]:
                - generic [ref=e40]: C2X Plus+
                - generic [ref=e41]: Compliance to Excellence
            - heading "System Administration" [level=1] [ref=e42]
            - paragraph [ref=e44]:
              - img [ref=e45]
              - text: Super Admin Access Only
          - generic [ref=e48]:
            - generic [ref=e49]:
              - generic [ref=e50]:
                - img [ref=e51]
                - text: Admin ID / Email
              - generic [ref=e55]:
                - img
                - textbox "admin@c2x.com" [ref=e56]
              - generic [ref=e57]:
                - img [ref=e58]
                - text: Password
              - generic [ref=e62]:
                - textbox "••••••••" [ref=e63]
                - button [ref=e64]:
                  - img [ref=e65]
            - button "Secure Login" [ref=e68]:
              - text: Secure Login
              - img [ref=e69]
  - contentinfo [ref=e71]:
    - generic [ref=e73]:
      - generic [ref=e74]:
        - generic [ref=e75]: C2X
        - paragraph [ref=e76]: © 2026 Compliance to Excellence. All Rights Reserved.
      - generic [ref=e77]:
        - link "About" [ref=e79] [cursor=pointer]:
          - /url: /#about
          - text: About
        - link "Services" [ref=e81] [cursor=pointer]:
          - /url: /#services
          - text: Services
        - link "Login" [ref=e83] [cursor=pointer]:
          - /url: /login
          - text: Login
      - generic [ref=e84]:
        - link "Social Link" [ref=e85] [cursor=pointer]:
          - /url: "#"
          - img [ref=e86]
        - link "Social Link" [ref=e90] [cursor=pointer]:
          - /url: "#"
          - img [ref=e91]
        - link "Social Link" [ref=e93] [cursor=pointer]:
          - /url: "#"
          - img [ref=e94]
  - generic [active]:
    - generic [ref=e99]:
      - generic [ref=e100]:
        - generic [ref=e101]:
          - navigation [ref=e102]:
            - button "previous" [disabled] [ref=e103]:
              - img "previous" [ref=e104]
            - generic [ref=e106]:
              - generic [ref=e107]: 1/
              - text: "1"
            - button "next" [disabled] [ref=e108]:
              - img "next" [ref=e109]
          - img
        - generic [ref=e111]:
          - link "Next.js 16.1.6 (stale) Turbopack" [ref=e112] [cursor=pointer]:
            - /url: https://nextjs.org/docs/messages/version-staleness
            - img [ref=e113]
            - generic "There is a newer version (16.2.2) available, upgrade recommended!" [ref=e115]: Next.js 16.1.6 (stale)
            - generic [ref=e116]: Turbopack
          - img
      - dialog "Build Error" [ref=e118]:
        - generic [ref=e121]:
          - generic [ref=e122]:
            - generic [ref=e123]:
              - generic [ref=e125]: Build Error
              - generic [ref=e126]:
                - button "Copy Error Info" [ref=e127] [cursor=pointer]:
                  - img [ref=e128]
                - button "No related documentation found" [disabled] [ref=e130]:
                  - img [ref=e131]
                - button "Attach Node.js inspector" [ref=e133] [cursor=pointer]:
                  - img [ref=e134]
            - generic [ref=e143]: Parsing ecmascript source code failed
          - generic [ref=e145]:
            - generic [ref=e147]:
              - img [ref=e149]
              - generic [ref=e152]: ./components/institution/Login.tsx (722:19)
              - button "Open in editor" [ref=e153] [cursor=pointer]:
                - img [ref=e155]
            - generic [ref=e158]:
              - generic [ref=e159]: Parsing ecmascript source code failed
              - generic [ref=e160]: 720 |
              - text: </button>
              - generic [ref=e161]: 721 |
              - text: </motion.div> >
              - generic [ref=e162]: 722 |
              - generic [ref=e163]: )
              - text: ":"
              - generic [ref=e164]: authMode
              - text: === "program" ?
              - generic [ref=e165]: (
              - generic [ref=e166]: "|"
              - text: ^
              - generic [ref=e167]: 723 |
              - text: <motion.
              - generic [ref=e168]: div
              - generic [ref=e169]: 724 |
              - generic [ref=e170]: key
              - text: ="program-signin"
              - generic [ref=e171]: 725 |
              - generic [ref=e172]: initial
              - text: =
              - generic [ref=e173]: "{{ opacity"
              - text: ": 0,"
              - generic [ref=e174]: "y"
              - text: ": 15"
              - generic [ref=e175]: "}}"
              - generic [ref=e176]: "Expected '</', got ':' Import traces: Client Component Browser: ./components/institution/Login.tsx [Client Component Browser] ./app/institution/login/page.tsx [Client Component Browser] ./app/institution/login/page.tsx [Server Component] Client Component SSR: ./components/institution/Login.tsx [Client Component SSR] ./app/institution/login/page.tsx [Client Component SSR] ./app/institution/login/page.tsx [Server Component]"
        - generic [ref=e177]: "1"
        - generic [ref=e178]: "2"
    - generic [ref=e183] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e184]:
        - img [ref=e185]
      - button "Open issues overlay" [ref=e189]:
        - generic [ref=e190]:
          - generic [ref=e191]: "0"
          - generic [ref=e192]: "1"
        - generic [ref=e193]: Issue
  - alert [ref=e194]
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
> 18  |     await page.fill('input[type="email"]', 'super@c2e.com');
      |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
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
  30  |     await page.fill('input[type="email"]', 'prog-a1@test.com');
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
```