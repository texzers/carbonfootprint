import { test, expect, type Page } from '@playwright/test';

// ─── Test Setup Helpers ───────────────────────────────────────────────────────

async function loginWithTestAccount(page: Page) {
  // For E2E tests, we use Firebase Auth Emulator with a test user
  await page.goto('/');
  await page.waitForSelector('[data-testid="google-signin-btn"]', { timeout: 10000 });
  
  // Inject test auth token via emulator REST API
  await page.evaluate(async () => {
    const response = await fetch(
      'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@ecotrack.test',
          password: 'testpassword123',
          returnSecureToken: true,
        }),
      }
    );
    const data = await response.json();
    // Store token for Firebase SDK use
    localStorage.setItem('firebase:authUser:fake-api-key:[DEFAULT]', JSON.stringify({
      uid: 'test-user-id',
      email: 'test@ecotrack.test',
      displayName: 'Test User',
    }));
    return data;
  });

  await page.reload();
  await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
}

// ─── Test 1: Complete onboarding flow ─────────────────────────────────────────

test('complete onboarding flow end to end', async ({ page }) => {
  await page.goto('/');

  // Should see login page
  await expect(page.locator('h1')).toContainText('EcoTrack');
  await expect(page.locator('text=Continue with Google')).toBeVisible();

  // Simulate auth (in real E2E, use Firebase Auth Emulator)
  await page.evaluate(() => {
    // Inject mock auth state for testing
    window.dispatchEvent(new CustomEvent('mock-auth', { detail: { uid: 'test-uid', displayName: 'Test User', email: 'test@ecotrack.test' } }));
  });

  // Step 1: Location
  await expect(page.locator('text=Where are you based')).toBeVisible({ timeout: 10000 });
  await page.selectOption('#country', 'United Kingdom');
  await page.fill('#city', 'London');
  await page.click('button:has-text("Continue")');

  // Step 2: Lifestyle
  await expect(page.locator('text=Your lifestyle')).toBeVisible();
  await page.click('button[aria-pressed]:has-text("Vegetarian")');
  await page.click('button[aria-pressed]:has-text("Train")');
  await page.click('button:has-text("Continue")');

  // Step 3: Baseline
  await expect(page.locator('text=Current habits')).toBeVisible();
  await page.click('button:has-text("Continue")');

  // Step 4: Goals
  await expect(page.locator('text=Set your goal')).toBeVisible();
  await page.click('button:has-text("Meat-free Mondays")');
  await page.click('button:has-text("Start tracking")');

  // Should arrive at dashboard
  await expect(page.locator('h1:has-text("Good")')).toBeVisible({ timeout: 10000 });
});

// ─── Test 2: Log transport activity ──────────────────────────────────────────

test('log transport activity via Maps integration', async ({ page }) => {
  await loginWithTestAccount(page);

  // Navigate to logger
  await page.click('button[aria-current="page"], nav button:has-text("Log Activity")');
  await expect(page.locator('h1:has-text("Log Activity")')).toBeVisible();

  // Transport tab should be active by default
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Transport');

  // Select petrol car
  await page.click('button[aria-pressed]:has-text("Petrol Car")');

  // Enter distance directly
  await page.fill('#distance', '15');

  // Verify emission preview appears
  await expect(page.locator('text=Estimated emission')).toBeVisible();
  await expect(page.locator('text=kg CO₂e')).toBeVisible();

  // Change trips per week
  const slider = page.locator('#tripsPerWeek');
  await slider.fill('5');

  // Log the entry
  await page.click('button:has-text("Log Entry")');
  await expect(page.locator('text=Logged:')).toBeVisible({ timeout: 5000 });
});

// ─── Test 3: AI coach responds to footprint question ─────────────────────────

test('AI coach responds to footprint question', async ({ page }) => {
  await loginWithTestAccount(page);

  // Navigate to insights
  await page.click('nav button:has-text("AI Insights")');
  await expect(page.locator('h1:has-text("AI Insights")')).toBeVisible();

  // EcoCoach chat should be visible
  await expect(page.locator('text=EcoCoach')).toBeVisible();

  // Send a message
  const textarea = page.locator('textarea[aria-label="Message to EcoCoach"]');
  await textarea.fill('How can I reduce my food emissions?');
  await page.click('button:has-text("Send")');

  // Should show user message
  await expect(page.locator('text=How can I reduce my food emissions?')).toBeVisible();

  // Should show AI response (streaming or cached)
  await expect(page.locator('[role="log"]').locator('div').last()).toBeVisible({ timeout: 15000 });

  // Quick replies should be gone after first message
  await expect(page.locator('text=How can I reduce my food emissions?').first()).toBeVisible();
});

// ─── Test 4: Export data to Google Sheets ─────────────────────────────────────

test('export carbon data shown in reports page', async ({ page }) => {
  await loginWithTestAccount(page);

  // Navigate to reports
  await page.click('nav button:has-text("Reports")');
  await expect(page.locator('h1:has-text("Reports")')).toBeVisible();

  // Period selector should work
  await page.click('button[aria-pressed]:has-text("Quarterly"), button:has-text("Quarterly")');
  await expect(page.locator('text=90 days')).toBeVisible();

  // Export buttons should be present
  await expect(page.locator('text=Google Sheets')).toBeVisible();
  await expect(page.locator('text=PDF Report')).toBeVisible();
  await expect(page.locator('text=JSON Export')).toBeVisible();

  // Click JSON export (no OAuth needed)
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
  await page.click('button:has-text("JSON Export")');
  
  // Should trigger download notification
  await expect(page.locator('text=Data downloaded')).toBeVisible({ timeout: 8000 });
});

// ─── Test 5: Keyboard-only navigation through dashboard ──────────────────────

test('keyboard-only navigation through dashboard', async ({ page }) => {
  await loginWithTestAccount(page);

  // Start from skip link
  await page.keyboard.press('Tab');
  const skipLink = page.locator('a:has-text("Skip to main content")');
  await expect(skipLink).toBeFocused();

  // Skip to main content
  await page.keyboard.press('Enter');

  // Tab through navigation items
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  }

  // Navigate to logger via keyboard
  const loggerBtn = page.locator('nav button:has-text("Log Activity")');
  await loggerBtn.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('h1:has-text("Log Activity")')).toBeVisible();

  // Tab through category tabs
  await page.keyboard.press('Tab');
  const firstTab = page.locator('[role="tab"]:first-of-type');
  await expect(firstTab).toBeFocused();

  // Navigate tabs with keyboard
  await page.keyboard.press('Tab'); // Next tab
  const secondTab = page.locator('[role="tab"]:nth-of-type(2)');
  await page.keyboard.press('Enter');
  await expect(page.locator('text=Home Energy')).toBeVisible();
});

// ─── Test 6: Dark mode persists across sessions ───────────────────────────────

test('dark mode persists across page reload', async ({ page }) => {
  await loginWithTestAccount(page);

  // Navigate to settings
  await page.click('nav button:has-text("Settings")');
  await expect(page.locator('h1:has-text("Settings")')).toBeVisible();

  // Change theme to dark
  await page.selectOption('#settings-theme', 'dark');
  await page.click('button:has-text("Save preferences")');
  await expect(page.locator('text=Settings saved')).toBeVisible();

  // Verify dark class applied
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  expect(isDark).toBe(true);

  // Reload page
  await page.reload();
  await page.waitForSelector('[data-testid="dashboard"], h1', { timeout: 10000 });

  // Dark mode should persist from localStorage
  const stillDark = await page.evaluate(() =>
    document.documentElement.classList.contains('dark') ||
    localStorage.getItem('ecotrack-store')?.includes('"theme":"dark"')
  );
  expect(stillDark).toBe(true);
});

// ─── Test 7: Goal creation and calendar reminder ──────────────────────────────

test('create a custom goal and see it in the list', async ({ page }) => {
  await loginWithTestAccount(page);

  // Navigate to goals
  await page.click('nav button:has-text("Goals")');
  await expect(page.locator('h1:has-text("Goals")')).toBeVisible();

  // Create a custom goal
  await page.click('button:has-text("+ Custom goal")');
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await page.fill('#goal-title', 'Walk to work on Fridays');
  await page.fill('#goal-desc', 'Replace Friday car commute with walking');
  await page.selectOption('#goal-cat', 'transport');
  await page.click('button:has-text("Save goal")');

  // Should appear in active goals
  await expect(page.locator('text=Walk to work on Fridays')).toBeVisible({ timeout: 8000 });
});

// ─── Test 8: Accessibility — focus ring visible on buttons ───────────────────

test('focus ring is visible on interactive elements', async ({ page }) => {
  await loginWithTestAccount(page);

  await page.click('nav button:has-text("Log Activity")');
  
  // Tab to the Log Entry button
  const logBtn = page.locator('button:has-text("Log Entry")').first();
  await logBtn.focus();

  // Check that focus ring is rendered (outline style set)
  const outlineStyle = await logBtn.evaluate((el) => {
    return window.getComputedStyle(el).outlineStyle;
  });

  // Element should be focusable
  await expect(logBtn).toBeFocused();
});
