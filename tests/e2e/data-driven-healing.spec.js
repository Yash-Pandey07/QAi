const { test, expect } = require('@playwright/test');
const TestOrchestrator = require('../../src/core/test-orchestrator');
const scenarios = require('../test-data/healing-scenarios.json');

test.describe('Data-driven self-healing scenarios', () => {
  for (const scenario of scenarios) {
    test(`heals scenario: ${scenario.name}`, async ({ page }) => {
      test.setTimeout(scenario.timeoutMs || 120000);

      const orchestrator = new TestOrchestrator(page, scenario.testId);

      try {
        for (const step of scenario.steps) {
          await runStep(orchestrator, step);
        }

        await verifyExpectations(page, scenario.expectations || {});
      } finally {
        await orchestrator.finalize();
      }
    });
  }
});

async function runStep(orchestrator, step) {
  switch (step.action) {
    case 'goto':
      await orchestrator.goto(step.target, { timeout: step.timeoutMs });
      return;
    case 'fill':
      await orchestrator.fill(step.target, step.value, {
        description: step.description,
        timeout: step.timeoutMs,
      });
      return;
    case 'click':
      await orchestrator.click(step.target, {
        description: step.description,
        timeout: step.timeoutMs,
      });
      return;
    case 'select':
      await orchestrator.select(step.target, step.value, {
        description: step.description,
        timeout: step.timeoutMs,
      });
      return;
    case 'assertVisible':
      await orchestrator.assertVisible(step.target, {
        description: step.description,
        timeout: step.timeoutMs,
      });
      return;
    case 'waitForURL':
      await orchestrator.waitForURL(toUrlPattern(step.target), {
        timeout: step.timeoutMs,
      });
      return;
    default:
      throw new Error(`Unsupported scenario action: ${step.action}`);
  }
}

async function verifyExpectations(page, expectations) {
  if (expectations.urlPattern) {
    await page.waitForURL(toUrlPattern(expectations.urlPattern), { timeout: 15000 });
    expect(page.url()).toMatch(toUrlPattern(expectations.urlPattern));
  }

  if (expectations.selectorVisible) {
    await expect(page.locator(expectations.selectorVisible).first()).toBeVisible({
      timeout: 10000,
    });
  }

  if (expectations.bodyContains) {
    await expect(page.locator('body')).toContainText(expectations.bodyContains, {
      timeout: 10000,
    });
  }
}

function toUrlPattern(value) {
  if (value instanceof RegExp) {
    return value;
  }

  if (typeof value === 'string' && value.startsWith('/') && value.endsWith('/')) {
    return new RegExp(value.slice(1, -1));
  }

  return value;
}
