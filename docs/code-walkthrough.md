# Complete Code Walkthrough - Self-Healing Playwright Framework

The goal of this framework is:

1. Run website test flows automatically.
2. If a button/input selector breaks, try to fix it automatically.
3. Follow safety rules before applying any AI suggestion.
4. Save what worked, so next run is faster and smarter.
5. Create reports with clear evidence of what happened.

---

## 1) What This Project Is Doing (Big Picture)

Think of this project as a smart QA assistant for website testing.

Normal test frameworks fail as soon as UI changes.  
This framework does something extra:

- It first tries normal Playwright actions.
- If action fails, it tries safe retries.
- If still failing, it asks AI to suggest a better selector.
- It checks confidence and policy rules.
- If safe, it applies the fix and continues test.
- It stores successful fixes in memory for future runs.

So this is not just "run tests", it is "run tests + recover from common UI breakages".

---

## 2) Folder Structure You Should Know

You do not need every file. These are the most important ones:

- `tests/e2e/retail-role-flows.spec.js`  
  Main test runner for role-based retail flows (customer/admin/testing mode).
  To run this test file: `npx playwright test tests/e2e/retail-role-flows.spec.js --headed`

- `tests/test-data/retail-role-flows.json`  
  Step-by-step scenarios used by the spec file.

- `src/core/test-orchestrator.js`  
  The central engine. Every action goes through this.

- `src/core/policy-engine.js`  
  Safety decision-maker. Decides apply/retry/fail for healing suggestions.

- `src/agents/selector-recovery-agent.js`  
  Finds alternate selectors when click/fill/assert target is broken.

- `src/agents/flow-recovery-agent.js`  
  Handles "page state drift" (wrong page/modal/unexpected route).

- `src/memory/selector-memory-store.js`  
  Stores previously successful selector fixes.

- `src/memory/flow-memory-store.js`  
  Stores previously successful flow-recovery plans.

- `src/telemetry/healing-report-writer.js`  
  Writes JSON/Markdown/HTML healing reports.

- `config/framework.config.js` and `config/policy.config.js`  
  Runtime mode, thresholds, retry limits, safety action allowlist.

---

## 3) How a Test Actually Runs (Simple Lifecycle)

A single step (like click button) follows this sequence:

1. Test calls orchestrator (`orchestrator.click(...)`, `orchestrator.fill(...)`).
2. Orchestrator tries normal Playwright action first.
3. If it fails, orchestrator does deterministic retries (fixed retry attempts).
4. If still fails, it captures context:
   - DOM excerpt
   - Accessibility tree
   - Screenshot before healing
5. Selector agent is called.
6. Policy engine checks confidence + mode rules.
7. If allowed, healed selector is applied.
8. If successful, memory store records the fix.
9. Report events are logged and written at the end (`finalize()`).

This same pattern makes the framework resilient and auditable.

---

## 4) Example Walkthrough from `retail-role-flows.spec.js`

This file loops through scenarios and executes each step one by one.

### Main structure

```js
const { test, expect } = require('@playwright/test');
const TestOrchestrator = require('../../src/core/test-orchestrator');
const scenarios = require('../test-data/retail-role-flows.json');

test.describe('Retail website role flows', () => {
  for (const scenario of scenarios) {
    test(scenario.name, async ({ page }) => {
      const orchestrator = new TestOrchestrator(page, scenario.testId || slugify(scenario.name));

      try {
        for (let index = 0; index < scenario.steps.length; index++) {
          const step = scenario.steps[index];
          await runStep(page, orchestrator, step);
        }
      } finally {
        await orchestrator.finalize();
      }
    });
  }
});
```

What this means in plain English:

- All scenarios come from a JSON file.
- For each scenario, the framework creates one orchestrator.
- Every step is executed in order through `runStep(...)`.
- At the end (even if test fails), `finalize()` runs and writes reports.

---

### `runStep` action router

This function maps each `"action"` from JSON to the right method:

```js
switch (step.action) {
  case 'goto':
    await orchestrator.goto(step.target, { timeout: step.timeoutMs || 60000 });
    return;
  case 'fill':
    await orchestrator.fill(step.target, step.value, { description: step.description });
    return;
  case 'click':
    await orchestrator.click(step.target, { description: step.description });
    return;
  case 'assertVisible':
    await orchestrator.assertVisible(step.target, { description: step.description });
    return;
  // ...more cases
}
```

Meaning:

- The JSON is like a script.
- `runStep` is the interpreter.
- Orchestrator handles all core actions that need self-healing behavior.

---

### Safe locator evaluation in spec

`resolveLocator(...)` in this file allows expressions like:

- `getByRole('button', { name: /^Sign in$/i })`
- `page.locator('button:enabled').filter({ hasText: /^Add to cart$/ }).first()`

But it blocks unsafe patterns before evaluation:

```js
const forbidden = /;|require\s*\(|import\s|eval\s*\(|process\.|__proto__|prototype\[/i;
if (forbidden.test(normalized)) {
  throw new Error(`Unsafe locator expression: ${expression}`);
}
```

So the test data remains flexible, but still guarded.

---

## 5) Retail Flow Example (Business Story)

From `tests/test-data/retail-role-flows.json`, one scenario is:

- customer logs in
- goes to products
- adds item to cart
- opens cart
- checks out
- returns dashboard

Example step block:

```json
{
  "action": "click",
  "target": "getByRole('button', { name: /^Sign in$/i })",
  "description": "Sign in button on the login form"
}
```

This is easy to explain to manager:

"Each business action is written as clear data in JSON. The test runner reads that data and performs those actions like a user."

---

## 6) Heart of the System: `TestOrchestrator`

This class is the center of everything.

### Main public methods

- `goto(url)`
- `click(selector)`
- `fill(selector, value)`
- `select(selector, value)`
- `assertVisible(selector)`
- `waitForURL(pattern)`
- `assertState(...)`
- `finalize()`

### Why orchestrator exists

Without orchestrator, every test file would need recovery logic duplicated.  
With orchestrator, all tests get consistent healing, safety, memory, and reporting from one place.

### Key internal idea

`_executeWithHealing(...)` does:

1. normal action
2. deterministic retry
3. context capture
4. selector recovery agent call
5. policy decision
6. apply candidate selector if approved

Snippet:

```js
try {
  await this._performAction(action, selector, value, timeout);
  return;
} catch (originalError) {
  // deterministic retries first
  // then selector recovery agent
  // then policy decision apply/retry/fail
}
```

This is the framework's main value.

---

## 7) Policy Engine (Safety Layer)

File: `src/core/policy-engine.js`

The policy engine is like a gatekeeper:

- It does not trust every AI suggestion.
- It checks confidence score and mode.
- It enforces retry limits and allowed actions.

Important thresholds from `config/policy.config.js`:

- `autoHealThreshold: 0.90`
- `mediumThreshold: 0.75`

Mode behavior:

- `strict` mode:
  - rejects medium-confidence heals
  - flow recovery disabled
- `adaptive` mode:
  - allows medium-confidence heals
  - flow recovery enabled

Simple manager explanation:

"AI can suggest, but policy decides. That keeps automation safe and controlled."

---

## 8) Selector Recovery Agent (AI Fix for Broken Locator)

File: `src/agents/selector-recovery-agent.js`

When a step like `click('old-selector')` fails:

1. Agent checks selector memory first.
2. If memory has a good candidate and it still exists, use it.
3. Else gather DOM + accessibility context.
4. Send prompt to AI client.
5. Parse response with candidates and confidence.

Returned shape:

```js
{
  candidates: [...],
  recommendedSelector: "...",
  recommendedConfidence: 0.92,
  shouldRetryWithMoreContext: false,
  source: "openai" // or google/groq/memory
}
```

This keeps cost lower because memory is checked before AI call.

---

## 9) AI Client (Provider Switch)

File: `src/agents/ai-client.js`

One common interface, multiple providers:

- OpenAI
- Google Gemini
- Groq
- Mock provider (for demo/offline behavior)

Config decides provider and model via `.env` and `framework.config.js`.

So your tests do not change when provider changes.

---

## 10) Memory System (Learns Over Time)

### Selector memory

File: `src/memory/selector-memory-store.js`  
Stored in `test-results/selector-memory.json` (by default)

It saves:

- original selector
- healed selector
- confidence
- usage count
- score (with decay over time)

Why decay exists:

- old fixes become less trusted over many runs
- fresh successful fixes stay on top

### Flow memory

File: `src/memory/flow-memory-store.js`

If a flow recovery plan works once, similar future drift can reuse it faster.

---

## 11) Tooling Used During Healing

### DOM Snapshot Tool

File: `src/tools/dom-snapshot-tool.js`

- captures compact DOM excerpt
- strips scripts/styles/noise
- redacts sensitive fields
- truncates long content for token control

### Accessibility Tree Tool

File: `src/tools/accessibility-tree-tool.js`

- extracts interactive elements and labels
- provides high-signal context for AI

### Screenshot Tool

File: `src/tools/screenshot-tool.js`

- takes before/after heal screenshots

### Network Log Tool

File: `src/tools/network-log-tool.js`

- tracks requests/responses
- useful in debugging unexpected navigation issues

---

## 12) Event and Reporting Flow

### Event bus

File: `src/telemetry/event-bus.js`

Everything publishes structured events:

- step failed
- selector recovery invoked
- selector recovery applied
- flow recovery applied
- rejected by policy
- test completed

### Report writer

File: `src/telemetry/healing-report-writer.js`

At `finalize()`, it writes:

- `healing-report.json`
- `healing-report.md`
- `healing-dashboard.html`

Location pattern:

`test-results/healing-artifacts/<testId>_<timestamp>/...`

So each run has a full trace and evidence.

---

## 13) Playwright Configuration Choices

File: `playwright.config.js`

Important choices:

- `workers: 1` (single worker)
- `fullyParallel: false`
- `retries: 0` (framework has its own recovery loop)
- `screenshot: 'only-on-failure'`

This is intentional. Healing logic is order-sensitive, so predictable execution is preferred.

---

## 14) End-to-End Sequence (Explain in Meeting)

Use this script when explaining:

1. "Scenarios are written in JSON business steps."
2. "Spec file reads each scenario and sends actions to orchestrator."
3. "Orchestrator tries normal action first."
4. "If failed, it retries quickly and then gathers page context."
5. "Selector agent proposes alternatives."
6. "Policy engine checks confidence and safety rules."
7. "If approved, healed selector is applied."
8. "Successful heal is saved into memory."
9. "Events are captured and reports are generated."
10. "Next run is faster because memory is reused."

This gives a strong manager-level narrative: reliable automation with controlled AI fallback.

---

## 15) Real Command Examples

From `package.json`:

```bash
npm run test:retail
```

Run retail flow in headed record mode:

```bash
npm run test:retail:record
```

Run strict policy mode:

```bash
npm run test:strict
```

Sync accepted healed selectors back into test source:

```bash
npm run sync-heals
```

---

## 16) What Makes This Framework Strong

- Centralized orchestration (same behavior across all tests)
- Safety-first decisions (policy before apply)
- Memory-based learning (less repeated AI work)
- Clear artifacts (auditable, shareable with stakeholders)
- Data-driven scenarios (easy to scale business flows)

---

## 17) One-Line Summary for Manager

"This framework runs business test flows like a real user, auto-recovers from common UI locator breakages using AI under strict safety rules, learns successful fixes for future runs, and generates detailed proof reports."

