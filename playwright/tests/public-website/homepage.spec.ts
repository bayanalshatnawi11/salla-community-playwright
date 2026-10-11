import { expect, test } from '../../fixtures/test';
import { details, getCase } from '../../support/cases';

const caseData = getCase('1');

test(caseData.name, details(caseData), async ({ page, homePage }) => {
  await homePage.open();
  await test.step('Verify that the Community homepage title is displayed', async () => {
    await expect(page).toHaveURL((url) => url.pathname === '/');
    await expect(page).toHaveTitle('مجتمع التجارة الالكترونية');
    await expect(homePage.heading).toHaveText('مجتمع التجارة الالكترونية');
  });
  await test.step('Verify that the search field is visible and editable', async () => {
    await expect(homePage.search).toHaveCount(1);
    await expect(homePage.search).toHaveAttribute('type', 'search');
    await expect(homePage.search).toBeVisible();
    await expect(homePage.search).toBeEditable();
  });
  await test.step('Verify that the main navigation links are available', async () => {
    await expect(homePage.navigation.sidebar).toHaveCount(1);
    await expect(homePage.navigation.sidebar).toBeVisible();
    for (const name of homePage.navigation.primaryLinkNames) {
      await test.step(`Verify that ${name} is a usable navigation link`, async () => {
        const link = homePage.navigation.link(name);
        await expect(link).toHaveCount(1);
        await expect(link).toBeVisible();
        await expect(link).toBeEnabled();
        await expect(link).toHaveAttribute('href', /\S/);
      });
    }
  });
});
