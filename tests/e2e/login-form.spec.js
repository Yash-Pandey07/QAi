/**
 * @fileoverview Login Form E2E Tests with Agentic Self-Healing.
 *
 * Tests a locally-served login page (Nexus) to validate:
 *   1. Successful login with valid credentials
 *   2. Error handling for invalid credentials
 *   3. Self-healing when selectors are intentionally wrong
 *   4. Form validation (empty fields, bad email, short password)
 *   5. Password visibility toggle
 *   6. Logout flow
 *
 * The fixture page is served via a local file URL so no external
 * network is required – ideal for CI.
 *
 * Run:  npm run test:login-form
 */

const path = require('path');
const { test, expect } = require('@playwright/test');
const TestOrchestrator = require('../../src/core/test-orchestrator');

// Resolve the local fixture path once
const LOGIN_PAGE = `file://${path.resolve(__dirname, 'fixtures/login-page.html').replace(/\\/g, '/')}`;

// Valid demo credentials baked into the fixture
const VALID_USER = { email: 'admin@nexus.io', password: 'Admin123!' };
const INVALID_USER = { email: 'nobody@fake.com', password: 'wrong' };

test.describe('Nexus Login Form – Self-Healing Tests', () => {

  // ─────────────────────────────────────────────────────────────────
  //  1. Successful login with correct selectors
  // ─────────────────────────────────────────────────────────────────
  test('should log in successfully with valid credentials', async ({ page }) => {
    const orchestrator = new TestOrchestrator(page, 'login-form-001');

    try {
      // Navigate to the login page
      await orchestrator.goto(LOGIN_PAGE, {
        description: 'Navigate to Nexus login page',
      });

      // Fill email
      await orchestrator.fill('#email', VALID_USER.email, {
        description: 'Email address input field',
      });

      // Fill password
      await orchestrator.fill('#password', VALID_USER.password, {
        description: 'Password input field',
      });

      // Click Sign In
      await orchestrator.click('#login-button', {
        description: 'Sign In submit button',
      });

      // Wait for the loading animation + redirect
      await page.waitForTimeout(2500);

      // Assert the dashboard is visible
      await orchestrator.assertVisible('#dashboard.show', {
        description: 'Post-login dashboard panel',
      });

      // Verify welcome text
      const heading = await page.textContent('#welcome-heading');
      expect(heading).toContain('Welcome back');

      console.log('✅ Successful login test passed');
    } finally {
      await orchestrator.finalize();
    }
  });

  // ─────────────────────────────────────────────────────────────────
  //  2. Failed login – invalid credentials
  // ─────────────────────────────────────────────────────────────────
  test('should show error banner for invalid credentials', async ({ page }) => {
    const orchestrator = new TestOrchestrator(page, 'login-form-002');

    try {
      await orchestrator.goto(LOGIN_PAGE);

      await orchestrator.fill('#email', INVALID_USER.email, {
        description: 'Email address input field',
      });

      await orchestrator.fill('#password', 'wrongpassword', {
        description: 'Password input field',
      });

      await orchestrator.click('#login-button', {
        description: 'Sign In submit button',
      });

      // Wait for the simulated network delay
      await page.waitForTimeout(1500);

      // Error banner should be visible
      await orchestrator.assertVisible('#error-banner.show', {
        description: 'Error banner after failed login',
      });

      const errorMsg = await page.textContent('#error-text');
      expect(errorMsg).toContain('Invalid email or password');

      console.log('✅ Invalid credentials error test passed');
    } finally {
      await orchestrator.finalize();
    }
  });

  // ─────────────────────────────────────────────────────────────────
  //  3. Form validation – empty fields
  // ─────────────────────────────────────────────────────────────────
  test('should validate empty fields', async ({ page }) => {
    const orchestrator = new TestOrchestrator(page, 'login-form-003');

    try {
      await orchestrator.goto(LOGIN_PAGE);

      // Click Sign In without filling anything
      await orchestrator.click('#login-button', {
        description: 'Sign In submit button',
      });

      await page.waitForTimeout(300);

      // Should show validation error
      await orchestrator.assertVisible('#error-banner.show', {
        description: 'Validation error banner',
      });

      const errorMsg = await page.textContent('#error-text');
      expect(errorMsg).toContain('Please enter both email and password');

      console.log('✅ Empty field validation test passed');
    } finally {
      await orchestrator.finalize();
    }
  });

  // ─────────────────────────────────────────────────────────────────
  //  4. Password visibility toggle
  // ─────────────────────────────────────────────────────────────────
  test('should toggle password visibility', async ({ page }) => {
    const orchestrator = new TestOrchestrator(page, 'login-form-004');

    try {
      await orchestrator.goto(LOGIN_PAGE);

      // Fill password
      await orchestrator.fill('#password', 'Secret123', {
        description: 'Password input field',
      });

      // Verify it's a password field
      const typeBefore = await page.getAttribute('#password', 'type');
      expect(typeBefore).toBe('password');

      // Click toggle
      await orchestrator.click('#toggle-password', {
        description: 'Toggle password visibility button',
      });

      // Verify it's now a text field
      const typeAfter = await page.getAttribute('#password', 'type');
      expect(typeAfter).toBe('text');

      console.log('✅ Password toggle test passed');
    } finally {
      await orchestrator.finalize();
    }
  });

  // ─────────────────────────────────────────────────────────────────
  //  5. Full login → logout flow
  // ─────────────────────────────────────────────────────────────────
  test('should complete login then logout', async ({ page }) => {
    const orchestrator = new TestOrchestrator(page, 'login-form-005');

    try {
      await orchestrator.goto(LOGIN_PAGE);

      // Login
      await orchestrator.fill('#email', VALID_USER.email, {
        description: 'Email input',
      });
      await orchestrator.fill('#password', VALID_USER.password, {
        description: 'Password input',
      });
      await orchestrator.click('#login-button', {
        description: 'Sign In button',
      });
      await page.waitForTimeout(2500);

      // Confirm dashboard
      await orchestrator.assertVisible('#dashboard.show', {
        description: 'Dashboard visible after login',
      });

      // Logout
      await orchestrator.click('#logout-button', {
        description: 'Sign Out button on dashboard',
      });

      // Login card should be back
      await orchestrator.assertVisible('#login-card', {
        description: 'Login card visible after logout',
      });

      // Email should be cleared
      const emailVal = await page.inputValue('#email');
      expect(emailVal).toBe('');

      console.log('✅ Login → Logout flow test passed');
    } finally {
      await orchestrator.finalize();
    }
  });

  // ─────────────────────────────────────────────────────────────────
  //  6. SELF-HEALING: wrong email selector
  // ─────────────────────────────────────────────────────────────────
  test('should heal when email input selector is wrong', async ({ page }) => {
    const orchestrator = new TestOrchestrator(page, 'login-form-006-heal');

    try {
      await orchestrator.goto(LOGIN_PAGE);

      // Use an INTENTIONALLY WRONG selector to trigger healing
      // The real selector is "#email" but we use a fake data-testid
      await orchestrator.fill('[data-testid="email-input-v3"]', VALID_USER.email, {
        description: 'Email address input field on login form',
      });

      // If healing worked, fill password with correct selector
      await orchestrator.fill('#password', VALID_USER.password, {
        description: 'Password input field',
      });

      await orchestrator.click('#login-button', {
        description: 'Sign In button',
      });

      await page.waitForTimeout(2500);

      // If the email was correctly healed, login should succeed
      await orchestrator.assertVisible('#dashboard.show', {
        description: 'Dashboard visible — proves email field was healed',
      });

      console.log('✅ Self-healing email selector test passed!');
    } finally {
      await orchestrator.finalize();
    }
  });

  // ─────────────────────────────────────────────────────────────────
  //  7. SELF-HEALING: wrong Sign In button selector
  // ─────────────────────────────────────────────────────────────────
  test('should heal when login button selector is wrong', async ({ page }) => {
    const orchestrator = new TestOrchestrator(page, 'login-form-007-heal');

    try {
      await orchestrator.goto(LOGIN_PAGE);

      await orchestrator.fill('#email', VALID_USER.email, {
        description: 'Email address input field',
      });

      await orchestrator.fill('#password', VALID_USER.password, {
        description: 'Password input field',
      });

      // Use WRONG selector for the login button
      // Real selector is "#login-button"
      await orchestrator.click('[data-testid="submit-login-btn"]', {
        description: 'Sign In submit button on login form',
      });

      await page.waitForTimeout(2500);

      await orchestrator.assertVisible('#dashboard.show', {
        description: 'Dashboard visible — proves login button was healed',
      });

      console.log('✅ Self-healing login button test passed!');
    } finally {
      await orchestrator.finalize();
    }
  });

  // ─────────────────────────────────────────────────────────────────
  //  8. SELF-HEALING: wrong password & button selectors (double heal)
  // ─────────────────────────────────────────────────────────────────
  test('should heal multiple wrong selectors in sequence', async ({ page }) => {
    const orchestrator = new TestOrchestrator(page, 'login-form-008-heal');

    try {
      await orchestrator.goto(LOGIN_PAGE);

      // Correct email
      await orchestrator.fill('#email', 'test@example.com', {
        description: 'Email address input field',
      });

      // WRONG password selector
      await orchestrator.fill('[name="user-password-field"]', 'Test1234', {
        description: 'Password input field on login form',
      });

      // WRONG button selector
      await orchestrator.click('button.submit-login', {
        description: 'Sign In submit button on login form',
      });

      await page.waitForTimeout(2500);

      await orchestrator.assertVisible('#dashboard.show', {
        description: 'Dashboard visible — proves both selectors were healed',
      });

      console.log('✅ Multi-selector healing test passed!');
    } finally {
      await orchestrator.finalize();
    }
  });
});
