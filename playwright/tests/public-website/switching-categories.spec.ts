import { expect, test } from '../../fixtures/test';
import { categories } from '../../pages/CategoryPage';
import { details, getCase } from '../../support/cases';

const caseData = getCase('4');

test(caseData.name, details(caseData), async ({ page, homePage, categoryPage }) => {
  await homePage.open();
  await categoryPage.open('help');
  await test.step('Verify that the initial help category has visible posts', async () => {
    await expect(page).toHaveURL((url) => url.pathname === categories.help.path);
    await expect(page).toHaveTitle(`${categories.help.name} | مجتمع سلة`);
    await expect(categoryPage.heading).toHaveText(categories.help.name);
    await expect(categoryPage.helpPosts).not.toHaveCount(0);
    await expect(categoryPage.firstPost('help')).toBeVisible();
    await expect(categoryPage.firstPostTitle('help')).toHaveCount(1);
    await expect(categoryPage.firstPostTitle('help')).toBeVisible();
    await expect(categoryPage.firstPostTitle('help')).toHaveText(/\S/);
    await expect(categoryPage.newsPosts).toHaveCount(0);
    await expect.poll(() => categoryPage.helpPostsMatchCategory()).toBe(true);
  });
  const helpTitles = await categoryPage.capturePostTitles('help');

  await categoryPage.open('news');
  await test.step('Verify that switching to Salla News updates the route, title and posts', async () => {
    await expect(page).toHaveURL((url) => url.pathname === categories.news.path);
    await expect(page).toHaveTitle(`${categories.news.name} | مجتمع سلة`);
    await expect(categoryPage.heading).toHaveText(categories.news.name);
    await expect(categoryPage.newsPosts).not.toHaveCount(0);
    await expect(categoryPage.firstPost('news')).toBeVisible();
    await expect(categoryPage.firstPostTitle('news')).toHaveCount(1);
    await expect(categoryPage.firstPostTitle('news')).toBeVisible();
    await expect(categoryPage.firstPostTitle('news')).toHaveText(/\S/);
    await expect(categoryPage.firstNewsBody).toHaveText(/\S/);
    await expect(categoryPage.helpPosts).toHaveCount(0);
    await expect.poll(() => categoryPage.postTitles('news')).not.toEqual(helpTitles);
  });
  const newsTitles = await categoryPage.capturePostTitles('news');

  await categoryPage.open('help');
  await test.step('Verify that returning to Help replaces the news content', async () => {
    await expect(page).toHaveURL((url) => url.pathname === categories.help.path);
    await expect(page).toHaveTitle(`${categories.help.name} | مجتمع سلة`);
    await expect(categoryPage.heading).toHaveText(categories.help.name);
    await expect(categoryPage.helpPosts).not.toHaveCount(0);
    await expect(categoryPage.firstPost('help')).toBeVisible();
    await expect(categoryPage.firstPostTitle('help')).toHaveCount(1);
    await expect(categoryPage.firstPostTitle('help')).toBeVisible();
    await expect(categoryPage.firstPostTitle('help')).toHaveText(/\S/);
    await expect(categoryPage.newsPosts).toHaveCount(0);
    await expect.poll(() => categoryPage.helpPostsMatchCategory()).toBe(true);
    await expect.poll(() => categoryPage.postTitles('help')).not.toEqual(newsTitles);
  });
});
