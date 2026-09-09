// Seeds the CMS itself. CMS assets are Object entries (CMSBasicWebContent, CMSBlog, CMSBasicDocument)
// scoped to a Space, so content created through journal or Documents and Media never shows in the CMS.
// Creates web contents (approved and pending through Single Approver), blogs, documents, and one asset
// with a past review date. Usage: node seed/seed-cms.js
const BASE = process.env.LR_BASE || 'http://localhost:8080';
const CRED = process.env.LR_USER || 'test@liferay.com:test';
const AUTH = 'Basic ' + Buffer.from(CRED).toString('base64');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function api(method, path, body) {
	const res = await fetch(BASE + path, {method, headers: {Authorization: AUTH, 'Content-Type': 'application/json', Accept: 'application/json'}, body: body === undefined ? undefined : JSON.stringify(body)});
	const text = await res.text(); let json = null;
	try { json = text ? JSON.parse(text) : null; } catch (e) { json = {raw: text.slice(0, 300)}; }
	if (!res.ok) { const err = new Error(`${method} ${path} -> ${res.status} ${(json && (json.title || json.message || json.errorDescription || json.raw)) || ''}`.slice(0, 400)); err.body = json; throw err; }
	return json;
}
const get = (p) => api('GET', p);
const post = (p, b) => api('POST', p, b);
async function jsonws(path, params) {
	const res = await fetch(`${BASE}/api/jsonws${path}`, {method: 'POST', headers: {Authorization: AUTH, 'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams(params)});
	const text = await res.text();
	if (!res.ok || /"exception"/.test(text)) throw new Error(`jsonws ${path} -> ${res.status} ${text.slice(0, 200)}`);
	return text ? JSON.parse(text) : null;
}
async function step(name, fn) { try { const r = await fn(); log('+', name, r === undefined ? '' : r); return r; } catch (e) { log('?', name, 'skipped:', e.message.slice(0, 240)); } }
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

(async () => {
	const me = await get('/api/jsonws/user/get-current-user');
	const depot = (await get(`/api/jsonws/group/get-groups/company-id/${me.companyId}/parent-group-id/0/site/false`)).find((g) => /asset-library-/.test(g.friendlyURL));
	if (!depot) { log('? no CMS space found; create one from the CMS home first'); process.exit(0); }
	const scope = depot.groupId;
	log(`space "${depot.nameCurrentValue || depot.name}" (${scope})`);
	const defs = (await get('/o/object-admin/v1.0/object-definitions?pageSize=200')).items;
	const defId = (name) => (defs.find((d) => d.name === name) || {}).id;

	const existing = async (plural) => ((await get(`/o/cms/${plural}/scopes/${scope}?pageSize=100`)).items || []);
	const ensure = async (plural, title, body) => {
		const items = await existing(plural);
		const found = items.find((i) => i.title === title);
		if (found) { log('=', plural, `"${title}" already there`); return found; }
		return step(`${plural} "${title}"`, () => post(`/o/cms/${plural}/scopes/${scope}`, {title, ...body}).then((c) => c));
	};

	// --- approved web contents: make sure no workflow is linked while creating them ---
	const wcDefId = defId('CMSBasicWebContent');
	const linkParams = {externalReferenceCode: '', userId: me.userId, companyId: me.companyId, groupId: scope, className: `com.liferay.object.model.ObjectDefinition#${wcDefId}`, classPK: 0, typePK: 0};
	await step('unlink workflow on Basic Web Content', () => jsonws('/workflowdefinitionlink/update-workflow-definition-link', {...linkParams, workflowDefinitionName: '', workflowDefinitionVersion: 0}).then(() => 'no workflow'));
	const approved = [
		['Dark Mode launch announcement', 'The administration interface now ships with a dark colour scheme built on Clay tokens.', {}],
		['Token migration guide', 'Replace hardcoded hex values with Clay design tokens so components follow the colour scheme.', {}],
		['Accessibility statement', 'Dark Mode meets WCAG 2.2 AA contrast. Light and Dark High Contrast will follow.', {}],
		['Quarterly review: brand colours', 'This article has a review date in the past so it shows up under Overdue Reviews.', {reviewDate: daysAgo(12)}],
		['Summer campaign banner copy', 'This article expired last week so it shows up under Expired Assets.', {expirationDate: daysAgo(7)}],
	];
	for (const [title, text, extra] of approved) {
		await ensure('basic-web-contents', title, {content: `<p>${text}</p>`, ...extra});
	}
	for (const [title, text, subtitle] of [
		['Why the admin went dark', 'Behind the decision to ship Dark Mode for administrators first.', 'Platform Experience notes'],
		['Five hardcoded colours we removed this week', 'A running log of visual gaps closed under LPD-93232.', 'Dark Mode diary'],
	]) {
		await ensure('blogs', title, {content: `<p>${text}</p>`, subtitle});
	}

	// --- documents: reuse files already uploaded to the space through Documents and Media ---
	const dlFiles = (await get(`/o/headless-delivery/v1.0/asset-libraries/${scope}/documents?pageSize=50`)).items || [];
	for (const f of dlFiles.slice(0, 3)) {
		await ensure('basic-documents', f.title, {file: {id: f.id, name: f.fileName || f.title}});
	}

	// --- pending web contents through Single Approver ---
	await step('link Single Approver on Basic Web Content', () => jsonws('/workflowdefinitionlink/update-workflow-definition-link', {...linkParams, workflowDefinitionName: 'Single Approver', workflowDefinitionVersion: 1}).then(() => 'linked'));
	for (const [title, text] of [
		['Pending: Q4 dark mode roadmap', 'Waits for approval so Pending Workflows and the dashboard have data.'],
		['Pending: release notes draft', 'Second article waiting for approval.'],
	]) {
		await ensure('basic-web-contents', title, {content: `<p>${text}</p>`});
	}


	// --- a second user, so "Shared with Me" has something for them ---
	await step('reviewer user + space membership + shared item', async () => {
		let users = (await get('/o/headless-admin-user/v1.0/user-accounts?filter=emailAddress%20eq%20%27reviewer%40liferay.com%27')).items || [];
		let reviewer = users[0];
		if (!reviewer) reviewer = await post('/o/headless-admin-user/v1.0/user-accounts', {alternateName: 'reviewer', emailAddress: 'reviewer@liferay.com', familyName: 'Reviewer', givenName: 'Dark Mode', password: 'Reviewer2026!'});
		const adminRole = (await get('/o/headless-admin-user/v1.0/roles?pageSize=100')).items.find((r) => r.name === 'Administrator');
		await jsonws('/role/add-user-roles', {userId: reviewer.id, roleIds: adminRole.id}).catch(() => {});
		await jsonws('/user/add-group-users', {groupId: scope, userIds: reviewer.id}).catch(() => {});
		const item = (await existing('basic-web-contents')).find((i) => i.title === 'Token migration guide');
		if (item) await api('PUT', `/o/cms/basic-web-contents/${item.id}/collaborators/by-email-address/reviewer@liferay.com`, {type: 'User', actionIds: ['VIEW']});
		return `reviewer ${reviewer.id}`;
	});
	// --- a bulk action task, so the Bulk Action Task Report has a row ---
	await step('bulk action task', async () => {
		const tasks = (await get('/o/cms/bulk-action-tasks/?pageSize=5')).items || [];
		if (tasks.length) return 'already there';
		return (await post('/o/cms/bulk-action-tasks/', {type: 'expire'})).id;
	});

	const all = await existing('basic-web-contents');
	log(`web contents in the space: ${all.length}, statuses: ${[...new Set(all.map((i) => i.status && (i.status.label || i.status)))].join(', ')}`);
	log('done');
})().catch((e) => { console.error('FAILED', e.message, e.body ? JSON.stringify(e.body).slice(0, 300) : ''); process.exit(1); });
