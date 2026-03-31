const { createAIClient } = require('./src/agents/ai-client');
const fs = require('fs');
const SYSTEM_PROMPT = fs.readFileSync('./src/agents/prompts/selector-system-prompt.md', 'utf-8');

const client = createAIClient('selector');

const userPrompt = `
## Failed Step
- **Test ID:** login-form-006-heal
- **Step ID:** login-form-006-heal-step-1-fill
- **Action:** fill
- **Target description:** Email address input field on login form
- **Original selector:** [data-testid="email-input-v3"]
- **URL:** file:///C:/Users/LENOVO/OneDrive/Documents/Riya_ai/tests/e2e/fixtures/login-page.html
- **Error:** page.fill: Timeout 10000ms exceeded.

## DOM Excerpt
\`\`\`html
<form id="login-form">
  <div class="form-group">
    <label for="email">Email address</label>
    <div class="input-wrapper">
      <input type="email" id="email" name="email" placeholder="you@example.com" required aria-label="Email address" />
    </div>
  </div>
</form>
\`\`\`

## Accessibility Tree
\`\`\`
textbox "Email address"
\`\`\`

Please return a JSON object with selector candidates as described in your instructions.
`;

async function main() {
  const response = await client.chat(SYSTEM_PROMPT, userPrompt);
  fs.writeFileSync('ai-output.json', response.content);
  console.log('Done. Check ai-output.json');
}

main().catch(console.error);
