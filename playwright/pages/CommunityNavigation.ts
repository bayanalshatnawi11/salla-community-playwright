import { expect, test, type Locator, type Page } from '@playwright/test';

export class CommunityNavigation {
  readonly sidebar: Locator;
  readonly primaryLinkNames = ['الرئيسية', 'ابدأ من هنا', 'أخبار سلة', 'محتاج فزعتكم'] as const;

  constructor(private readonly page: Page) {
    // The inspected sidebar has no navigation role or test ID. Its custom
    // scrollbar class and direct list container identify one navigation region.
    this.sidebar = page.locator('.scrollbar-sidebar-hide > div:has(> ul)');
  }

  link(name: string): Locator {
    return this.sidebar.getByRole('link', { name, exact: true });
  }

  async openCategory(name: string, expectedPath: string): Promise<void> {
    await test.step(`Open the ${name} category through the sidebar`, async () => {
      await expect(this.sidebar).toHaveCount(1);
      const link = this.link(name);
      await expect(link).toHaveCount(1);
      await expect(link).toBeVisible();
      await expect(link).toBeEnabled();
      await expect(link).toHaveAttribute('href', expectedPath);
      await link.click();
      await expect(this.page).toHaveURL((url) => url.pathname === expectedPath);
    });
  }
}
