import { expect, test } from '../../fixtures/test';
import { categories } from '../../pages/CategoryPage';
import { details, getCase } from '../../support/cases';

const caseData = getCase('2');

test(caseData.name, details(caseData), async ({ page, homePage, categoryPage }) => {
  await homePage.open();
  await categoryPage.open('help');
  await test.step('Verify that the help category route and title are correct', async () => {
    await expect(page).toHaveURL((url) => url.pathname === categories.help.path);
    await expect(page).toHaveTitle(`${categories.help.name} | مجتمع سلة`);
    await expect(categoryPage.heading).toHaveText(categories.help.name);
  });
  await test.step('Verify that at least one help post is displayed', async () => {
    await expect(categoryPage.helpPosts).not.toHaveCount(0);
    await expect(categoryPage.firstPost('help')).toBeVisible();
    await expect(categoryPage.firstPostTitle('help')).toHaveCount(1);
    await expect(categoryPage.firstPostTitle('help')).toBeVisible();
    await expect(categoryPage.firstPostTitle('help')).toHaveText(/\S/);
    await expect(categoryPage.newsPosts).toHaveCount(0);
    await expect
      .poll(() => categoryPage.helpPostsMatchCategory(), {
        message: 'All displayed help posts belong to the selected category',
      })
      .toBe(true);
  });
});
