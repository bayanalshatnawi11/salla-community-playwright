const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { packageReport } = require('./package-report.cjs');
const { loadProjectState } = require('./project-state.cjs');
const { getEnvironment } = require('../support/environment.ts');

const workspace = path.resolve(__dirname, '..');
const project = path.resolve(workspace, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const suite = option('--suite', 'all');
const platform = option('--platform', 'Both');
const requested = option('--case', '').split(',').filter(Boolean);
const { inventory, intake, inventoryFile } = loadProjectState();
const environmentName = option('--environment', inventory.environment);
const environment = getEnvironment(project, environmentName);
if (
  !['Web', 'Mobile', 'Both'].includes(platform) ||
  !['all', 'smoke', 'regression', 'feature-community'].includes(suite)
)
  throw new Error('The requested platform or suite is unknown.');
const selected = inventory.cases.filter(
  (item) =>
    (platform === 'Both' || item.platform === platform) &&
    (!requested.length ||
      requested.includes(item.sourceId) ||
      requested.includes(item.automationId)) &&
    (suite === 'all' || item.tags.includes(suite)),
);
if (
  !selected.length ||
  requested.some((id) => !selected.some((item) => [item.sourceId, item.automationId].includes(id)))
)
  throw new Error('The selected case or suite is not available on the requested platform.');
const missingResultReason = 'Runner did not produce an identified result for this case';
// Recover known runner errors, including saved blockers from earlier versions.
// Requirement blockers still stop execution, and all approvals/limits still apply.
if (
  selected.some(
    (item) =>
      item.status === 'blocked' &&
      item.blockerType !== 'execution' &&
      item.blocker !== missingResultReason,
  )
)
  throw new Error('A selected test is blocked by missing confirmed requirements.');
if (
  environment.production &&
  (!intake.liveApproval?.provided ||
    intake.environment.name !== environment.name ||
    intake.environment.baseURL !== environment.baseURL ||
    selected.some((item) => !(intake.liveApproval.caseIds ?? []).includes(item.sourceId)))
)
  throw new Error('Explicit Live approval is required for this exact environment and case scope.');
if (
  selected.some(
    (item) =>
      item.executions.filter((run) => run.countedTowardLimit).length >=
      (item.approvedExecutionLimit ?? inventory.limits.maxCompleteExecutionsPerCase),
  )
)
  throw new Error(
    'A selected case reached its execution limit. Request tester approval before another execution.',
  );

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runDirectory = path.join(project, '.testvibe/runs', runId);
fs.mkdirSync(runDirectory, { recursive: true });
const startedAt = new Date().toISOString();
for (const item of selected) item.status = 'implementing';
fs.writeFileSync(inventoryFile, JSON.stringify(inventory, null, 2) + '\n');
const filter = selected.map((item) => '@case-' + item.automationId).join('|');
const command = [
  path.join(workspace, 'node_modules/@playwright/test/cli.js'),
  'test',
  '--grep',
  filter,
];
// Retries count as executions too. Never let CI retries exceed a local case limit.
const remaining = Math.min(
  ...selected.map(
    (item) =>
      (item.approvedExecutionLimit ?? inventory.limits.maxCompleteExecutionsPerCase) -
      item.executions.filter((run) => run.countedTowardLimit).length,
  ),
);
if (process.env.CI && remaining < 2) command.push('--retries=0');
if (platform !== 'Both') command.push('--project', platform + ' - Chromium');
if (args.includes('--headed')) command.push('--headed');
if (args.includes('--debug')) command.push('--debug');
const runner = spawnSync(process.execPath, command, {
  cwd: workspace,
  env: { ...process.env, TESTVIBE_ENVIRONMENT: environment.name, TESTVIBE_RUN_DIR: runDirectory },
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});
fs.writeFileSync(
  path.join(runDirectory, 'runner.log'),
  (runner.stdout ?? '') + (runner.stderr ?? ''),
);
const resultDirectory = path.join(runDirectory, 'allure-results');
const results = fs.existsSync(resultDirectory)
  ? fs
      .readdirSync(resultDirectory)
      .filter((file) => file.endsWith('-result.json'))
      .map((file) => ({
        file: path.join(resultDirectory, file),
        result: JSON.parse(fs.readFileSync(path.join(resultDirectory, file), 'utf8')),
      }))
  : [];
const getLabel = (result, name) => result.labels?.find((label) => label.name === name)?.value;
const summary = {
  runId,
  startedAt,
  completedAt: new Date().toISOString(),
  environment: environment.name,
  suite,
  platform,
  requestedCases: selected.map((item) => item.sourceId),
  runnerExitCode: runner.status,
  sourceResultDirectory: resultDirectory,
  tests: [],
};
for (const item of selected) {
  const matches = results
    .filter(({ result }) => getLabel(result, 'Automation ID') === item.automationId)
    .sort((a, b) => a.result.start - b.result.start || a.result.stop - b.result.stop);
  if (!matches.length) {
    item.status = 'blocked';
    item.blockerType = 'execution';
    item.blocker = missingResultReason;
    // Preserve history, but never substitute an older pass for a missing current result.
    delete item.latestResult;
    summary.tests.push({
      sourceId: item.sourceId,
      name: item.name,
      status: 'blocked',
      blockerType: 'execution',
      reason: item.blocker,
    });
    continue;
  }
  for (const { file, result } of matches) {
    if (result.name !== item.name || getLabel(result, 'Source ID') !== item.sourceId)
      throw new Error('Runner changed a supplied test identity.');
    const execution = {
      kind: 'Playwright runner',
      automationId: item.automationId,
      runId,
      timestamp: new Date(result.start).toISOString(),
      completedAt: new Date(result.stop).toISOString(),
      environment: environment.name,
      platform: item.platform,
      browser: getLabel(result, 'Browser') ?? 'Chromium',
      browserVersion: getLabel(result, 'Browser version') ?? null,
      mode: getLabel(result, 'Browser mode') ?? null,
      status: result.status,
      resultFile: file,
      countedTowardLimit: true,
    };
    item.executions.push(execution);
    item.latestResult = execution;
  }
  const { result } = matches.at(-1);
  item.status = result.status === 'passed' ? 'verified' : 'implemented';
  delete item.blocker;
  delete item.blockerType;
  summary.tests.push({
    sourceId: item.sourceId,
    automationId: item.automationId,
    name: item.name,
    platform: item.platform,
    status: result.status,
    attempts: matches.length,
    flaky: result.status === 'passed' && matches.some((match) => match.result.status !== 'passed'),
    failure: result.statusDetails?.message
      ?.split('\n')
      .find((line) => line.trim())
      ?.slice(0, 250),
  });
}
fs.writeFileSync(inventoryFile, JSON.stringify(inventory, null, 2) + '\n');
fs.writeFileSync(path.join(runDirectory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
try {
  summary.report = packageReport();
} catch (error) {
  summary.reportError = error.message;
}
fs.writeFileSync(path.join(runDirectory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
// Keep the latest attempt visible even when no new report could be generated.
fs.writeFileSync(
  path.join(project, '.testvibe/latest-playwright-run.json'),
  JSON.stringify(summary, null, 2) + '\n',
);
console.log(JSON.stringify(summary, null, 2));
process.exitCode =
  summary.reportError || summary.tests.some((item) => item.status === 'blocked')
    ? 1
    : (runner.status ?? 1);
