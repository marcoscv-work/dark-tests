#!/bin/bash
# Seeds sample data and recaptures every team. Run from the repository root:
#     bash seed/seed-all.sh
# Requires the portal on http://localhost:8080 with test@liferay.com / test and feature flag LPD-57922 enabled.
set -u
cd "$(dirname "$0")/.."
BASE=${LR_BASE:-http://localhost:8080}
AUTH='test@liferay.com:test'
SITE=${SHOTS_SITE:-masterclass}
log() { echo "$(date +%T) $*"; }

site_exists() { curl --silent --max-time 30 --user "$AUTH" "$BASE/o/headless-admin-site/v1.0/sites?pageSize=100" | python3 -c "import sys,json; print(any(s.get('friendlyUrlPath')=='$1' for s in json.load(sys.stdin).get('items',[])))"; }

# 1. Sample sites (site initializers already deployed in the bundle)
if [ "$(site_exists /masterclass)" != "True" ]; then
	log "creating Masterclass site"
	curl --silent --max-time 900 --user "$AUTH" -H 'Content-Type: application/json' -X POST "$BASE/o/headless-admin-site/v1.0/sites" \
		-d '{"name":"Masterclass","templateKey":"com.liferay.site.initializer.masterclass","templateType":"site-initializer","membershipType":"open"}' -o /dev/null -w 'HTTP %{http_code}\n'
fi
if [ "$(site_exists /minium-full)" != "True" ] && [ "$(site_exists /minium)" != "True" ]; then
	log "creating Minium Full site (commerce demo data, takes several minutes)"
	curl --silent --max-time 1800 --user "$AUTH" -H 'Content-Type: application/json' -X POST "$BASE/o/headless-admin-site/v1.0/sites" \
		-d '{"name":"Minium Full","templateKey":"minium-full-initializer","templateType":"site-initializer","membershipType":"open"}' -o /dev/null -w 'HTTP %{http_code}\n'
fi

# 2. Data through REST APIs (idempotent) on the chosen site and on Guest
node seed/seed-api.js "/$SITE"
node seed/seed-api.js /guest

# 3. CMS space content, pending workflow items and Commerce orders
node seed/seed-space-orders.js
node seed/seed-cms.js

# 4. Data that only the UI can create
node seed/seed-ui.js "/$SITE"

# 5. Screenshots
SHOTS_SITE="$SITE" node capturar.js all
node bpm/capturar-bpm.js

# 6. Gallery
python3 build-gallery.py
log "done. Review the screenshots, then: git add -A && git commit -m 'Recapture with sample data' && git push"
