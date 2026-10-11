# Salla Community — QA automation portfolio

A small Playwright and TypeScript sample covering four public, read-only flows on [Salla Community](https://community.salla.sa/). It demonstrates Page Object Model, independent tests, meaningful UI assertions, dynamic live data, Allure reporting and CI. The existing implementation and four business scenarios are preserved.

This project uses Playwright Test, strict TypeScript, Node.js 24 LTS, ESLint, Prettier, Playwright HTML reporting and Allure 3. The automation source is kept in `playwright/`; this repository contains only the TypeScript portfolio sample.

## Coverage

| Automation ID | Source ID | Original test name   | Verification                                                              |
| ------------- | --------- | -------------------- | ------------------------------------------------------------------------- |
| SA-0001       | 1         | Homepage             | Homepage heading, search field and primary sidebar links.                 |
| SA-0002       | 2         | Category navigation  | Help category route, title and at least one post.                         |
| SA-0003       | 3         | Post details         | Dynamically selected post title, detail route, body and comments section. |
| SA-0004       | 4         | Switching categories | Help → News → Help, with matching routes, titles and updated content.     |

See [TEST_CASES.md](TEST_CASES.md) for preconditions, steps and expected results. The four test names and Source IDs 1–4 map to Automation IDs SA-0001–SA-0004. Local execution history and generated evidence are excluded from this repository. All have `regression` and `feature-community` tags; none is classified as Smoke. No Mobile scenarios are part of this sample.

## Structure

```text
.github/workflows/playwright.yml     # CI at workspace root
playwright/
├── pages/                          # Locators, actions and UI readiness
│   ├── ApplicationPage.ts
│   ├── CommunityNavigation.ts
│   ├── HomePage.ts
│   ├── CategoryPage.ts
│   └── PostPage.ts
├── tests/public-website/           # Exactly four specs; readable business assertions
├── fixtures/test.ts                # Fresh Page Objects and Allure metadata per test
├── support/
│   ├── environment.ts
│   ├── default-environment.json    # Public target, no credentials
│   ├── cases.ts
│   └── test-cases.json             # Portable case definitions, no execution history
├── scripts/
│   ├── run-suite.cjs               # Select cases, enforce scope and record executions
│   ├── project-state.cjs           # Persistent local inventory and approval state
│   ├── package-report.cjs          # Collect results, generate Allure and validate evidence
│   ├── report-view.cjs             # Build result rows, steps and evidence previews
│   ├── report-template.html        # Existing report layout and inline styles
│   ├── open-report.cjs             # Open preserved Playwright or Allure reports
│   └── verify-setup.cjs            # Verify Chromium without visiting the target
├── playwright.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── .prettierrc.json
├── allurerc.json
├── package.json
└── TEST_CASES.md
```

Each test gets a fresh browser context and starts from the configured base URL. Locators and UI actions stay in Page Objects; business expectations appear in the specs. `CommunityNavigation` scopes exact Arabic link names to the verified sidebar, avoiding links repeated elsewhere on the page.

The locators were inspected against the real DOM. Accessible roles are used for headings and links; the search uses its unique `search-bar` ID. The sidebar and post containers lack test IDs, so those components use scoped, inspected CSS structure. No generated classes or XPath are used. The first visible post is selected dynamically; its current title is captured before opening it. Post counts, titles, likes, comments and dates are not fixed test data.

## Installation

Install Node.js 24 LTS, then run from the workspace root:

```bash
cd playwright
npm ci
npx playwright install --with-deps chromium
```

Chromium is the only configured project. No installed Chrome channel, login, credentials or secrets are required. The included `.nvmrc` selects Node 24 when using a compatible version manager. TypeScript 6 is pinned within the supported range of the linting tools.

## Commands

Run these commands from `playwright/`:

| Purpose                                                    | Command                   |
| ---------------------------------------------------------- | ------------------------- |
| Normal run: all four scenarios                             | `npm test`                |
| Headed run                                                 | `npm run test:headed`     |
| Interactive Playwright UI                                  | `npm run test:ui`         |
| Playwright Inspector/debug                                 | `npm run test:debug`      |
| TypeScript check                                           | `npm run typecheck`       |
| Lint                                                       | `npm run lint`            |
| Check formatting                                           | `npm run format:check`    |
| Format project files                                       | `npm run format`          |
| Open latest Playwright HTML report                         | `npm run report`          |
| Generate Allure and standalone HTML from preserved results | `npm run report:generate` |
| Open latest Allure report                                  | `npm run report:allure`   |
| Repackage latest preserved results for sharing             | `npm run report:share`    |

Run one existing case through the runner, for example:

```bash
node scripts/run-suite.cjs --case SA-0003 --platform Web
```

Compatibility aliases `check`, `test:all`, `test:web`, `test:regression`, and `test:community` are preserved. Legacy Smoke and Mobile commands select no cases and return an explicit error rather than creating additional executions.

UI mode is a manual development tool; its runs use Playwright's normal `test-results/current/` output. The tracked runner commands record executions and generate the standalone report automatically. No test depends on a prior test or result.

## Configuration and stability

The default environment is in `support/default-environment.json`; it supplies `https://community.salla.sa/` to `playwright.config.ts`. Tests never repeat the host or open hardcoded post URLs. Category paths are expected navigation outcomes, while post URLs are discovered through UI clicks.

Existing ignored environment files under `../config/environments/` remain supported. `TESTVIBE_ENVIRONMENT` selects a configured environment; an unknown environment fails clearly. A fresh checkout uses the public default and creates only ignored execution state. Existing local approvals, case IDs, history and source results are preserved. The runner restricts production execution to the approved target and four read-only cases.

The configuration and tracked runner share the single reader in `support/environment.ts`. Each caller supplies the workspace root explicitly, so environment lookup does not depend on the terminal's current directory. The runner uses Node.js 24's [built-in TypeScript type stripping](https://nodejs.org/docs/latest-v24.x/api/typescript.html) to load this module without an additional runtime package; this module uses only erasable TypeScript syntax. Playwright continues to load the test files through its own TypeScript support.

The default is headless Chromium at 1280 × 900. Two local workers use isolated contexts; CI uses one worker to limit load on the live website. The test timeout is 60 seconds, action and assertion timeouts are 10 seconds, and navigation timeout is 30 seconds. Retries are disabled locally and limited to one in CI. The runner counts every retry and reduces retries if a case has insufficient remaining execution allowance.

All waits use Playwright auto-waiting, locator assertions or retrying state checks. There are no fixed sleeps or `networkidle` waits. Route and heading readiness are followed by content checks because client-side navigation may update them before posts finish rendering.

The retained project guard allows three complete executions per case, including inspection/rehearsal and CI retries. It preserves counts across local runs and stops when the limit is reached; do not delete history to bypass the guard. Fresh CI jobs start with a new local ledger. Report generation reuses results and does not execute tests.

Missing identified runner results are recorded as execution blockers, separately from missing-requirement blockers. After correcting the runner problem, a case can run again if its approval and remaining execution allowance permit it. Existing execution history is preserved; an unavailable current result never falls back to an older pass.

## Reports and evidence

Tracked runs preserve Playwright HTML, JSON results, Allure raw results, logs and a compact summary under `../.testvibe/runs/<timestamp>/`. A validated, self-contained HTML report is generated under `../.testvibe/reports/combined-<timestamp>/Salla-Community-Live-Web.html`; the runner prints the exact path. Recipients can open that single file without project dependencies or a report server. The latest report manifest is `../.testvibe/latest-playwright-report.json`.

`../.testvibe/latest-playwright-run.json` records the latest completed attempt, including a report-generation error when present. Report-opening commands warn when they are opening a preserved report from before that attempt and show the original execution times and latest summary path. They keep historical reports intact. `npm run report` selects the source run with the newest actual test start time, regardless of the case order in a combined manifest; it opens that run's native Playwright report. The standalone and Allure reports combine the latest preserved result for each case.

Allure includes Feature, Story, Severity, source steps, expected results, Source ID, Automation ID, environment, platform, browser version and execution mode. Named steps and assertions describe the checks performed. Report validation compares case identities, result counts, timestamps, environment and embedded evidence with the original results. For results saved before the approved renumbering, new report copies display the current Automation ID and retain the original ID as `Execution Automation ID`; source files, outcomes, timestamps and artifacts remain unchanged.

The shareable HTML displays saved Allure steps, assertion failures, screenshots and videos directly as ordinary HTML. It does not depend on an embedded application frame or JavaScript to show the evidence. A separate interactive Allure single-file report is available as a download inside the shareable report.

Report packaging has three explicit responsibilities: `package-report.cjs` collects preserved results, generates Allure and validates identities and evidence; `report-view.cjs` renders the saved data; `report-template.html` contains the existing layout and inline CSS. The template uses simple named placeholders and needs no template-engine dependency. This separation preserves the same report design, metadata table, steps, attachments and npm commands.

The original summary layout is preserved. A clearly titled **Metadata — معلومات التشغيل** section displays one row per case, with status, classification, environment, browser version, execution mode, recorded worker count, original start/end times and duration. The steps and evidence remain below the table on the same page. Worker counts come from the source run's Playwright JSON; unavailable metadata is clearly marked instead of using current configuration values. Error-context attachments are labelled as diagnostic evidence from an existing failure, rather than additional test cases.

- Screenshots: only on failure.
- Video: retained only on failure.
- Trace: recorded on the first retry. Local runs have no automatic retries, so a first-attempt local failure has no trace by default.
- Every retry is recorded in the execution ledger; the combined report selects the latest attempt and keeps earlier attempts in the original source run. A failure followed by a pass is identified as flaky in the run summary.

Passed runs still retain useful JSON evidence such as document response statuses and dynamically selected titles. Repackaging uses the latest preserved result per case, preserves its original time, and never replaces a current failure with an older pass. Original older runs remain local. Generated reports and browser evidence are excluded from Git.

## GitHub Actions

The root [Playwright workflow](../.github/workflows/playwright.yml) runs on push and pull requests. One job uses Node.js 24, runs `npm ci`, installs Chromium and system dependencies, checks TypeScript, lint and formatting, then executes the four scenarios. There is no browser matrix that duplicates the test suite. CI may retry a failed case once.

Playwright reports, JSON summaries, failure evidence, Allure results and the standalone HTML report are uploaded with `if: always()`, including failed runs. Artifacts are retained for 14 days. Only generated report locations are uploaded; environment files and the execution inventory are excluded. No credentials or repository secrets are needed. If setup fails before report files exist, artifact upload reports their absence.

## Scope and limitations

These tests cover public, read-only user flows. They do not log in, create posts or comments, or submit likes. Live content can change between requests; tests select current data and compare only what the scenario requires. A site outage, missing public data, layout change or external protection can cause a real failure.

Cloudflare or CAPTCHA may occasionally prevent automation. The existing navigation helper can wait for the site to complete its own automatic verification; it does not solve challenges or alter browser protections. If access remains blocked, the test fails and the actual response evidence is retained. Expected results are never weakened to obtain a pass.

This sample provides four focused public UI checks; it does not claim comprehensive product, accessibility, API, browser or mobile coverage. CI workflow execution must be verified after the workspace is placed in a GitHub repository.

## Latest local verification

On 9 October 2026, 17:44 UTC, the requested Live / Web run used headless Chromium 156.0.8078.4, two workers and no retries. TypeScript, lint and formatting checks passed. Exactly four tests executed: Homepage and Category navigation passed; Post details and Switching categories failed during their initial Help-category navigation.

The captured Post details page showed `حدث خطأ برجاء المحاولة لاحقاً`; Switching categories had no main heading and its screenshot showed a blank page. Neither failure reached the later post-detail or category-switch assertions. The evidence does not establish the underlying service error or a Cloudflare/CAPTCHA cause. Expected results remain intact. Playwright HTML and standalone Allure reports preserve the current two passes and two failures, including failure screenshots and videos. No further executions were attempted after the retained local execution cap was reached.

The workflow was checked locally and fresh-checkout discovery found exactly four tests without private environment or history files. GitHub Actions execution is unverified. The initial publication skips CI to avoid an additional live-site run; the workflow remains configured for future pushes and pull requests.
