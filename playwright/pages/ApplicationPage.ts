import { expect, test, type Page, type Response } from '@playwright/test';

/** Entry point for the confirmed application URL. Add page-specific behavior after inspection. */
export class ApplicationPage {
  constructor(
    private readonly page: Page,
    private readonly baseURL: string | undefined,
  ) {}

  async open(): Promise<void> {
    await test.step('Open the configured application', async () => {
      if (!this.baseURL) {
        throw new Error(
          'Confirm the environment and configure its base URL before running application tests.',
        );
      }

      let url: URL;
      try {
        url = new URL(this.baseURL);
      } catch {
        throw new Error('The configured base URL must be a valid HTTP or HTTPS URL.');
      }

      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        throw new Error('Use an HTTP or HTTPS base URL without embedded credentials.');
      }

      const documentStatuses: number[] = [];
      const observeResponse = (response: Response) => {
        if (
          response.request().isNavigationRequest() &&
          response.frame() === this.page.mainFrame()
        ) {
          documentStatuses.push(response.status());
        }
      };
      this.page.on('response', observeResponse);
      try {
        const response = await this.page.goto(this.baseURL, { waitUntil: 'domcontentloaded' });
        // The challenge heading renders after the initial response; its document title is available first.
        if (response?.status() === 403 && /^Just a moment/.test(await this.page.title())) {
          await test.step('Wait for the website to complete automatic security verification', async () => {
            await expect
              .poll(() => documentStatuses.at(-1) ?? 403, {
                timeout: 45_000,
                message:
                  'The real application document returns a successful response after automatic verification',
              })
              .toBeLessThan(400);
          });
        } else if (!response || response.status() >= 400) {
          throw new Error(
            `Application navigation failed${response ? ` (HTTP ${response.status()})` : ': no document response'}.`,
          );
        }
      } finally {
        this.page.off('response', observeResponse);
        await test.info().attach('Actual document response statuses', {
          body: JSON.stringify(documentStatuses),
          contentType: 'application/json',
        });
      }
    });
  }
}
