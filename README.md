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

## Capturing again

Requirements: a local bundle on `http://localhost:8080`, the user `test@liferay.com` / `test`, the feature flag `LPD-57922` enabled (Control Panel > Instance Settings > Feature Flags > Beta), and Playwright available to Node (either `npm install playwright` next to the scripts or the copy inside `liferay-portal/modules/node_modules`).

```bash
node capturar.js all              # every team except BPM
node capturar.js commerce         # one team
node bpm/capturar-bpm.js          # BPM
python3 build-gallery.py          # rebuild index.html
```

The scripts log in, set the colour scheme to dark through the same session key the moon/sun toggle uses, visit every screen, and write the screenshots next to an `index.json`. The colour scheme preference is stored per user, so do not run two captures at the same time: the one that finishes first switches the portal back to light for the other.

Screens that need an existing record (an editor, an order detail) are only captured when the local bundle has data; otherwise the step is logged as failed and the gallery skips it.
