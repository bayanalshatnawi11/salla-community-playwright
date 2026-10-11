const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const workspace = path.resolve(__dirname, '..');
const project = path.resolve(workspace, '..');
const reportType = process.argv[2] ?? 'playwright';
const manifestFile = path.join(project, '.testvibe/latest-playwright-report.json');

if (!fs.existsSync(manifestFile)) {
  console.error(
    'No generated report is available. Run the tests or generate a report from preserved results first.',
  );
  process.exitCode = 1;
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const latestTest = manifest.tests.reduce(
    (latest, item) => (!latest || item.start > latest.start ? item : latest),
    null,
  );
  if (!latestTest?.sourceResult || !Number.isFinite(latestTest.start))
    throw new Error('The saved report has no execution timestamp or source result.');
  const sourceRun = path.dirname(path.dirname(latestTest.sourceResult));
  const attemptFile = path.join(project, '.testvibe/latest-playwright-run.json');
  const latestAttempt = fs.existsSync(attemptFile)
    ? JSON.parse(fs.readFileSync(attemptFile, 'utf8'))
    : undefined;
  const generationFailedAfterReport =
    latestAttempt?.reportError &&
    Date.parse(latestAttempt.completedAt) >= Date.parse(manifest.generatedAt);
  const playwrightReportPredatesAttempt =
    reportType !== 'allure' &&
    latestAttempt &&
    latestAttempt.runId !== path.basename(sourceRun) &&
    Date.parse(latestAttempt.startedAt) > latestTest.start;
  if (generationFailedAfterReport || playwrightReportPredatesAttempt) {
    console.warn(
      `WARNING: Opening a preserved ${reportType === 'allure' ? 'Allure' : 'Playwright'} report; it does not represent the latest attempted run (${latestAttempt.runId}, ${latestAttempt.startedAt}).`,
    );
    if (latestAttempt.reportError)
      console.warn(`Latest report generation failed: ${latestAttempt.reportError}`);
    console.warn(
      `Saved execution times: ${manifest.tests.map((item) => `${item.automationId}: ${new Date(item.start).toISOString()}`).join('; ')}.`,
    );
    console.warn(
      `Latest attempt details: ${path.join(project, '.testvibe/runs', latestAttempt.runId, 'summary.json')}`,
    );
  }
  const command =
    reportType === 'allure'
      ? [
          path.join(workspace, 'node_modules/allure/cli.js'),
          'open',
          path.dirname(manifest.nativeReportPath),
        ]
      : [
          path.join(workspace, 'node_modules/@playwright/test/cli.js'),
          'show-report',
          path.join(sourceRun, 'playwright-report'),
        ];
  const opened = spawnSync(process.execPath, command, {
    cwd: workspace,
    stdio: 'inherit',
    env: { ...process.env, ALLURE_NO_ANALYTICS: '1' },
  });
  process.exitCode = opened.status ?? 1;
}
