# Dark Mode Screens

Screenshots of the Liferay DXP administration interface captured with the Dark Mode colour scheme active (feature flag `LPD-57922`), organised by product team and application. The gallery makes visual gaps stand out at thumbnail size: white blocks, low-contrast text, light-only illustrations.

Gallery: https://marcoscv-work.github.io/dark-tests/

## Layout

```
index.html                  gallery (thumbnails, viewer with 1:1 zoom, keyboard navigation)
build-gallery.py            rebuilds index.html from the index.json files
capturar.js                 Playwright capture script for search, site-management, page-management, content-management, commerce
bpm/capturar-bpm.js         Playwright capture script for BPM
<team>/index.json           one entry per screenshot: title, local URL, colour scheme, notes
<team>/<application>/*.jpg  screenshots, 1440x1000, dark scheme
```

Teams map to the Dark Mode review tasks under epic [LPD-93232](https://liferay.atlassian.net/browse/LPD-93232): BPM ([LPD-105050](https://liferay.atlassian.net/browse/LPD-105050)), Content Management ([LPD-105038](https://liferay.atlassian.net/browse/LPD-105038)), Page Management ([LPD-105037](https://liferay.atlassian.net/browse/LPD-105037)), Commerce ([LPD-105042](https://liferay.atlassian.net/browse/LPD-105042)), Search ([LPD-104000](https://liferay.atlassian.net/browse/LPD-104000)), Site Management ([LPD-103839](https://liferay.atlassian.net/browse/LPD-103839)).

## Sample data

Empty screens hide most dark mode issues, so the capture runs against seeded data:

- Sample sites created from the site initializers that ship in the bundle: **Masterclass** (web content, blogs, documents, pages, navigation menus, fragments, collections) and **Minium Full** (catalog, products, price lists, promotions, inventory, channel, accounts and orders).
- Demo modules from the repository deployed into `osgi/portal`: `users-admin-demo` and `portal-workflow-metrics-demo` with their `*-demo-data-creator` dependencies. Do **not** deploy `message-boards-demo`: it inserts thousands of messages inside a single transaction and blocks the portal for an hour on Hypersonic.
- `seed/seed-api.js`: Knowledge Base, Message Boards, blogs, web content, documents, a picklist, an object with entries, a notification template, a search blueprint and a publication, through REST APIs. Idempotent.
- `seed/seed-ui.js`: a published form, a synonym set, a result ranking and Single Approver on Blogs, driven through the UI with Playwright.

`bash seed/seed-all.sh` runs everything above and then recaptures every team.

## Capturing again

Requirements: a local bundle on `http://localhost:8080`, the user `test@liferay.com` / `test`, the feature flag `LPD-57922` enabled (Control Panel > Instance Settings > Feature Flags > Beta), and Playwright available to Node (either `npm install playwright` next to the scripts or the copy inside `liferay-portal/modules/node_modules`).

```bash
SHOTS_SITE=masterclass node capturar.js all   # every team except BPM; SHOTS_SITE picks the site for site-scoped screens
node capturar.js commerce         # one team
node bpm/capturar-bpm.js          # BPM
python3 build-gallery.py          # rebuild index.html
```

The scripts log in, set the colour scheme to dark through the same session key the moon/sun toggle uses, visit every screen, and write the screenshots next to an `index.json`. The colour scheme preference is stored per user, so do not run two captures at the same time: the one that finishes first switches the portal back to light for the other.

Screens that need an existing record (an editor, an order detail) are only captured when the local bundle has data; otherwise the step is logged as failed and the gallery skips it.
