import { expect, test, type Locator, type Page } from '@playwright/test';
import { CommunityNavigation } from './CommunityNavigation';

export type CommunityCategory = 'help' | 'news';

export const categories = {
  help: { name: 'محتاج فزعتكم', path: '/category-detail/need-your-help/13' },
  news: { name: 'أخبار سلة', path: '/category-detail/salla-news/24' },
} as const;

export class CategoryPage {
  private readonly navigation: CommunityNavigation;
  readonly heading: Locator;
  readonly helpPosts: Locator;
  readonly newsPosts: Locator;
  readonly helpCategoryLabels: Locator;

  constructor(private readonly page: Page) {
    this.navigation = new CommunityNavigation(page);
    const main = page.getByRole('main');
    this.heading = main.getByRole('heading', { level: 1 });
    // Inspected preview components: each has one direct title and body.
    this.helpPosts = main.locator('div:has(> h3):has(> .content)').filter({ visible: true });
    this.newsPosts = main
      .locator('div.cursor-pointer:has(> :is(h2, h3)):has(> div):not(:has(> .content))')
      .filter({ visible: true });
    this.helpCategoryLabels = this.helpPosts.locator('div:has(> img[alt="category icon"]) > span');
  }

  posts(category: CommunityCategory): Locator {
    return category === 'help' ? this.helpPosts : this.newsPosts;
  }

  async open(category: CommunityCategory): Promise<void> {
    const expected = categories[category];
    await this.navigation.openCategory(expected.name, expected.path);
    await test.step(`Verify that the ${expected.name} category is ready`, async () => {
      await expect(this.heading).toHaveCount(1);
      await expect(this.heading).toBeVisible();
    });
  }

  firstPost(category: CommunityCategory): Locator {
    // Any first visible live post is valid; no particular title or count is required.
    return this.posts(category).first();
  }

  firstPostTitle(category: CommunityCategory): Locator {
    return this.firstPost(category).getByRole('heading');
  }

  get firstNewsBody(): Locator {
    return this.firstPost('news').locator(':scope > div');
  }

  async helpPostsMatchCategory(): Promise<boolean> {
    const labels = await this.helpCategoryLabels.allTextContents();
    return (
      labels.length > 0 &&
      labels.length === (await this.helpPosts.count()) &&
      labels.every((label) => label.trim() === categories.help.name)
    );
  }

  async postTitles(category: CommunityCategory): Promise<string[]> {
    return (await this.posts(category).getByRole('heading').allTextContents()).map((title) =>
      title.trim(),
    );
  }

  async capturePostTitles(category: CommunityCategory): Promise<string[]> {
    return test.step(`Capture current ${categories[category].name} post titles`, async () => {
      const titles = this.posts(category).getByRole('heading');
      await expect(titles).not.toHaveCount(0);
      const current = await this.postTitles(category);
      await test.info().attach(`${category}-post-titles`, {
        body: JSON.stringify(current),
        contentType: 'application/json',
      });
      return current;
    });
  }

  async openVisibleHelpPost(): Promise<string> {
    return test.step('Capture and open a visible help post', async () => {
      const post = this.firstPost('help');
      await expect(post).toBeVisible();
      const title = this.firstPostTitle('help');
      await expect(title).toHaveCount(1);
      await expect(title).toHaveText(/\S/);
      const selectedTitle = (await title.innerText()).trim();
      await test
        .info()
        .attach('Selected post title', { body: selectedTitle, contentType: 'text/plain' });
      await title.click();
      await expect(this.page).toHaveURL(
        (url) => url.pathname.startsWith('/detail/') && url.pathname.length > '/detail/'.length,
      );
      // Keep the observable result of the click in the same Page Object method.
      await expect(this.heading).toHaveText(selectedTitle);
      return selectedTitle;
    });
  }
}
