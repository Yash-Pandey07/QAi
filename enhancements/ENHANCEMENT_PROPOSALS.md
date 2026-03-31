# 🚀 Agentic Playwright Framework — Enhancement Proposals

> **Purpose:** Comprehensive catalog of capabilities to make the self-healing framework more powerful and production-grade.
> **How to use:** Review each proposal, mark the ones you want built, and we'll prioritize and implement together.

---

## Summary Table

| # | Category | Enhancement | Impact | Effort |
|---|----------|-------------|--------|--------|
| 1 | 🧠 Intelligence | [Visual (Screenshot) Healing via Vision AI](#1-visual-screenshot-healing-via-vision-ai) | 🔴 High | 🟡 Medium |
| 2 | 🧠 Intelligence | [Multi-Candidate Cascade Healing](#2-multi-candidate-cascade-healing) | 🔴 High | 🟢 Low |
| 3 | 🧠 Intelligence | [Smart Retry with Exponential Backoff](#3-smart-retry-with-exponential-backoff) | 🟡 Medium | 🟢 Low |
| 4 | 🧪 Testing | [Data-Driven Self-Healing Scenarios](#4-data-driven-self-healing-scenarios) | 🟡 Medium | 🟢 Low |
| 5 | 🧪 Testing | [Unit & Integration Test Suite](#5-unit--integration-test-suite) | 🔴 High | 🟡 Medium |
| 6 | 🛡️ Safety | [Human-in-the-Loop Approval Mode](#6-human-in-the-loop-approval-mode) | 🟡 Medium | 🟡 Medium |
| 7 | 🛡️ Safety | [Healing Sandbox (Dry-Run Mode)](#7-healing-sandbox-dry-run-mode) | 🟡 Medium | 🟢 Low |
| 8 | 📊 Observability | [Real-Time Healing Dashboard (WebSocket)](#8-real-time-healing-dashboard-websocket) | 🔴 High | 🟡 Medium |
| 9 | 📊 Observability | [Trend Analytics & Flakiness Heatmap](#9-trend-analytics--flakiness-heatmap) | 🔴 High | 🟡 Medium |
| 10 | 📊 Observability | [Slack/Teams Alert Integration](#10-slackteams-alert-integration) | 🟡 Medium | 🟢 Low |
| 11 | 🔌 Extensibility | [Plugin Architecture for Custom Agents](#11-plugin-architecture-for-custom-agents) | 🔴 High | 🔴 High |
| 12 | 🔌 Extensibility | [Page Object Model (POM) Integration](#12-page-object-model-pom-integration) | 🔴 High | 🟡 Medium |
| 13 | 🧠 Memory | [Cross-Run Learning with Vector Embeddings](#13-cross-run-learning-with-vector-embeddings) | 🔴 High | 🔴 High |
| 14 | 🧠 Memory | [Selector Versioning & Changelog](#14-selector-versioning--changelog) | 🟡 Medium | 🟢 Low |
| 15 | ⚡ Performance | [Parallel Healing Candidates Validation](#15-parallel-healing-candidates-validation) | 🟡 Medium | 🟢 Low |
| 16 | ⚡ Performance | [Cost Optimization — Heuristics + Local Model Fallback](#16-cost-optimization--heuristics--local-model-fallback) | 🔴 High | 🟡 Medium |
| 17 | 🏗️ Architecture | [TypeScript Migration](#17-typescript-migration) | 🔴 High | 🔴 High |
| 18 | 🏗️ Architecture | [Playwright Fixture-Based Integration](#18-playwright-fixture-based-integration) | 🔴 High | 🟡 Medium |
| 19 | 🧪 Testing | [A/B Testing for AI Models](#19-ab-testing-for-ai-models) | 🟡 Medium | 🟡 Medium |
| 20 | 🛡️ Safety | [Rollback on Cascading Failures](#20-rollback-on-cascading-failures) | 🔴 High | 🟡 Medium |

---

## Detailed Proposals

---

### 1. Visual (Screenshot) Healing via Vision AI

**Category:** 🧠 Intelligence | **Impact:** 🔴 High | **Effort:** 🟡 Medium

#### The Gap
The `ScreenshotTool` captures `before_heal` screenshots but they're only saved to disk for human review — the AI **never sees them**. Both GPT-4o and Gemini support image inputs. This means the AI is blind to CSS-rendered text, icon-only buttons, canvas elements, and visual layout context.

#### What To Build
Upgrade `SelectorRecoveryAgent` to attach the screenshot to the AI vision request:

```javascript
// src/agents/selector-recovery-agent.js
if (frameworkConfig.ai.enableVision && failedCtx.screenshotPath) {
  const base64Image = fs.readFileSync(failedCtx.screenshotPath).toString('base64');
  response = await this.aiClient.chatWithVision(SYSTEM_PROMPT, userPrompt, base64Image);
}
```

Add `chatWithVision()` to `OpenAIProvider` and `GoogleProvider` in `ai-client.js`.

#### Why It Matters
- Catches cases DOM analysis misses (icon buttons, dynamic content)
- Dramatically improves confidence — AI visually verifies its suggestion
- GPT-4o and Gemini already support this natively

---

### 2. Multi-Candidate Cascade Healing

**Category:** 🧠 Intelligence | **Impact:** 🔴 High | **Effort:** 🟢 Low

#### The Gap
`_applyHealedSelector` in `test-orchestrator.js` only tries `recoveryResult.recommendedSelector`. The AI often returns 2–5 ranked candidates — and we throw away 80% of them after the first failure.

#### What To Build
Iterate through all candidates in `_executeWithHealing` after policy approval:

```javascript
for (const candidate of recoveryResult.candidates) {
  if (candidate.confidence < policyConfig.confidence.mediumThreshold) break;
  try {
    await this._performAction(action, candidate.selector, value, timeout);
    this.selectorMemory.record(failedCtx, candidate); // save the winner
    return; // healed!
  } catch { continue; } // try next
}
throw originalError; // all candidates exhausted
```

#### Why It Matters
- Increases heal success rate with **zero additional AI cost**
- We already have the data — we're just not using it
- Highest leverage, lowest effort enhancement in this list

---

### 3. Smart Retry with Exponential Backoff

**Category:** 🧠 Intelligence | **Impact:** 🟡 Medium | **Effort:** 🟢 Low

#### The Gap
The `framework.config.js` already defines `maxDeterministicRetries: 2` but this config field is **never actually wired up** in the orchestrator. All failures go directly to AI without any deterministic wait-and-retry. Many failures are transient (animation in progress, lazy-loaded element).

#### What To Build
Add a retry loop before the AI agent call in `_executeWithHealing`:

```javascript
// Before calling selectorAgent.recover():
for (let i = 0; i < frameworkConfig.execution.maxDeterministicRetries; i++) {
  await this.page.waitForTimeout(500 * Math.pow(2, i)); // 500ms, 1000ms
  try {
    await this._performAction(action, selector, value, timeout);
    return; // transient failure — recovered without AI!
  } catch { continue; }
}
// Now call AI
```

#### Why It Matters
- Eliminates unnecessary AI calls for transient failures
- The config is already there — this is finishing an incomplete feature
- Saves cost and reduces latency in test runs

---

### 4. Data-Driven Self-Healing Scenarios

**Category:** 🧪 Testing | **Impact:** 🟡 Medium | **Effort:** 🟢 Low

#### The Gap
Broken selectors are hardcoded in every spec file. Adding a new test scenario requires writing a new test block. There is no systematic registry of failure modes.

#### What To Build
A `test-data/healing-scenarios.json` file and a single parameterized test:

```json
[
  {
    "name": "Broken email input",
    "action": "fill",
    "brokenSelector": "[data-testid='email-input-v3']",
    "value": "john@mail.com",
    "description": "Email address input field",
    "expectedHeal": true
  }
]
```

The test file reads the JSON and loops through all scenarios — adding a new test case is a JSON edit, not a code change.

#### Why It Matters
- Systematic coverage of all failure modes
- Works as a regression corpus when changing AI models
- Makes it easy to add new broken selector tests

---

### 5. Unit & Integration Test Suite

**Category:** 🧪 Testing | **Impact:** 🔴 High | **Effort:** 🟡 Medium

#### The Gap
**There are zero unit tests.** Every test is an E2E test hitting a live website. This means the `PolicyEngine`, `ConfidenceScoring`, `SelectorMemoryStore`, and `EventBus` are untested in isolation.

#### What To Build
Add Vitest (or Jest) unit tests covering:

| Module | Key Tests |
|--------|-----------|
| `PolicyEngine` | apply/retry/fail branches for strict + adaptive |
| `ConfidenceScoring` | strategy boosts, memory boost, single-candidate penalty |
| `SelectorMemoryStore` | record, lookup, decay, pruning |
| `RunContextStore` | step recording, budget enforcement |
| `DomSnapshotTool` | noise stripping, PII redaction, truncation |
| `EventBus` | publish/subscribe, wildcard listeners |
| `contracts.js` | output shapes of all factory functions |

#### Why It Matters
- **Prerequisite for safe refactoring** — without these, any change could silently break the framework
- Unit tests run in seconds vs. minutes for E2E
- Production-credibility for enterprise adoption

---

### 6. Human-in-the-Loop Approval Mode

**Category:** 🛡️ Safety | **Impact:** 🟡 Medium | **Effort:** 🟡 Medium

#### The Gap
Only two modes exist: `strict` (reject uncertain heals) and `adaptive` (auto-apply). There is no mode where a human can review and approve/reject a proposed heal in real-time.

#### What To Build
A new `HEAL_MODE=interactive` that pauses and prompts the developer:

```
┌─────────────────────────────────────────────┐
│ 🩹 Healing Proposal                         │
│                                             │
│ Original:  #user-login-email-field-v2       │
│ Proposed:  input[type="email"]              │
│ Confidence: 0.93 | Strategy: attribute      │
│                                             │
│ Apply? [Y/n/details]                        │
└─────────────────────────────────────────────┘
```

Human decisions are logged as training data for future confidence tuning.

#### Why It Matters
- Safety net for mission-critical test suites
- Human approvals become labelled data to improve the model
- Useful during initial framework onboarding

---

### 7. Healing Sandbox (Dry-Run Mode)

**Category:** 🛡️ Safety | **Impact:** 🟡 Medium | **Effort:** 🟢 Low

#### The Gap
Teams want to evaluate what the AI *would* heal before enabling it in production CI. There is no way to preview healing behavior risk-free.

#### What To Build
A `HEAL_MODE=dry-run` flag:
1. Full healing pipeline runs (DOM capture, AI call, policy check)
2. Proposed heal is **logged but NOT applied**
3. Test fails as normal, but the report includes `would-heal` data with confidence scores

#### Why It Matters
- Zero-risk evaluation of AI quality on a new codebase
- Best way to demo the framework to skeptical stakeholders
- Helps teams tune their confidence thresholds before go-live

---

### 8. Real-Time Healing Dashboard (WebSocket)

**Category:** 📊 Observability | **Impact:** 🔴 High | **Effort:** 🟡 Medium

#### The Gap
The current HTML dashboard (`healing-dashboard.html`) is a **static post-run** artifact. During a long test run, there is no visibility into what is being healed.

#### What To Build
A lightweight Express + WebSocket server alongside the test run:
- `EventBus` broadcasts to connected WebSocket clients
- Live UI shows: test progress, healing events, before/after screenshots, running cost

```
npm run test:dashboard  →  opens http://localhost:4242  →  live healing feed
```

#### Why It Matters
- **Killer demo feature** — stakeholders watch healing happen live
- Operational visibility during long nightly regression suites
- The `EventBus` already captures all events — just needs a broadcast layer

---

### 9. Trend Analytics & Flakiness Heatmap

**Category:** 📊 Observability | **Impact:** 🔴 High | **Effort:** 🟡 Medium

#### The Gap
Each run produces an isolated report. Across runs there is no way to answer:
- *Which selectors break most often?*
- *Is heal success rate improving over time?*
- *Which pages are most fragile?*

#### What To Build
A persistent `analytics/healing-trends.json` file that aggregates across runs, plus a generated heatmap report showing:
- Fragility score per selector (how often it needs healing)
- Confidence trends over time per page
- Cost-per-heal trends to compare AI providers

#### Why It Matters
- **Proactive maintenance** — fix selectors before they become chronic
- Executive-level ROI metrics backed by real data
- Data-driven decisions about which AI model to use

---

### 10. Slack/Teams Alert Integration

**Category:** 📊 Observability | **Impact:** 🟡 Medium | **Effort:** 🟢 Low

#### The Gap
Healing events are only visible in terminal logs and post-run reports. Teams have no notification when a heal is applied or rejected in CI.

#### What To Build
A `NotificationPlugin` that subscribes to `EventBus` and POSTs to a Slack/Teams webhook:

```
🩹 Selector Healed in CI — PR #142
Test: login-flow-001
Original: #submit-btn → Healed: button[type="submit"]
Confidence: 0.93 | Cost: $0.002
```

Configurable: on failures only, on all heals, or on cost threshold exceeded.

#### Why It Matters
- Teams stay informed without checking reports
- Critical for CI/CD pipelines where no one watches the terminal
- Simple HTTP POST — fastest enhancement to ship

---

### 11. Plugin Architecture for Custom Agents

**Category:** 🔌 Extensibility | **Impact:** 🔴 High | **Effort:** 🔴 High

#### The Gap
Adding a new agent type requires modifying the orchestrator core. There's no extension point for domain-specific agents (e.g., a `DatePickerAgent`) or third-party integrations without forking the codebase.

#### What To Build
A plugin system registered in `framework.config.js`:

```javascript
plugins: [
  require('./plugins/date-picker-agent'),
  require('./plugins/custom-memory-backend'),
]
```

Standard plugin interface:
```javascript
class PluginBase {
  name = 'my-plugin';
  onStepFailed(context) {}    // optional: custom healing logic
  onHealApplied(context) {}   // optional: post-heal hook
  onTestCompleted(context) {} // optional: reporting
}
```

#### Why It Matters
- Framework becomes extensible without forking
- Community contribution surface area
- Domain-specific healing (date pickers, file uploads, rich text editors)

---

### 12. Page Object Model (POM) Integration

**Category:** 🔌 Extensibility | **Impact:** 🔴 High | **Effort:** 🟡 Medium

#### The Gap
Tests use raw inline selectors. Most enterprise Playwright codebases use POM. The framework doesn't integrate with POM — `sync-to-source.js` patches spec files rather than the canonical POM definitions.

#### What To Build
A `PageObjectAware` layer where selectors carry metadata:

```javascript
// pages/LoginPage.js
class LoginPage {
  selectors = {
    emailInput: { selector: '#email', description: 'Email input field' },
    loginBtn:   { selector: '#submit', description: 'Login submit button' },
  };
}

// In test:
await orchestrator.fill(loginPage.selectors.emailInput, 'user@example.com');
// → orchestrator uses .selector + .description automatically
```

`sync-to-source.js` updates the POM file, not the spec.

#### Why It Matters
- Aligns with enterprise testing practices
- AI gets richer context (description from POM definition)
- Healed selectors propagate correctly to all tests that share the POM

---

### 13. Cross-Run Learning with Vector Embeddings

**Category:** 🧠 Memory | **Impact:** 🔴 High | **Effort:** 🔴 High

#### The Gap
`SelectorMemoryStore` uses exact-match keys (`url::action::description`). A URL query parameter change or description rewording defeats the cache entirely. `FlowMemoryStore` uses basic fuzzy matching but can't generalize across similar pages.

#### What To Build
Upgrade memory to use **semantic vector embeddings** for lookup:
1. On successful heal, embed the failure context as a vector
2. On new failure, embed context and find nearest neighbors
3. Use similarity threshold instead of exact key match

```
Old: "https://app.com/login::fill::Email input" → exact match
New: embed("login page email field") ≈ embed("sign-in email form") → ✅ match
```

Use the AI provider's embedding API or `transformers.js` for local embeddings.

#### Why It Matters
- Memory generalizes across URL changes, rewordings, A/B tested pages
- Dramatically reduces AI calls for mature test suites
- Foundation for truly intelligent cross-project learning

---

### 14. Selector Versioning & Changelog

**Category:** 🧠 Memory | **Impact:** 🟡 Medium | **Effort:** 🟢 Low

#### The Gap
When `selector-memory.json` is updated there is no history of *when, why, or how* a selector changed. `sync-to-source.js` patches files with no audit trail.

#### What To Build
An append-only `test-results/selector-changelog.json`:

```json
[
  {
    "timestamp": "2026-03-30T10:00:00Z",
    "testId": "login-001",
    "original": "#submit-btn",
    "healed": "button[type='submit']",
    "confidence": 0.93,
    "model": "gpt-4o-mini",
    "url": "https://example.com/login",
    "syncedToSource": true
  }
]
```

#### Why It Matters
- Audit trail for compliance-heavy environments
- Debug regressions: *"When did this selector start breaking?"*
- Labelled data for future model fine-tuning

---

### 15. Parallel Healing Candidates Validation

**Category:** ⚡ Performance | **Impact:** 🟡 Medium | **Effort:** 🟢 Low

#### The Gap
`_selectorExists()` in `SelectorRecoveryAgent` validates candidates **sequentially**. With 4-5 candidates, this is wall-clock time wasted.

#### What To Build
Use `Promise.allSettled` to validate all candidates in parallel:

```javascript
const results = await Promise.allSettled(
  candidates.map(c =>
    this._selectorExists(c.selector).then(exists => ({ ...c, exists }))
  )
);
const validCandidates = results
  .filter(r => r.status === 'fulfilled' && r.value.exists)
  .map(r => r.value);
```

#### Why It Matters
- Reduces candidate validation from O(n) sequential to O(1) wall clock
- More responsive healing with multiple candidates
- Trivial change with measurable latency improvement

---

### 16. Cost Optimization — Heuristics + Local Model Fallback

**Category:** ⚡ Performance | **Impact:** 🔴 High | **Effort:** 🟡 Medium

#### The Gap
Every healing event calls an external API. For simple heals (element renamed but same type/role) this is overkill and costs money + latency.

#### What To Build
**Part A — Heuristic Layer** before AI call:
- Same text content → match by text
- Same `aria-label` → match by label  
- Same `data-testid` → match by testid
- Same `name` attribute on form input → match by name
- If heuristic confidence ≥ 0.90 → skip AI entirely

**Part B — Ollama (local model) fallback:**

```javascript
case 'ollama': {
  return new OpenAIProvider({
    apiKey: 'ollama',
    baseURL: 'http://localhost:11434/v1',
    model: process.env.OLLAMA_MODEL || 'llama3.2',
    maxTokens, timeoutMs,
  });
}
```

#### Why It Matters
- 90% of heals can be resolved by heuristics or cache — near-zero cost
- Ollama makes the framework fully **offline capable**
- Reduces API dependency for teams with rate-limit or cost constraints

---

### 17. TypeScript Migration

**Category:** 🏗️ Architecture | **Impact:** 🔴 High | **Effort:** 🔴 High

#### The Gap
The entire codebase is JavaScript with JSDoc. The `contracts.js` factory functions attempt to enforce shapes, but there are no compile-time type guarantees. Agent interfaces are implicit.

#### What To Build
- Migrate all source files to TypeScript
- Replace `contracts.js` with proper interfaces (`IFailedStepContext`, `ISelectorCandidate`, etc.)
- Add explicit `IRecoveryAgent` interface implemented by `SelectorRecoveryAgent` and `FlowRecoveryAgent`
- Enable strict mode

#### Why It Matters
- Compile-time bug detection
- Better IDE autocomplete and refactoring support
- Enterprise-grade codebase for production adoption
- Required foundation for the plugin architecture (#11)

---

### 18. Playwright Fixture-Based Integration

**Category:** 🏗️ Architecture | **Impact:** 🔴 High | **Effort:** 🟡 Medium

#### The Gap
Every test manually constructs `TestOrchestrator` and calls `finalize()` in a `finally` block. Forgetting `finalize()` silently drops all reports. This is boilerplate and error-prone.

#### What To Build
A custom Playwright fixture:

```javascript
// tests/fixtures.js
const test = base.extend({
  orchestrator: async ({ page }, use, testInfo) => {
    const orch = new TestOrchestrator(page, testInfo.testId);
    await use(orch); // inject into test
    await orch.finalize(); // automatic cleanup — always runs
  }
});

// In tests (clean!):
test('login flow', async ({ orchestrator }) => {
  await orchestrator.goto('https://example.com');
  await orchestrator.fill('#email', 'user@example.com');
  // No finalize() needed
});
```

#### Why It Matters
- Eliminates all boilerplate from test files
- Automatic cleanup — `finalize()` guaranteed to run even on test failure
- Idiomatic Playwright pattern that lowers the adoption barrier
- Shared `SelectorMemoryStore` across tests in same suite via fixtures

---

### 19. A/B Testing for AI Models

**Category:** 🧪 Testing | **Impact:** 🟡 Medium | **Effort:** 🟡 Medium

#### The Gap
The framework defaults to one model per agent type. There is no data-driven way to compare `gpt-4o-mini` vs `gemini-2.0-flash` on real healing tasks.

#### What To Build
An A/B mode that runs two models in parallel on the same failure, logs both results, applies only one, and compares quality/cost/speed over time:

```javascript
ab: {
  enabled: true,
  modelA: 'gpt-4o-mini',
  modelB: 'gemini-2.0-flash',
  applyModel: 'modelA', // which one actually heals
}
```

#### Why It Matters
- Data-driven model selection
- Safe evaluation of new models before switching
- Reveals cost/quality tradeoffs empirically over real test runs

---

### 20. Rollback on Cascading Failures

**Category:** 🛡️ Safety | **Impact:** 🔴 High | **Effort:** 🟡 Medium

#### The Gap
If a healed selector causes the *next step* to fail (cascade effect — e.g., wrong element was clicked, navigating to wrong page), the framework treats the second failure as unrelated. A bad heal can also be persisted to memory, poisoning future runs.

#### What To Build
A **cascade detector** in `_executeWithHealing`:

```javascript
// Detect: did a recent heal precede this new failure?
const recentHeal = this.runContext.stepHistory
  .slice(-3)
  .find(s => s.result === 'healed');

if (recentHeal) {
  // Penalize the healed selector in memory
  this.selectorMemory.penalize(recentHeal.selector);
  // Emit cascade event for visibility
  eventBus.publish(createHealingEvent({ type: 'cascade_failure_detected', ... }));
}
```

Add a `penalize()` method to `SelectorMemoryStore` that reduces score instead of removing (so evidence accumulates).

#### Why It Matters
- Prevents bad heals from poisoning the memory store
- Self-correcting system — detects and unlearns bad patterns
- Critical for production trust where a bad chain heal could corrupt state

---

## 🎯 Recommended Implementation Phases

### Phase 1 — Quick Wins (1–2 days each)
| # | Enhancement | Rationale |
|---|-------------|-----------|
| 2 | Multi-Candidate Cascade | Highest impact, zero AI cost |
| 3 | Smart Retry Backoff | Config already exists — finish it |
| 15 | Parallel Candidate Validation | 5-line change |
| 7 | Dry-Run Mode | Just a flag + log |
| 14 | Selector Versioning | Append-only JSON |

### Phase 2 — Core Upgrades (3–5 days each)
| # | Enhancement | Rationale |
|---|-------------|-----------|
| 18 | Playwright Fixtures | Removes all boilerplate |
| 5 | Unit Test Suite | Foundation for safe changes |
| 1 | Vision AI Healing | Unlock screenshots for AI |
| 20 | Cascade Rollback | Self-correcting memory |
| 16 | Heuristics + Ollama | Eliminate 90% of API calls |

### Phase 3 — Strategic (1–2 weeks each)
| # | Enhancement | Rationale |
|---|-------------|-----------|
| 8 | Real-Time Dashboard | Live demo capability |
| 9 | Trend Analytics | Cross-run intelligence |
| 12 | POM Integration | Enterprise adoption |
| 10 | Slack/Teams Alerts | Team visibility |
| 6 | Human-in-the-Loop | Safety + training data |

### Phase 4 — Ambitious (2+ weeks each)
| # | Enhancement |
|---|-------------|
| 11 | Plugin Architecture |
| 13 | Vector Embeddings Memory |
| 17 | TypeScript Migration |
| 19 | A/B Model Testing |
| 4 | Data-Driven Scenarios |

---

## What To Do Next

Review the proposals and tell us which ones you'd like to implement. You can:
1. **Pick specific numbers** — e.g., *"Let's do #2, #3, and #18"*
2. **Pick a phase** — e.g., *"Let's do all Phase 1 quick wins"*
3. **Modify a proposal** — e.g., *"I like #8 but want it simpler"*
4. **Add your own idea** — we'll scope it and add it to the plan

---

*Generated: 2026-03-30 | Based on analysis of 24 source files across 6 architectural layers*
