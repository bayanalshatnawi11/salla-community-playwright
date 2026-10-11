const fs = require('node:fs');
const path = require('node:path');

const workspace = path.resolve(__dirname, '..');
const project = path.resolve(workspace, '..');
const catalog = require('../support/test-cases.json');
const defaults = require('../support/default-environment.json');
const stateDirectory = path.join(project, '.testvibe');
const inventoryFile = path.join(stateDirectory, 'playwright-batch.json');
const intakeFile = path.join(stateDirectory, 'playwright-intake.json');

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function loadProjectState() {
  fs.mkdirSync(stateDirectory, { recursive: true });
  // A fresh checkout can run this explicitly declared, public read-only scope.
  // Existing approvals, result paths and execution counts are never overwritten.
  if (!fs.existsSync(inventoryFile)) {
    writeJson(inventoryFile, {
      projectName: 'Salla',
      feature: 'Community',
      environment: defaults.name,
      baseURL: defaults.baseURL,
      limits: { maxCompleteExecutionsPerCase: 3 },
      cases: catalog.cases.map((item) => ({ ...item, status: 'implemented', executions: [] })),
    });
  }
  if (!fs.existsSync(intakeFile)) {
    writeJson(intakeFile, {
      environment: defaults,
      liveApproval: {
        provided: true,
        scope:
          'Exactly four public, read-only Community portfolio scenarios; no login or mutations',
        source: 'Declared portfolio scope; only the configured public target is permitted',
        caseIds: catalog.cases.map((item) => item.sourceId),
      },
    });
  }
  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'));
  const intake = JSON.parse(fs.readFileSync(intakeFile, 'utf8'));
  if (
    inventory.cases.length !== catalog.cases.length ||
    catalog.cases.some(
      (item) =>
        !inventory.cases.some(
          (saved) =>
            saved.automationId === item.automationId &&
            saved.sourceId === item.sourceId &&
            saved.name === item.name &&
            saved.platform === item.platform,
        ),
    )
  ) {
    throw new Error(
      'The local execution inventory does not match the four portable test definitions.',
    );
  }
  return { inventory, intake, inventoryFile };
}

module.exports = { loadProjectState };
