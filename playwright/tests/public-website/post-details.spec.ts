import { expect, test } from '../../fixtures/test';
import { categories } from '../../pages/CategoryPage';
import { details, getCase } from '../../support/cases';

const caseData = getCase('3');

test(caseData.name, details(caseData), async ({ page, homePage, categoryPage, postPage }) => {
  await homePage.open();
  await categoryPage.open('help');
  await test.step('Verify that a help post is available to open', async () => {
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
  const selectedTitle = await categoryPage.openVisibleHelpPost();
  await test.step('Verify that the details page matches the selected live title', async () => {
    await expect(page).toHaveURL(
      (url) => url.pathname.startsWith('/detail/') && url.pathname.length > '/detail/'.length,
    );
    await expect(postPage.post).toHaveCount(1);
    await expect(postPage.heading).toHaveCount(1);
    await expect(postPage.heading).toBeVisible();
    await expect(postPage.heading).toHaveText(selectedTitle);
  });
  await test.step('Verify that the post body is visible and populated', async () => {
    await expect(postPage.body).toHaveCount(1);
    await expect(postPage.body).toBeVisible();
    await expect(postPage.body).toHaveText(/\S/);
  });
  await test.step('Verify that the comments section is visible', async () => {
    await expect(postPage.commentsHeading).toHaveCount(1);
    await expect(postPage.commentsHeading).toBeVisible();
  });
});
