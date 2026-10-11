const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { renderShareableReport } = require('./report-view.cjs');

const project = path.resolve(__dirname, '../..');
const workspace = path.resolve(__dirname, '..');
const inventoryFile = path.join(project, '.testvibe/playwright-batch.json');

function label(result, name) {
  return result.labels?.find((item) => item.name === name)?.value;
}

function attachmentsOf(node) {
  return [...(node.attachments ?? []), ...(node.steps ?? []).flatMap(attachmentsOf)];
}

function packageReport() {
  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'));
  const latest = inventory.cases.filter((item) => item.latestResult?.resultFile);
  if (!latest.length) throw new Error('No preserved application results are available to package.');
  const reportId = 'combined-' + new Date().toISOString().replace(/[:.]/g, '-');
  const directory = path.join(project, '.testvibe/reports', reportId);
  const input = path.join(directory, 'allure-results');
  fs.mkdirSync(input, { recursive: true });
  const uuids = new Set();
  const reportResults = new Map();
  const fixturesByResult = new Map();
  const originalDirectories = new Set();
  const runMetadata = new Map();
  const manifest = {
    project: inventory.projectName,
    feature: inventory.feature,
    baseURL: inventory.baseURL,
    environment: inventory.environment,
    timezone: 'Asia/Amman',
    generatedAt: new Date().toISOString(),
    sourceRuns: [],
    tests: [],
    excludedAttachments: [],
  };
  const attachmentSources = new Set();
  const link = (source, name) => {
    const target = path.join(input, name ?? path.basename(source));
    if (!fs.existsSync(target)) fs.linkSync(source, target);
  };
  for (const item of latest) {
    const source = item.latestResult.resultFile;
    const result = JSON.parse(fs.readFileSync(source, 'utf8'));
    const executionAutomationId = item.latestResult.automationId ?? item.automationId;
    if (
      result.name !== item.name ||
      label(result, 'Automation ID') !== executionAutomationId ||
      label(result, 'Source ID') !== item.sourceId ||
      label(result, 'parentSuite') !== item.platform ||
      label(result, 'feature') !== inventory.feature ||
      label(result, 'Base URL') !== inventory.baseURL
    ) {
      throw new Error('Preserved test identity or platform labels do not match the inventory.');
    }
    if (executionAutomationId !== item.automationId) {
      if (!item.previousAutomationIds?.includes(executionAutomationId))
        throw new Error('The preserved result has no approved identity mapping.');
      // Project the requested numbering into a new report copy. Never edit or
      // hard-link a modified result over the original execution evidence.
      result.labels = result.labels.map((entry) => {
        if (entry.name === 'Automation ID') return { ...entry, value: item.automationId };
        if (entry.name === 'tag' && entry.value === 'case-' + executionAutomationId)
          return { ...entry, value: 'case-' + item.automationId };
        return entry;
      });
      result.labels.push({ name: 'Execution Automation ID', value: executionAutomationId });
      for (const step of result.steps ?? []) {
        if (step.name === 'Automation ID: ' + executionAutomationId)
          step.name = 'Automation ID: ' + item.automationId;
      }
      if (result.description)
        result.description = result.description.replace(
          'Automation ID: ' + executionAutomationId,
          'Automation ID: ' + item.automationId,
        );
      fs.writeFileSync(path.join(input, path.basename(source)), JSON.stringify(result));
    } else {
      link(source);
    }
    reportResults.set(item.automationId, result);
    uuids.add(result.uuid);
    const sourceDirectory = path.dirname(source);
    originalDirectories.add(sourceDirectory);
    if (!runMetadata.has(sourceDirectory)) {
      const runResults = path.join(sourceDirectory, '../results.json');
      const config = fs.existsSync(runResults)
        ? JSON.parse(fs.readFileSync(runResults, 'utf8')).config
        : undefined;
      const workers = config?.metadata?.actualWorkers;
      runMetadata.set(sourceDirectory, {
        workers: Number.isInteger(workers) && workers > 0 ? workers : null,
      });
    }
    const attachments = attachmentsOf(result);
    for (const attachment of attachments) {
      const attachmentPath = path.join(sourceDirectory, attachment.source);
      link(attachmentPath);
      attachmentSources.add(attachmentPath);
    }
    manifest.tests.push({
      sourceId: item.sourceId,
      automationId: item.automationId,
      executionAutomationId,
      name: item.name,
      platform: item.platform,
      environment: label(result, 'Environment') ?? null,
      feature: label(result, 'feature') ?? null,
      story: label(result, 'story') ?? null,
      severity: label(result, 'severity') ?? null,
      workers: runMetadata.get(sourceDirectory).workers,
      browser: label(result, 'Browser') ?? 'Chromium (previous execution)',
      browserVersion: label(result, 'Browser version') ?? null,
      mode: label(result, 'Browser mode') ?? null,
      status: result.status,
      start: result.start,
      stop: result.stop,
      durationMs: result.stop - result.start,
      sourceResult: source,
      attachmentCount: attachments.length,
    });
  }
  for (const sourceDirectory of originalDirectories) {
    manifest.sourceRuns.push(path.dirname(sourceDirectory));
    for (const file of fs.readdirSync(sourceDirectory)) {
      if (!file.endsWith('-container.json')) continue;
      const container = JSON.parse(fs.readFileSync(path.join(sourceDirectory, file), 'utf8'));
      if (!container.children?.some((id) => uuids.has(id))) continue;
      const filtered = { ...container, children: container.children.filter((id) => uuids.has(id)) };
      fs.writeFileSync(path.join(input, file), JSON.stringify(filtered));
      for (const id of filtered.children) {
        fixturesByResult.set(id, [
          ...(fixturesByResult.get(id) ?? []),
          ...(container.befores ?? []),
          ...(container.afters ?? []),
        ]);
      }
      for (const fixture of [...(container.befores ?? []), ...(container.afters ?? [])]) {
        for (const attachment of attachmentsOf(fixture)) {
          const attachmentPath = path.join(sourceDirectory, attachment.source);
          link(attachmentPath);
          attachmentSources.add(attachmentPath);
        }
      }
    }
    for (const file of ['environment.properties', 'executor.json']) {
      if (fs.existsSync(path.join(sourceDirectory, file))) link(path.join(sourceDirectory, file));
    }
  }
  manifest.counts = Object.fromEntries(
    ['Web', 'Mobile', 'Overall'].map((platform) => {
      const selected = manifest.tests.filter(
        (item) => platform === 'Overall' || item.platform === platform,
      );
      return [
        platform,
        Object.fromEntries(
          ['passed', 'failed', 'broken', 'skipped'].map((status) => [
            status,
            selected.filter((item) => item.status === status).length,
          ]),
        ),
      ];
    }),
  );
  fs.writeFileSync(
    path.join(directory, 'source-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  const generated = spawnSync(
    process.execPath,
    [
      path.join(workspace, 'node_modules/allure/cli.js'),
      'generate',
      input,
      '--config',
      path.join(workspace, 'allurerc.json'),
      '--output',
      path.join(directory, 'report'),
    ],
    {
      cwd: workspace,
      encoding: 'utf8',
      env: { ...process.env, ALLURE_NO_ANALYTICS: '1' },
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  fs.writeFileSync(
    path.join(directory, 'generation.log'),
    (generated.stdout ?? '') + (generated.stderr ?? ''),
  );
  if (generated.status !== 0)
    throw new Error(
      'Allure report generation failed; the source results and generation log are preserved.',
    );
  const reports = [];
  function collect(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(file);
      else if (entry.name.endsWith('.html')) reports.push(file);
    }
  }
  collect(path.join(directory, 'report'));
  const report = reports.find((file) => path.basename(file) === 'index.html') ?? reports[0];
  if (!report || fs.statSync(report).size < 10_000)
    throw new Error('The standalone report file was not generated.');
  const html = fs.readFileSync(report, 'utf8');
  if (!/data:(?:text|application)\//.test(html))
    throw new Error('The report did not embed its application assets.');
  const embedded = new Map();
  for (const match of html.matchAll(/d\("([^"\\]+)","([A-Za-z0-9+/=]*)"\)/g)) {
    embedded.set(match[1], Buffer.from(match[2], 'base64'));
  }
  const embeddedResults = [...embedded]
    .filter(([name]) => name.startsWith('data/test-results/'))
    .map(([, bytes]) => JSON.parse(bytes.toString('utf8')));
  if (embeddedResults.length !== manifest.tests.length)
    throw new Error('Packaged test counts do not match the preserved results.');
  for (const expected of manifest.tests) {
    const actual = embeddedResults.find(
      (item) => label(item, 'Automation ID') === expected.automationId,
    );
    if (
      !actual ||
      actual.name !== expected.name ||
      actual.status !== expected.status ||
      actual.start !== expected.start ||
      actual.stop !== expected.stop ||
      label(actual, 'parentSuite') !== expected.platform ||
      label(actual, 'Source ID') !== expected.sourceId ||
      (expected.executionAutomationId !== expected.automationId &&
        label(actual, 'Execution Automation ID') !== expected.executionAutomationId) ||
      label(actual, 'Environment') !== manifest.environment ||
      label(actual, 'Base URL') !== manifest.baseURL ||
      label(actual, 'feature') !== manifest.feature
    ) {
      throw new Error(
        'Packaged identities, statuses, platforms, timestamps, or environment do not match the original execution results.',
      );
    }
  }
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const embeddedAttachments = new Set(
    [...embedded]
      .filter(([name]) => name.startsWith('data/attachments/'))
      .map(([, bytes]) => hash(bytes)),
  );
  for (const source of attachmentSources) {
    if (!embeddedAttachments.has(hash(fs.readFileSync(source))))
      throw new Error('An evidence attachment was not embedded in the report.');
  }
  manifest.validatedEmbeddedAttachments = attachmentSources.size;
  manifest.nativeReportPath = report;
  const rendered = renderShareableReport({
    inventory,
    manifest,
    reportResults,
    fixturesByResult,
    input,
    nativeHtml: html,
    attachmentsOf,
  });
  for (const source of attachmentSources) {
    if (!rendered.evidenceHashes.has(hash(fs.readFileSync(source))))
      throw new Error('Evidence is missing from the direct HTML report.');
  }
  manifest.notExecuted = rendered.notExecuted;
  manifest.presentation =
    'Original summary layout; explicit Metadata section with one row per case; steps and evidence below';
  manifest.metadataRowCount = rendered.metadataRowCount;
  manifest.renderedStepCount = rendered.renderedStepCount;
  manifest.validatedDirectAttachments = rendered.attachmentCount;
  const shareable = path.join(directory, 'Salla-Community-Live-Web.html');
  fs.writeFileSync(shareable, rendered.html);
  manifest.reportPath = shareable;
  manifest.reportBytes = fs.statSync(shareable).size;
  fs.writeFileSync(
    path.join(directory, 'source-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(project, '.testvibe/latest-playwright-report.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  return {
    reportPath: shareable,
    manifestPath: path.join(directory, 'source-manifest.json'),
    counts: manifest.counts,
    notExecuted: manifest.notExecuted,
    tests: manifest.tests.map(({ sourceId, automationId, name, platform, status }) => ({
      sourceId,
      automationId,
      name,
      platform,
      status,
    })),
  };
}

module.exports = { packageReport };
if (require.main === module) {
  try {
    console.log(JSON.stringify(packageReport(), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
