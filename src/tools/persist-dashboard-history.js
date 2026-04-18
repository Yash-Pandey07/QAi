const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function parseArgs(argv) {
  const args = {};

  for (let index = 2; index < argv.length; index++) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    args[key] = next && !next.startsWith('--') ? argv[++index] : 'true';
  }

  return args;
}

function buildHistoryEntry(runPayload, runFile) {
  const workflow = runPayload.workflow || {};
  const stats = runPayload.stats || {};

  return {
    runId: workflow.runId || null,
    runNumber: workflow.runNumber || null,
    workflowName: workflow.name || null,
    repository: workflow.repository || null,
    branch: workflow.branch || stats.gitBranch || null,
    commitSha: workflow.sha || null,
    event: workflow.event || null,
    generatedAt: runPayload.generatedAt || null,
    totalRuns: stats.totalRuns || 0,
    totalTestsCompleted: stats.totalTestsCompleted || 0,
    totalSelectorHeals: stats.totalSelectorHeals || 0,
    totalFlowHeals: stats.totalFlowHeals || 0,
    totalFailures: stats.totalFailures || 0,
    estimatedTimeSaved: stats.estimatedTimeSaved || '0.0',
    healSuccessRate: stats.healSuccessRate || '0.0',
    file: runFile.replace(/\\/g, '/'),
  };
}

function sortHistory(entries) {
  return [...entries].sort((left, right) => {
    const leftNumber = Number(left.runNumber || 0);
    const rightNumber = Number(right.runNumber || 0);

    if (rightNumber !== leftNumber) {
      return rightNumber - leftNumber;
    }

    return new Date(right.generatedAt || 0) - new Date(left.generatedAt || 0);
  });
}

function main() {
  const args = parseArgs(process.argv);
  const sourcePath = path.resolve(args.source || path.join('dashboard', 'public', 'data', 'dashboard-data.json'));
  const historyDir = path.resolve(args['history-dir'] || 'dashboard-history');
  const maxEntries = Number(args['max-entries'] || 250);

  const runPayload = readJson(sourcePath, null);
  if (!runPayload) {
    throw new Error(`Unable to read dashboard data from ${sourcePath}`);
  }

  const workflow = runPayload.workflow || {};
  const runId = String(workflow.runId || process.env.GITHUB_RUN_ID || Date.now());
  const runsDir = path.join(historyDir, 'runs');
  const runFile = path.join('runs', `${runId}.json`);
  const historyFile = path.join(historyDir, 'history.json');
  const latestFile = path.join(historyDir, 'latest.json');

  ensureDir(runsDir);

  writeJson(path.join(historyDir, runFile), runPayload);
  writeJson(latestFile, runPayload);

  const history = readJson(historyFile, []);
  const nextEntry = buildHistoryEntry(runPayload, runFile);
  const deduped = history.filter((entry) => String(entry.runId) !== runId);
  const nextHistory = sortHistory([nextEntry, ...deduped]).slice(0, maxEntries);

  writeJson(historyFile, nextHistory);

  console.log(`Stored historical dashboard payload for run ${runId}`);
  console.log(`History path: ${historyDir}`);
}

main();
