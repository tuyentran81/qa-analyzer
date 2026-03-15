/**
 * Solution Generator Service
 * Analyses Playwright test failures and generates actionable fix recommendations.
 */

const SOLUTION_MAP = {
  timeout: {
    category: 'Performance / Timing',
    priority: 'high',
    getRootCause: (failure) =>
      `The test exceeded its timeout waiting for "${failure.testName}". This is commonly caused by slow network responses, missing await keywords, or elements that take too long to appear.`,
    getSolutionSteps: (failure) => [
      {
        step: 1,
        title: 'Increase timeout selectively',
        description: 'Use locator-scoped or test-scoped timeouts instead of global settings.',
        code: `// Increase timeout for a specific action\nawait page.locator('.slow-element').waitFor({ timeout: 30000 });\n\n// Or set per-test timeout\ntest.setTimeout(60000);`,
      },
      {
        step: 2,
        title: 'Use Playwright auto-waiting',
        description: 'Rely on Playwright\'s built-in auto-waiting rather than arbitrary sleeps.',
        code: `// ❌ Avoid\nawait page.waitForTimeout(3000);\n\n// ✅ Prefer - waits until element is actionable\nawait page.locator('#submit-btn').click();\n\n// ✅ Wait for network idle\nawait page.waitForLoadState('networkidle');`,
      },
      {
        step: 3,
        title: 'Add explicit waitFor conditions',
        description: 'Wait for specific conditions rather than arbitrary delays.',
        code: `await page.waitForSelector('[data-testid="result"]', { state: 'visible' });\nawait expect(page.locator('.spinner')).toBeHidden();`,
      },
    ],
  },

  element_not_found: {
    category: 'Selector / DOM',
    priority: 'high',
    getRootCause: (failure) =>
      `Playwright could not locate the target element during "${failure.testName}". The selector may be broken due to a UI change, dynamic content, or the element being inside an iframe/shadow DOM.`,
    getSolutionSteps: (failure) => [
      {
        step: 1,
        title: 'Use resilient locators',
        description: 'Prefer role-based or data-testid selectors over CSS/XPath.',
        code: `// ❌ Brittle CSS selector\nawait page.click('.btn-primary > span:nth-child(2)');\n\n// ✅ Role-based\nawait page.getByRole('button', { name: 'Submit' }).click();\n\n// ✅ Test ID\nawait page.getByTestId('submit-button').click();`,
      },
      {
        step: 2,
        title: 'Check iframe/shadow DOM context',
        description: 'Elements inside iframes or shadow roots require different access patterns.',
        code: `// Iframe\nconst frame = page.frameLocator('#my-iframe');\nawait frame.getByRole('button', { name: 'Submit' }).click();\n\n// Shadow DOM\nawait page.locator('my-component >> css=button').click();`,
      },
      {
        step: 3,
        title: 'Add visibility assertion before interaction',
        description: 'Verify element state before acting on it.',
        code: `const el = page.getByTestId('target-element');\nawait expect(el).toBeVisible();\nawait el.click();`,
      },
    ],
  },

  assertion: {
    category: 'Test Logic',
    priority: 'medium',
    getRootCause: (failure) =>
      `An assertion failed in "${failure.testName}". The actual value returned by the application did not match the expected value, suggesting either a bug in the application or an outdated test expectation.`,
    getSolutionSteps: (failure) => [
      {
        step: 1,
        title: 'Use web-first assertions',
        description: 'Playwright\'s expect() with locators auto-retries until the condition is met.',
        code: `// ❌ Node assertion (no retry)\nassert.equal(await page.textContent('.price'), '$10.00');\n\n// ✅ Web-first assertion (auto-retries)\nawait expect(page.locator('.price')).toHaveText('$10.00');`,
      },
      {
        step: 2,
        title: 'Verify expected test data',
        description: 'Ensure test fixtures and seed data match what the assertion expects.',
        code: `// Use fixtures for predictable state\ntest.beforeEach(async ({ page }) => {\n  await page.goto('/reset-test-state');\n  // or seed DB via API\n  await request.post('/api/seed', { data: testFixture });\n});`,
      },
      {
        step: 3,
        title: 'Soft assertions for non-blocking checks',
        description: 'Use soft assertions to collect all failures in one run.',
        code: `await expect.soft(page.locator('.title')).toHaveText('Dashboard');\nawait expect.soft(page.locator('.count')).toHaveText('5');\n// Test continues even if soft assertions fail`,
      },
    ],
  },

  network: {
    category: 'Network / API',
    priority: 'high',
    getRootCause: (failure) =>
      `A network request failed during "${failure.testName}". This may be a flaky external dependency, CORS issue, or missing mock/stub for an API call.`,
    getSolutionSteps: (failure) => [
      {
        step: 1,
        title: 'Mock external API calls',
        description: 'Intercept and mock network requests to isolate tests from external services.',
        code: `await page.route('**/api/users', async route => {\n  await route.fulfill({\n    status: 200,\n    contentType: 'application/json',\n    body: JSON.stringify({ users: mockUsers }),\n  });\n});`,
      },
      {
        step: 2,
        title: 'Wait for network requests to complete',
        description: 'Ensure API calls have resolved before asserting on their results.',
        code: `// Wait for a specific request\nconst responsePromise = page.waitForResponse('**/api/data');\nawait page.click('#load-btn');\nconst response = await responsePromise;\nexpect(response.status()).toBe(200);`,
      },
      {
        step: 3,
        title: 'Handle network errors gracefully',
        description: 'Add retry logic for known flaky endpoints.',
        code: `// In playwright.config.ts\nexport default defineConfig({\n  retries: process.env.CI ? 2 : 0,\n  use: {\n    actionTimeout: 15000,\n  },\n});`,
      },
    ],
  },

  navigation: {
    category: 'Navigation',
    priority: 'medium',
    getRootCause: (failure) =>
      `Navigation failed during "${failure.testName}". The page may not have loaded correctly, a redirect occurred unexpectedly, or the URL changed.`,
    getSolutionSteps: () => [
      {
        step: 1,
        title: 'Wait for navigation to complete',
        description: 'Always await navigation actions fully.',
        code: `// Wait until page is fully loaded\nawait Promise.all([\n  page.waitForNavigation({ waitUntil: 'networkidle' }),\n  page.click('a.nav-link'),\n]);\n\n// Or use goto with waitUntil\nawait page.goto('/dashboard', { waitUntil: 'domcontentloaded' });`,
      },
      {
        step: 2,
        title: 'Assert final URL',
        description: 'Verify the page reached the expected destination.',
        code: `await expect(page).toHaveURL('/dashboard');\nawait expect(page).toHaveURL(/.*dashboard.*/);`,
      },
    ],
  },

  selector: {
    category: 'Selector',
    priority: 'high',
    getRootCause: (failure) =>
      `The selector used in "${failure.testName}" could not find a matching element. The selector may be too specific, outdated, or the element has not rendered yet.`,
    getSolutionSteps: () => [
      {
        step: 1,
        title: 'Migrate to Playwright locators',
        description: 'Use the modern Locator API instead of legacy selectors.',
        code: `// ❌ Legacy\nawait page.$('.submit-btn');\n\n// ✅ Modern Locator API\npage.locator('.submit-btn');\npage.getByRole('button', { name: 'Submit' });\npage.getByLabel('Email address');`,
      },
      {
        step: 2,
        title: 'Add data-testid attributes',
        description: 'Work with your dev team to add stable test identifiers.',
        code: `// In your component (React example)\n<button data-testid="submit-form-btn" onClick={handleSubmit}>\n  Submit\n</button>\n\n// In your test\nawait page.getByTestId('submit-form-btn').click();`,
      },
    ],
  },

  authentication: {
    category: 'Authentication',
    priority: 'critical',
    getRootCause: (failure) =>
      `Authentication failed during "${failure.testName}". The test may be missing valid credentials, the session expired, or login state was not properly set up.`,
    getSolutionSteps: () => [
      {
        step: 1,
        title: 'Use storageState for session reuse',
        description: 'Log in once and reuse the session across tests to avoid repeated logins.',
        code: `// global-setup.ts - run once\nasync function globalSetup() {\n  const browser = await chromium.launch();\n  const page = await browser.newPage();\n  await page.goto('/login');\n  await page.fill('[name=email]', process.env.TEST_USER!);\n  await page.fill('[name=password]', process.env.TEST_PASS!);\n  await page.click('[type=submit]');\n  await page.context().storageState({ path: 'auth.json' });\n  await browser.close();\n}\n\n// playwright.config.ts\nuse: { storageState: 'auth.json' }`,
      },
      {
        step: 2,
        title: 'Use API for authentication',
        description: 'Authenticate via API request rather than UI for faster, more reliable setup.',
        code: `test.beforeEach(async ({ request, page }) => {\n  const loginRes = await request.post('/api/auth/login', {\n    data: { email: process.env.TEST_EMAIL, password: process.env.TEST_PASS },\n  });\n  const { token } = await loginRes.json();\n  await page.context().addCookies([{ name: 'auth_token', value: token, domain: 'localhost', path: '/' }]);\n});`,
      },
    ],
  },

  runtime: {
    category: 'Runtime Error',
    priority: 'medium',
    getRootCause: (failure) =>
      `An unexpected runtime error occurred in "${failure.testName}". This may be a JavaScript exception in the application, an unhandled promise rejection, or a test setup issue.`,
    getSolutionSteps: (failure) => [
      {
        step: 1,
        title: 'Capture console errors',
        description: 'Listen for console errors to diagnose runtime issues.',
        code: `test('my test', async ({ page }) => {\n  const errors = [];\n  page.on('console', msg => {\n    if (msg.type() === 'error') errors.push(msg.text());\n  });\n  page.on('pageerror', err => errors.push(err.message));\n\n  // ... test steps ...\n\n  expect(errors).toHaveLength(0);\n});`,
      },
      {
        step: 2,
        title: 'Enable full tracing',
        description: 'Use Playwright tracing to get a complete picture of what happened.',
        code: `// playwright.config.ts\nuse: {\n  trace: 'on-first-retry',\n  screenshot: 'only-on-failure',\n  video: 'retain-on-failure',\n}\n\n// View trace: npx playwright show-trace trace.zip`,
      },
    ],
  },

  unknown: {
    category: 'Unknown',
    priority: 'low',
    getRootCause: (failure) =>
      `The root cause for "${failure.testName}" could not be automatically determined. Manual investigation of the stack trace and screenshots is recommended.`,
    getSolutionSteps: () => [
      {
        step: 1,
        title: 'Enable full tracing and review',
        description: 'Collect a Playwright trace and inspect it to understand the failure.',
        code: `// playwright.config.ts\nuse: {\n  trace: 'on',\n  screenshot: 'on',\n  video: 'on',\n}`,
      },
      {
        step: 2,
        title: 'Run test in headed mode locally',
        description: 'Reproduce the failure visually to identify the problem.',
        code: `npx playwright test --headed --project=chromium --grep "your test name"\nnpx playwright test --debug  # Step-through debugger`,
      },
    ],
  },
};

const generateSolution = (failure) => {
  const errorType = failure.errorType || 'unknown';
  const template = SOLUTION_MAP[errorType] || SOLUTION_MAP.unknown;

  const confidence = calculateConfidence(failure);

  return {
    rootCause: template.getRootCause(failure),
    solutionSteps: template.getSolutionSteps(failure),
    codeFix: template.getSolutionSteps(failure)[0]?.code || null,
    confidenceScore: confidence,
    category: template.category,
    priority: template.priority,
  };
};

const calculateConfidence = (failure) => {
  let score = 0.5;
  if (failure.errorMessage) score += 0.15;
  if (failure.stackTrace) score += 0.15;
  if (failure.errorType && failure.errorType !== 'unknown') score += 0.15;
  if (failure.screenshotUrl) score += 0.05;
  return Math.min(parseFloat(score.toFixed(2)), 1.0);
};

const generateSolutions = (failures) => {
  return failures.map((failure) => ({
    failureId: failure.id,
    ...generateSolution(failure),
  }));
};

module.exports = { generateSolution, generateSolutions };
