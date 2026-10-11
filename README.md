# Salla Community — QA Automation Portfolio

A Playwright and TypeScript portfolio sample covering four independent, public,
read-only flows on [Salla Community](https://community.salla.sa/).

The sample demonstrates Page Object Model, strict TypeScript, scoped locators,
web-first assertions, dynamic live data, Playwright HTML and Allure reporting,
ESLint, Prettier, and a GitHub Actions workflow.

## The four scenarios

| ID      | Scenario             | Coverage                                                              |
| ------- | -------------------- | --------------------------------------------------------------------- |
| SA-0001 | Homepage             | Heading, search field, and primary navigation links                   |
| SA-0002 | Category navigation  | Help category route, title, and visible posts                         |
| SA-0003 | Post details         | Dynamically captured title, details route, body, and comments section |
| SA-0004 | Switching categories | Help → Salla News → Help, with updated routes, headings, and content  |

Tests do not log in, create posts or comments, or submit likes. They do not bypass
Cloudflare, CAPTCHA, authentication, or other protection.

## Get started

Install Node.js 24 LTS, then run:

```bash
cd playwright
npm ci
npx playwright install --with-deps chromium
npm test
```

Headed, UI, debug, report, and quality-check commands are documented in the
[automation README](playwright/README.md). The exact steps and expected results
are in [TEST_CASES.md](playwright/TEST_CASES.md).

## Recorded results and limitations

The latest preserved local run was on **9 October 2026, 17:44 UTC**:

- Homepage and Category navigation: **passed**.
- Post details and Switching categories: **failed during initial Help-category navigation**.
- Total: **2 passed, 2 failed**, headless Chromium, two workers, no retries.

One failed page displayed an application error message; the other had no main
heading and appeared blank. The evidence does not establish the underlying cause
or a Cloudflare/CAPTCHA cause. Assertions were preserved.

TypeScript, lint, and formatting checks passed. The runner and report fixes were
verified with 15 offline checks; those checks do not count as additional website
tests or change the recorded live outcomes.

The live website contains changing content and can be affected by service
availability and external protection. Generated reports and browser evidence
are excluded from source control; a standalone report can be shared separately.

## CI

The [GitHub Actions workflow](.github/workflows/playwright.yml) checks code quality,
executes the four cases, and uploads available reports and evidence even when
tests fail. It requires no credentials or repository secrets.

**CI execution is unverified.** The initial publication skips CI to avoid an
additional live-site execution. The workflow remains configured for future
pushes and pull requests.

## Repository layout

```text
.github/workflows/playwright.yml
playwright/
├── pages/
├── tests/public-website/
├── fixtures/
├── support/
├── scripts/
├── playwright.config.ts
├── package.json
├── README.md
└── TEST_CASES.md
```

Local environments, secrets, execution history, generated reports, and
`node_modules` are excluded from this public repository.
