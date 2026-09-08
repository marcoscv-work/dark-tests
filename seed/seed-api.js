// Seeds sample data through Liferay REST APIs so the Dark Mode screenshots show populated screens.
// Usage: node seed/seed-api.js [siteFriendlyUrl]   (default: /guest)
// Idempotent: every call checks for an existing record with the same name before creating it.
const BASE = process.env.LR_BASE || 'http://localhost:8080';
const AUTH = 'Basic ' + Buffer.from(process.env.LR_USER || 'test@liferay.com:test').toString('base64');
const SITE_URL = process.argv[2] || '/guest';

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function api(method, path, body, raw = false) {
	const res = await fetch(BASE + path, {
		method,
		headers: {Authorization: AUTH, 'Content-Type': 'application/json', Accept: 'application/json'},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await res.text();
	let json = null;
	try { json = text ? JSON.parse(text) : null; } catch (e) { json = {raw: text.slice(0, 300)}; }
	if (!res.ok) {
		const err = new Error(`${method} ${path} -> ${res.status} ${(json && (json.title || json.message || json.raw)) || ''}`.slice(0, 400));
		err.status = res.status; err.body = json; throw err;
	}
	return raw ? text : json;
}
const get = (p) => api('GET', p);
const post = (p, b) => api('POST', p, b);
const put = (p, b) => api('PUT', p, b);

async function ensure(label, listPath, match, create) {
	try {
		const list = await get(listPath);
		const found = (list.items || []).find(match);
		if (found) { log(`= ${label} already there (${found.id})`); return found; }
	} catch (e) { log(`? ${label}: list failed: ${e.message}`); }
	const created = await create();
	log(`+ ${label} created (${created.id})`);
	return created;
}

(async () => {
	const sites = await get('/o/headless-admin-site/v1.0/sites?pageSize=100');
	const site = sites.items.find((s) => s.friendlyUrlPath === SITE_URL) || sites.items.find((s) => s.friendlyUrlPath === '/guest');
	const siteId = site.id;
	log(`site ${site.name} (${siteId})`);

	// --- Knowledge Base: one folder, three articles ---
	const kbFolder = await ensure('KB folder', `/o/headless-delivery/v1.0/sites/${siteId}/knowledge-base-folders?pageSize=50`, (f) => f.name === 'Dark Mode Handbook', () =>
		post(`/o/headless-delivery/v1.0/sites/${siteId}/knowledge-base-folders`, {name: 'Dark Mode Handbook', description: 'Guidelines for reviewing administration screens in dark mode.'}));
	const kbArticles = [
		['How to enable Dark Mode', 'Open Instance Settings, go to Feature Flags, Beta, and enable Dark and Light Mode (LPD-57922). Refresh the browser and use the moon button in the Product Menu.'],
		['Reporting a visual gap', 'Take a screenshot in light and dark mode, describe the hardcoded colour or custom CSS you suspect, and link the ticket to LPD-93232.'],
		['Tokens instead of hex values', 'Every colour in an administration screen must come from a Clay design token so the value switches with the colour scheme. Hardcoded hex, rgb and hsl values fail the source formatter.'],
	];
	for (const [title, body] of kbArticles) {
		await ensure(`KB article "${title}"`, `/o/headless-delivery/v1.0/knowledge-base-folders/${kbFolder.id}/knowledge-base-articles?pageSize=50`, (a) => a.title === title, () =>
			post(`/o/headless-delivery/v1.0/knowledge-base-folders/${kbFolder.id}/knowledge-base-articles`, {title, articleBody: `<p>${body}</p>`, description: body.slice(0, 80)}));
	}

	// --- Message Boards: a section with two threads ---
	const mbSection = await ensure('MB section', `/o/headless-delivery/v1.0/sites/${siteId}/message-board-sections?pageSize=50`, (s) => s.title === 'Dark Mode Feedback', () =>
		post(`/o/headless-delivery/v1.0/sites/${siteId}/message-board-sections`, {title: 'Dark Mode Feedback', description: 'Questions and findings from the Dark Mode reviews.'}));
	for (const [headline, body] of [['Side panel cards render white in Objects', 'Reproduced in the Fields side panel with the dark scheme active. Fixed in LPD-94032.'], ['Which token replaces #F7F8F9?', 'Use the gray-100 custom property. It resolves to a dark surface when the colour scheme switches.']]) {
		await ensure(`MB thread "${headline}"`, `/o/headless-delivery/v1.0/message-board-sections/${mbSection.id}/message-board-threads?pageSize=50`, (t) => t.headline === headline, () =>
			post(`/o/headless-delivery/v1.0/message-board-sections/${mbSection.id}/message-board-threads`, {headline, articleBody: body}));
	}

	// --- Blogs: two entries ---
	for (const [headline, body] of [['Dark Mode reaches the Control Panel', 'The administration interface now ships with a native dark colour scheme built on Clay tokens. This post walks through what changed and how to give feedback.'], ['Reviewing your application with the dark scheme', 'Most issues are not Dark Mode bugs but hardcoded colours. Here is the checklist we use before opening a ticket.']]) {
		await ensure(`Blog "${headline}"`, `/o/headless-delivery/v1.0/sites/${siteId}/blog-postings?pageSize=50`, (b) => b.headline === headline, () =>
			post(`/o/headless-delivery/v1.0/sites/${siteId}/blog-postings`, {headline, articleBody: `<p>${body}</p>`, alternativeHeadline: 'Platform Experience'}));
	}

	// --- Web content: three basic web contents ---
	for (const title of ['Welcome to the dark side', 'Release notes 2026.Q3', 'Accessibility statement']) {
		await ensure(`Web content "${title}"`, `/o/headless-delivery/v1.0/sites/${siteId}/structured-contents?pageSize=50`, (c) => c.title === title, async () =>
			post(`/o/headless-delivery/v1.0/sites/${siteId}/structured-contents`, {title, contentStructureId: (await basicWebContentStructureId(siteId)), contentFields: [{name: 'content', contentFieldValue: {data: `<p>${title}. Sample content created for the Dark Mode screenshot gallery.</p>`}}]}));
	}

	// --- Documents: two text files ---
	for (const name of ['dark-mode-checklist.txt', 'token-mapping.csv']) {
		await ensure(`Document "${name}"`, `/o/headless-delivery/v1.0/sites/${siteId}/documents?pageSize=50`, (d) => d.title === name, async () => {
			const fd = new FormData();
			fd.append('file', new Blob([`Sample file ${name} for the Dark Mode screenshot gallery.\n`], {type: 'text/plain'}), name);
			fd.append('document', JSON.stringify({title: name, description: 'Sample document'}));
			const res = await fetch(`${BASE}/o/headless-delivery/v1.0/sites/${siteId}/documents`, {method: 'POST', headers: {Authorization: AUTH}, body: fd});
			if (!res.ok) throw new Error(`document ${name} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
			return res.json();
		});
	}

	// --- Picklist ---
	const picklist = await ensure('Picklist "Severity"', '/o/headless-admin-list-type/v1.0/list-type-definitions?pageSize=100', (p) => p.name === 'Severity', () =>
		post('/o/headless-admin-list-type/v1.0/list-type-definitions', {name: 'Severity', name_i18n: {en_US: 'Severity'}, listTypeEntries: ['Blocker', 'Major', 'Minor', 'Cosmetic'].map((n) => ({key: n.toLowerCase(), name: n, name_i18n: {en_US: n}}))}));

	// --- Object definition with entries ---
	let objectDef = await ensure('Object "Dark Mode Issue"', '/o/object-admin/v1.0/object-definitions?pageSize=200', (o) => o.name === 'DarkModeIssue', () =>
		post('/o/object-admin/v1.0/object-definitions', {
			name: 'DarkModeIssue', label: {en_US: 'Dark Mode Issue'}, pluralLabel: {en_US: 'Dark Mode Issues'}, scope: 'company', panelCategoryKey: 'control_panel.object', portlet: true, active: true, enableCategorization: true, enableComments: true,
			titleObjectFieldName: 'summary',
			objectFields: [
				{name: 'summary', label: {en_US: 'Summary'}, DBType: 'String', businessType: 'Text', required: true, indexed: true, indexedAsKeyword: false, indexedLanguageId: ''},
				{name: 'application', label: {en_US: 'Application'}, DBType: 'String', businessType: 'Text', required: false, indexed: true, indexedAsKeyword: true, indexedLanguageId: ''},
				{name: 'severity', label: {en_US: 'Severity'}, DBType: 'String', businessType: 'Picklist', listTypeDefinitionId: picklist.id, required: false, indexed: true, indexedAsKeyword: true, indexedLanguageId: ''},
				{name: 'fixed', label: {en_US: 'Fixed'}, DBType: 'Boolean', businessType: 'Boolean', required: false, indexed: true, indexedAsKeyword: false, indexedLanguageId: ''},
			],
		}));
	if (objectDef.status && objectDef.status.code !== 0) {
		objectDef = await post(`/o/object-admin/v1.0/object-definitions/${objectDef.id}/publish`);
		log('+ object published');
	}
	const entries = [
		['Side panel cards render with a white background', 'Objects', 'major', true],
		['Table row hover makes text unreadable', 'Objects', 'major', true],
		['Model Builder minimap stays white', 'Objects', 'minor', false],
		['Empty state illustration keeps a light circle', 'Clay', 'cosmetic', false],
		['Drag and drop feedback not visible in page editor', 'Page Editor', 'blocker', true],
	];
	try {
		const existing = await get('/o/c/darkmodeissues?pageSize=50');
		for (const [summary, application, severity, fixed] of entries) {
			if ((existing.items || []).some((e) => e.summary === summary)) continue;
			await post('/o/c/darkmodeissues', {summary, application, severity: {key: severity}, fixed});
			log(`+ issue "${summary}"`);
		}
	} catch (e) { log('? object entries: ' + e.message); }

	// --- Notification template ---
	await ensure('Notification template', '/o/notification/v1.0/notification-templates?pageSize=50', (t) => t.name === 'Dark Mode review reminder', () =>
		post('/o/notification/v1.0/notification-templates', {name: 'Dark Mode review reminder', description: 'Sent when a review task is due.', type: 'email', recipientType: 'email', recipients: [{to: {en_US: '[%CURRENT_USER_EMAIL_ADDRESS%]'}, from: 'noreply@liferay.com', fromName: {en_US: 'Platform Experience'}}], subject: {en_US: 'Dark Mode review due for [%APPLICATION%]'}, body: {en_US: '<p>Please review your application with the dark colour scheme enabled and report any visual gap under LPD-93232.</p>'}, editorType: 'richText'}));

	// --- Search Blueprint ---
	await ensure('Search blueprint', '/o/search-experiences-rest/v1.0/sxp-blueprints?pageSize=50', (b) => b.title === 'Boost recent dark mode content', () =>
		post('/o/search-experiences-rest/v1.0/sxp-blueprints', {title: 'Boost recent dark mode content', title_i18n: {en_US: 'Boost recent dark mode content'}, description_i18n: {en_US: 'Sample blueprint for the screenshot gallery.'}, configuration: {advancedConfiguration: {}, aggregationConfiguration: {}, generalConfiguration: {clauseContributorsExcludes: [], clauseContributorsIncludes: [], searchableAssetTypes: []}, highlightConfiguration: {}, parameterConfiguration: {}, queryConfiguration: {applyIndexerClauses: true}, sortConfiguration: {}}, elementInstances: []}));

	// --- Publication ---
	try {
		await ensure('Publication', '/o/change-tracking-rest/v1.0/ct-collections?pageSize=50', (c) => c.name === 'Dark Mode fixes Q3', () =>
			post('/o/change-tracking-rest/v1.0/ct-collections', {name: 'Dark Mode fixes Q3', description: 'Colour token adjustments pending publication.'}));
	} catch (e) { log('? publication: ' + e.message + ' (Publications may be disabled in System Settings)'); }

	log('done');

	async function basicWebContentStructureId(sid) {
		for (const scope of [sid, (await get('/o/headless-admin-site/v1.0/sites?pageSize=100')).items.find((s) => s.friendlyUrlPath === '/global').id]) {
			const structures = await get(`/o/headless-delivery/v1.0/sites/${scope}/content-structures?pageSize=100`);
			const basic = structures.items.find((s) => s.name === 'Basic Web Content') || structures.items[0];
			if (basic) return basic.id;
		}
		throw new Error('no content structure found');
	}
})().catch((e) => { console.error('FAILED', e.message, e.body ? JSON.stringify(e.body).slice(0, 400) : ''); process.exit(1); });
