import { type Locator, type Page } from '@playwright/test';

export class PostPage {
  readonly post: Locator;
  readonly heading: Locator;
  readonly body: Locator;
  readonly commentsHeading: Locator;

  constructor(page: Page) {
    this.post = page.getByRole('main').locator('.posts-container');
    this.heading = this.post.getByRole('heading', { level: 1 });
    // Direct-child body excludes comment bodies and recommended post previews.
    this.body = this.post.locator(':scope > div > .content');
    this.commentsHeading = this.post.getByRole('heading', {
      level: 2,
      name: /^التعليقات(?:\s*\([^)]*\))?$/,
    });
  }
}
