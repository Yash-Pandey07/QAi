# 🗺️ Codebase Executive Guide: Self-Healing Automation Framework

This document provides a high-level, business-friendly map of the "Self-Healing" automation project. It explains what each part of the system does, using analogies to make technical concepts easy to understand for managers and business stakeholders.

---

## 🌟 The Big Picture: How it Works
Think of this framework as a **smart test team** rather than just a static script. 
- In standard automation, if a button moves, the test "dies."
- In this framework, the system pauses, analyzes the change, finds the button, fixes itself, and completes the task—all while recording exactly what it did for human review.

---

## 📂 Directory-by-Directory Breakdown

### 1. `src/core` — The "Management Office"
This is the "Brain" of the framework. It doesn't do the heavy lifting itself, but it decides *what* should happen and *when*.
- **Role**: Governance and Coordination.
- **Key File**: `test-orchestrator.js` (The Conductor) — Manages the flow from failure to recovery.
- **Key File**: `policy-engine.js` (The Judge) — Ensures the AI doesn't do anything risky. It checks if the AI's "confidence" is high enough to proceed.

### 2. `src/agents` — The "AI Specialists"
These are specialized AI assistants that "wake up" only when something goes wrong.
- **Role**: Intelligence and Problem-Solving.
- **Key File**: `selector-recovery-agent.js` (The Repair Specialist) — Recovers broken buttons or links.
- **Key File**: `flow-recovery-agent.js` (The Tactical Advisor) — Helps the test get back on track if it gets lost on the wrong page.

### 3. `src/tools` — The "Sensors & Eyes"
These tools gather the raw data the AI needs to make decisions.
- **Role**: Observation and Context Gathering.
- **Key File**: `screenshot-tool.js` — Takes "before and after" pictures so humans can see the fix.
- **Key File**: `dom-snapshot-tool.js` — Reads the "code-level" view of the page to find alternatives.

### 4. `src/memory` — The "Learning Center"
This part of the codebase allows the framework to "remember" its successes.
- **Role**: Efficiency and Continuous Improvement.
- **Concept**: If the AI fixes a button on Monday, it stores that fix in "Memory" so it doesn't have to spend AI "brainpower" (and cost) to fix it again on Tuesday.

### 5. `src/telemetry` — The "Reporting Department"
This ensures every action is logged and visible.
- **Role**: Auditability and Transparency.
- **Key File**: `healing-report.writer.js` — Writes the detailed Markdown and JSON reports you see after a run.

### 6. `tests/e2e` — The "Business Scenarios"
This is where the actual business journeys are defined (e.g., "Customer places an order").
- **Role**: Defining the "Wait, What should we test?" logic.
- **Key Files**: `login.spec.js`, `retail-flow-healing.spec.js` (Tests designed to prove the self-healing capability).

### 7. `dashboard` — The "Command Center"
A web-based interface to see the results of the tests in real-time.
- **Role**: Visualization for Stakeholders.
- **Overview**: Shows how many tests passed, how many were saved by "healing," and which UI parts are the most "fragile."

### 8. `config` — The "Rulebook"
Provides the settings that control the framework's behavior.
- **Role**: Parameter Control.
- **Key File**: `policy.config.js` — Defines the "Safety Limits" (e.g., "Only heal if the AI is 80% sure").

---

## 📄 Key Files Every Manager Should Know

| File Name | Plain English Name | Business Value |
| :--- | :--- | :--- |
| **`test-orchestrator.js`** | The Conductor | The core engine that runs the tests and handles self-healing logic. |
| **`policy-engine.js`** | The Judge | Acts as a safety gate to ensure AI actions are safe and reliable. |
| **`selector-recovery-agent.js`** | The Repair Specialist | The AI that actually identifies "missed" elements on the screen. |
| **`sync-to-source.js`** | The Update Specialist | Automatically updates the permanent test scripts with the "healed" selectors. |
| **`framework.config.js`** | The Settings Console | Where we toggle between "Strict" (conservative) and "Adaptive" (smart) modes. |
| **`.env`** | The Key Vault | Holds sensitive info like API keys to connect to Google or OpenAI. |

---

## 🛠️ Infrastructure Files (The "Housekeeping")
- **`package.json`**: A list of all software "ingredients" needed to run the project.
- **`playwright.config.js`**: Standard configuration for the underlying browser automation tool.
- **`docs/`**: The library of instruction manuals (like this one!).
- **`test-results/`**: The "Evidence Room" where logs, videos, and screenshots are stored after each test.

---

> **Summary for the Business Team**: 
> This project isn't just a set of test scripts; it's a **resilient ecosystem**. By separating the "Doing" (Tests) from the "Thinking" (AI Agents) and the "Judging" (Policy Engine), we ensure that automation stays running even when the product's UI changes, significantly reducing the manual maintenance cost.
