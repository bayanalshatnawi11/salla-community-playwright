import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type CaseData = {
  sourceId: string;
  automationId: string;
  name: string;
  platform: 'Web' | 'Mobile';
  feature: string;
  story: string;
  severity: string;
  tags: string[];
  steps: string;
  expectedResult: string;
};

// Portable test definitions are separate from ignored execution history.
const inventory: { cases: CaseData[] } = JSON.parse(
  readFileSync(resolve(__dirname, 'test-cases.json'), 'utf8'),
);

export function getCase(sourceId: string): CaseData {
  const item = inventory.cases.find((c) => c.sourceId === sourceId);
  if (!item) throw new Error('The requested source test case is not registered.');
  return item;
}

export function details(item: CaseData) {
  return {
    tag: [...item.tags.map((tag) => '@' + tag), '@case-' + item.automationId],
    annotation: [
      { type: 'Automation ID', description: item.automationId },
      { type: 'Source ID', description: item.sourceId },
      { type: 'Feature', description: item.feature },
    ],
  };
}
