# 🧠 Under the Hood: How the Self-Healing "Brain" Works

This guide explains the most important files in the codebase. We've included small snippets of code and "translated" them into plain English so you can see exactly how the AI thinks and acts.

---

## 1. The Conductor: `test-orchestrator.js`
This is the most important file. It wraps every action (like a "click") in a safety bubble.

### 🔍 How it works in the code:
```javascript
// This is the core logic that handles a failure
try {
  await this._performAction(action, selector, value, timeout);
} catch (originalError) {
  // If the action fails, don't stop yet! 
  // Start the healing process...
  const result = await this.selectorAgent.recover(failedContext);
}
```

### 🗣️ Plain English Translation:
"The Conductor tries to perform an action (like clicking 'Buy Now'). If the button isn't there, instead of crashing the test immediately, it calls for the **Repair Specialist** (the AI Agent) to analyze the screen and find where that button went."

---

## 2. The Judge: `policy-engine.js`
The AI is smart, but sometimes it makes guesses. The **Judge** ensures we only apply a fix if we are very confident.

### 🔍 How it works in the code:
```javascript
if (confidence >= policyConfig.confidence.autoHealThreshold) {
  return {
    decision: 'apply',
    reason: `High confidence (${confidence}) – auto-heal allowed`
  };
}
```

### 🗣️ Plain English Translation:
"The Judge looks at the AI's proposal. If the AI says, 'I'm 95% sure this is the right button,' the Judge allows the test to continue. If the AI is only 50% sure, the Judge stops the test because it's better to fail than to click the wrong thing."

---

## 3. The Repair Specialist: `selector-recovery-agent.js`
This is the AI agent that "looks" at the page to find alternatives for broken links or buttons.

### 🔍 How it "Thinks":
1. **Gathers Data (Live DOM)**: It uses `DomSnapshotTool` to extract the *current, live interactive state* of the page—not just static HTML. This filters out noisy scripts/styles and redacts sensitive data, giving the AI a clean representation of what the user is actually seeing. It also captures the **Accessibility Tree** (how a screen reader sees the page).
2. **Asks the AI**: It sends a message to Google Gemini, OpenAI, or Groq saying: *"I was looking for a 'Submit' button with ID 'btn-123', but it's gone. Here is the current page layout. Can you find something that looks like the new 'Submit' button?"*
3. **Proposes Fixes & Handles Multiple XPaths**: The AI returns a list of ranked "Candidates" (new ways to find the button). If the AI suggests multiple options, or if a proposed selector (like an XPath) matches *multiple elements* on the page, the agent verifies them on the fly. It checks if the selector uniquely identifies the element (`locator.count() > 0`). The system naturally prefers accessible selectors (like "Role" or "TestID") over fragile XPaths by assigning them higher confidence scores, ensuring the most robust and specific option wins out.

### 🗣️ Why this is powerful:
Even if a developer changes a button from **Blue** to **Red** or changes its ID from **'login-btn'** to **'submit-form'**, the AI can recognize the *purpose* of the button and fix the test automatically. Using the Live DOM means the AI can see elements rendered dynamically by JavaScript (like elements that only appear after scrolling or loading).

---

## 4. The Tactical Advisor: `flow-recovery-agent.js`
Sometimes a test doesn't just miss a button; it gets completely lost (e.g., a random pop-up appears, or it's redirected to the wrong page). This is called "State Drift".

### 🔍 How Flow Recovery Works:
1. **Detects the Drift**: The agent compares the `expectedState` (where the test thinks it is) with the `observedState` (where the Live DOM shows it actually is) alongside the `recentSteps` taken.
2. **Consults Memory**: Before spending time and money invoking the AI, it checks `flow-memory-store.js` to see if it has already solved this exact drift scenario (e.g., "I know how to close this specific promo pop-up").
3. **Generates a Recovery Plan**: If it's a new issue, the AI builds a targeted sequence of steps to navigate back to safety.
4. **Validates Actions**: Crucially, the generated plan is checked against a strict **Policy Allowlist**. The agent is only allowed to perform safe actions (like clicking 'close' or navigating back); it cannot format your hard drive or make unauthorized purchases.

### 🗺️ Example AI Recovery Plan: 
  1. "Action: `click`, Target: 'X button to close surprise pop-up'."
  2. "Action: `assert`, State: 'Check if we are back on the Checkout page'."
  3. "Result: Continue the test."

---

## 5. The Scorekeeper: `confidence-scoring.js`
This file calculates exactly how much we trust the AI's suggestion.

### 🔍 How it works in the code:
```javascript
// Give "bonus points" for reliable strategies
const strategyBoosts = {
  role: 0.05,    // High trust (e.g., "The 'Purchase' button")
  testid: 0.04,  // High trust (Specific developer ID)
  xpath: -0.02,  // Penalty (Fragile, old-fashioned way)
};
```

### 🗣️ Plain English Translation:
"Not all fixes are equal. If the AI finds a button using its 'Role' (like identifying it as a 'Main Menu Button'), we trust it more. If it uses a complex mathematical path (XPath), we trust it less because those paths break easily."

---

## 6. The Command Center: `dashboard/server.js`
The Dashboard provides a visual way to see how your tests are performing and how the AI is "healing" them.

### 📊 Where it gets its Data:
The dashboard is like a "window" into your project's history. It combines three types of data:
1. **Healing Reports**: It reads all the JSON files in `test-results/healing-artifacts` to show you exactly which buttons were fixed and what the logic was.
2. **AI Memory**: It reads `selector-memory.json` to show you all the new "learned" patterns the AI has stored.
3. **Internal Logic (Git)**: It even checks your project's version history (Git) to show who change the code recently.

### 🗣️ Plain English Translation:
"The Dashboard doesn't just make up numbers. It scans your folders for 'Evidence' (Reports and Memory files) and turns that raw data into a pretty chart so you can see how much time the AI is saving you."

---

## 7. The Bridge: `src/tools/sync-to-source.js`
This is a very powerful tool that takes the fixes the AI found and **writes them back into your original test files.**

### 🔍 How it Works:
1. **Checks Memory**: It looks at the successful fixes in `selector-memory.json`.
2. **Finds the Code**: It locates the specific `.spec.js` file and the exact line of code that broke.
3. **Updates the File**: It replaces the old, broken selector with the new, high-confidence one from the AI.

### 🗣️ Why this is important:
"Instead of you having to copy-paste the fixes yourself, this file does it for you. It's the final step in the 'self-healing' lifecycle—it ensures your code is permanently fixed so the test doesn't have to 'heal' again next time."

---

## 8. The Telemetry: `src/telemetry/`
Telemetry is a fancy word for "automatic reporting." This folder contains the tools that make sure every event is recorded and turned into the reports you see.

### 📢 The Messenger: `event-bus.js`
In the code, different parts of the system need to talk to each other without being strictly "glued" together.
- **How it works**: When a test fails, the system sends an event to the "Bus." It's like a radio broadcast saying *"Attention: Test login-001 has just failed."*

### 📰 The Newsroom: `healing-report-writer.js`
This file is the "Journalist" of the system.
- **How it works**: It sits on the Event Bus and listens for news. Every time it hears about a failure or a successful fix, it writes it down.
- **What it produces**: At the end of the test, it takes all its notes and builds the **Healing Report** and the **HTML Dashboard**.

### 🗣️ Plain English Translation:
"The Telemetry folder is the system's nervous system. It carries messages from the 'Brain' (Core) to the 'Eyes' (Reports). Without this, the system would still work, but you wouldn't be able to see any of the evidence or reports afterward."

---

## 🧠 Real-Life Insights & Edge Cases

To fully master the self-healing framework, it helps to understand how it handles tricky real-world scenarios:

### Insight 1: How it knows WHICH button to pick out of many
**Scenario:** You are on an E-commerce checkout page. There are 5 different buttons on the page (Cancel, Apply Promo, Back, Submit Order, Contact Us). The developer changed the "Submit Order" button ID from `btn-submit` to `btn-payment`. 

**How it solves this:**
When the test fails, the framework doesn't just give the AI a blank page and say "find a button". It gives the AI the **Context** of what it was trying to do. It tells the AI:
*"I was trying to perform a **click** action on a target described as **'Submit Order'**, and the old ID was **#btn-submit**."*

The AI reads the semantic page data and ignores the "Cancel" and "Apply Promo" buttons. It looks for the one button that functionally matches the description "Submit Order" (e.g., based on its location in the checkout form or its accessible role). Knowing the *past intent* is what allows it to pick the exact right button out of many.

### Insight 2: Isn't capturing the whole DOM a waste of memory and tokens?
**Scenario:** Amazon's homepage has 10,000+ lines of HTML. Sending all of that to an AI would cause a token limit error or cost an excessive amount per test run.

**How it solves this (Token Optimization):**
The framework **does not** send the raw, entire DOM to the AI. It uses a filtering process inside `DomSnapshotTool`:
1. **Scoping:** Instead of capturing the whole `<body>`, tests can tell the tool to only capture a specific interactive area (like `<form id="checkout">`).
2. **Noise Reduction:** The tool automatically strips out all `<script>`, `<style>`, and `<svg>` elements before sending anything to the AI. This typically cuts the size down by 80%.
3. **Semantic Extraction:** Rather than sending every structural `<div>`, the framework extracts an array of "Semantic Nodes" (only interactive elements like links, buttons, inputs).
4. **Hard Limits:** There is a strict character limit enforced by `frameworkConfig.safety.maxDomExcerptLength`. If a page is massive, the system safely truncates it to prevent token blowout and memory crashes.

### Insight 3: Memory Decay (Forgetting Bad Advice)
**Scenario:** The AI finds a successful fix on Monday. By Friday, the developers completely redesign the app, and Monday's fix is now totally wrong.

**How it solves this:**
Inside `selector-memory-store.js`, the memory system uses **Decay Factors**. An old fix doesn't stay trusted forever. If a saved selector is used successfully, its score goes up. But every time the test suite is run, all stored fixes have a decay rate applied (e.g., they lose a percentage of their confidence). If a fix sits around for weeks without being validated, the system automatically "forgets" it, preventing stale, old selectors from breaking new tests.

---

## 👨‍💼 Summary for the Business Team
- **Reliability**: We don't just guess; we use a **Policy Engine** (The Judge) to ensure safety.
- **Efficiency**: We use **Memory** to remember fixes so we don't pay for the same AI "thought" twice.
- **Transparency**: Every time the AI "thinks," it writes a **Healing Report** with screenshots so you can audit its decisions.
