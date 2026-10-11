const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');

async function verifySetup() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(
      '<h1>Browser setup verified</h1><label for="sample">Sample input</label><input id="sample">',
    );
    assert.equal(await page.getByRole('heading', { name: 'Browser setup verified' }).count(), 1);
    await page.getByLabel('Sample input').fill('TypeScript ready');
    assert.equal(await page.getByLabel('Sample input').inputValue(), 'TypeScript ready');
    console.log(
      JSON.stringify({
        status: 'passed',
        scope: 'Local browser setup only; no application tests executed',
        platform: 'Web - Chromium',
        browserVersion: browser.version(),
        checkedAt: new Date().toISOString(),
      }),
    );
  } finally {
    await browser.close();
  }
}

verifySetup().catch(() => {
  console.error('Browser setup verification failed. Review the local Playwright installation.');
  process.exitCode = 1;
});
