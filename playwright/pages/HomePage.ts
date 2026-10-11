import { expect, test, type Locator, type Page } from '@playwright/test';
import { ApplicationPage } from './ApplicationPage';
import { CommunityNavigation } from './CommunityNavigation';

export class HomePage {
  private readonly application: ApplicationPage;
  readonly navigation: CommunityNavigation;
  readonly main: Locator;
  readonly heading: Locator;
  readonly search: Locator;

  constructor(
    private readonly page: Page,
    baseURL: string | undefined,
  ) {
    this.application = new ApplicationPage(page, baseURL);
    this.navigation = new CommunityNavigation(page);
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.search = this.main.locator('#search-bar');
  }

  async open(): Promise<void> {
    await this.application.open();
    await test.step('Verify that the Community homepage is ready', async () => {
      await expect(this.page).toHaveURL((url) => url.pathname === '/');
      await expect(this.main).toHaveCount(1);
      await expect(this.heading).toHaveCount(1);
      await expect(this.heading).toBeVisible();
    });
  }
}
