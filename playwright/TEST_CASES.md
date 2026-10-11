# Salla Community test cases

Exactly four independent Web scenarios are implemented. Source IDs 1–4 and the original test names are preserved. At the tester's request, the current Community automation IDs are SA-0001–SA-0004; the retired marketing cases are absent from the active catalog. Archived registries and original execution results retain their historical IDs.

Shared preconditions:

- The public [Salla Community](https://community.salla.sa/) website is reachable in Chromium.
- Each test uses a fresh browser context and starts from the configured homepage.
- No login, credentials, post creation, comments or likes are required or submitted.
- Categories used by a case have at least one visible public post. Live content is discovered during execution.
- If external protection prevents access, report the real failure or blocker; do not solve or bypass it.

## SA-0001 — Homepage

**Source ID:** 1  
**Title:** Verify that the homepage displays its heading, search field and primary navigation.

**Preconditions:** Shared preconditions apply; no category or post data is required.

**Steps:**

1. Open the configured homepage.
2. Verify that the page URL is the root path and its browser title and main heading display `مجتمع التجارة الالكترونية`.
3. Verify that the search field is visible and editable.
4. Verify that the sidebar links `الرئيسية`, `ابدأ من هنا`, `أخبار سلة`, and `محتاج فزعتكم` are visible, enabled, unique within the sidebar, and have a non-empty destination.

**Expected result:** The homepage is ready, the expected heading appears, and the search and primary navigation are available.

## SA-0002 — Category navigation

**Source ID:** 2  
**Title:** Verify that selecting Help opens the correct category and displays its posts.

**Preconditions:** Shared preconditions apply; `محتاج فزعتكم` has at least one visible post.

**Steps:**

1. Open the configured homepage.
2. Select `محتاج فزعتكم` in the sidebar.
3. Verify that the path is `/category-detail/need-your-help/13`.
4. Verify that the browser title is `محتاج فزعتكم | مجتمع سلة` and the main heading is `محتاج فزعتكم`.
5. Verify that at least one visible post has a populated title and that the displayed category labels identify Help.

**Expected result:** The Help route, title and posts appear. News previews are absent. No exact post count or title is assumed.

## SA-0003 — Post details

**Source ID:** 3  
**Title:** Verify that opening a visible Help post displays the same title, its content and the comments section.

**Preconditions:** Shared preconditions apply; at least one Help post can be opened publicly.

**Steps:**

1. Open the homepage, then select `محتاج فزعتكم` in the sidebar.
2. Verify that a visible Help post is available.
3. Capture that post's current title and open it through the UI.
4. Verify that the URL has a non-empty path beneath `/detail/`.
5. Verify that the details heading matches the title captured in step 3.
6. Verify that the original post body is visible and non-empty.
7. Verify that the comments section heading is visible without requiring a particular comment count.

**Expected result:** The selected post opens with the same title, populated content and a visible comments section. No comment or other data is submitted.

## SA-0004 — Switching categories

**Source ID:** 4  
**Title:** Verify that switching between Help and Salla News updates the route, heading and post content.

**Preconditions:** Shared preconditions apply; both categories have visible public posts.

**Steps:**

1. Open the homepage and select `محتاج فزعتكم`.
2. Verify its route, browser title, heading and Help-labelled posts; capture the current post titles.
3. Select `أخبار سلة` in the sidebar.
4. Verify the path `/category-detail/salla-news/24`, browser title `أخبار سلة | مجتمع سلة`, and heading `أخبار سلة`.
5. Verify visible News posts with populated titles and descriptions. Verify that Help previews disappear and the rendered title list differs from step 2; capture the News titles.
6. Select `محتاج فزعتكم` again.
7. Verify the Help route, browser title and heading. Verify that Help-labelled posts replace News previews and that the title list differs from step 5.

**Expected result:** Both category switches update the URL, title, heading and content to the selected category. Live lists are compared with each other, without assuming they stay identical over time.

## Traceability and reporting

All four tests use `regression` and `feature-community` tags, Allure Feature `Community`, Severity `normal`, and Stories `Homepage`, `Categories`, or `Posts`. Each report retains both the original Source ID and Automation ID. None is classified as Smoke. Each case can run independently; there are no dependencies between test cases.
