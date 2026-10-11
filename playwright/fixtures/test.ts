import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { CategoryPage } from '../pages/CategoryPage';
import { PostPage } from '../pages/PostPage';
import { getCase } from '../support/cases';
import * as allure from 'allure-js-commons';

type PageObjects = {
  homePage: HomePage;
  categoryPage: CategoryPage;
  postPage: PostPage;
  caseMetadata: void;
};

// Playwright creates a fresh page and page object for each test.
// Add inspected page classes here as their application flows are confirmed.
export const test = base.extend<PageObjects>({
  homePage: async ({ page, baseURL }, use) => {
    await allure.label('Browser version', page.context().browser()?.version() ?? 'unavailable');
    await use(new HomePage(page, baseURL));
  },
  categoryPage: async ({ page }, use) => {
    await use(new CategoryPage(page));
  },
  postPage: async ({ page }, use) => {
    await use(new PostPage(page));
  },
  caseMetadata: [
    async ({ headless }, use, testInfo) => {
      const sourceId = testInfo.annotations.find((a) => a.type === 'Source ID')?.description;
      if (sourceId) {
        const item = getCase(sourceId);
        await allure.parentSuite(item.platform);
        await allure.suite(item.feature);
        await allure.feature(item.feature);
        await allure.story(item.story);
        await allure.severity(item.severity);
        await allure.label('Automation ID', item.automationId);
        await allure.label('Source ID', item.sourceId);
        await allure.label('Project', 'Salla');
        await allure.label('Environment', String(testInfo.project.metadata.environment));
        await allure.label('Base URL', String(testInfo.project.metadata.baseURL));
        await allure.label('Browser', String(testInfo.project.metadata.browser ?? 'Chromium'));
        await allure.label('Browser mode', headless ? 'headless' : 'headed');
        await allure.description(
          `Source ID: ${item.sourceId}\nAutomation ID: ${item.automationId}\n\nSteps: ${item.steps}\n\nExpected result: ${item.expectedResult}`,
        );
      }
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
