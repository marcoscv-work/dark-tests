// Seeds the sample data that has no REST API, driving the UI with Playwright:
// a published form, a synonym set, a result ranking, and Single Approver workflow on Blogs
// (so Submissions, My Workflow Tasks and the Instance Tracker have something to show).
// Usage: node seed/seed-ui.js [siteFriendlyUrl]   (default: /guest)
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/Users/marcoscastro/projects/liferay-portal/modules/node_modules/playwright'); }
const {chromium} = pw;

const BASE = process.env.LR_BASE || 'http://localhost:8080';
const SITE_URL = (process.argv[2] || '/guest').replace(/^\//, '');
const CP = `${BASE}/group/control_panel/manage?p_p_id=`;
const SITE = `${BASE}/group/${SITE_URL}/~/control_panel/manage?p_p_id=`;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function step(name, fn) {
	try { await fn(); log('+', name); }
	catch (e) { log('?', name, 'skipped:', e.message.split('\n')[0].slice(0, 160)); }
}

(async () => {
	const browser = await chromium.launch();
	const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
	const page = await context.newPage();
	page.setDefaultTimeout(15000);

	await page.goto(`${BASE}/c/portal/login`, {waitUntil: 'load'});
	await page.locator('input[name$="_login"]').fill('test@liferay.com');
	await page.locator('input[name$="_password"]').fill('test');
	await Promise.all([page.waitForNavigation({waitUntil: 'load', timeout: 30000}).catch(() => {}), page.locator('input[name$="_password"]').press('Enter')]);
	await page.waitForLoadState('load');
	await page.waitForTimeout(3000);
	await page.goto(`${BASE}/web/guest/home`, {waitUntil: 'load'});
	if (!(await page.evaluate(() => !!(window.Liferay && Liferay.ThemeDisplay && Liferay.ThemeDisplay.isSignedIn())))) { console.error('LOGIN FAILED'); process.exit(2); }
	log('logged in');

	// --- Forms: one published form with a few fields ---
	await step('Form "Dark Mode review report"', async () => {
		await page.goto(SITE + 'com_liferay_dynamic_data_mapping_form_web_portlet_DDMFormAdminPortlet', {waitUntil: 'load'});
		await page.waitForTimeout(2500);
		if (await page.getByText('Dark Mode review report').count()) throw new Error('already there');
		await page.getByRole('button', {name: /new form/i}).or(page.getByRole('button', {name: /^new$/i})).or(page.getByRole('link', {name: /new form/i})).first().click();
		await page.waitForTimeout(5000);
		const title = page.locator('.ddm-form-name, input[placeholder*="Untitled"], [data-testid="formName"], .form-name').first();
		await title.click();
		await page.keyboard.type('Dark Mode review report');
		for (const field of ['Text', 'Select from List', 'Single Selection', 'Date']) {
			const item = page.locator('.ddm-drag-item, .field-type-item, [data-field-type-name]').filter({hasText: new RegExp(`^${field}`)}).first();
			await item.click({timeout: 8000}).catch(async () => { await page.getByText(field, {exact: true}).first().click(); });
			await page.waitForTimeout(1200);
			await page.keyboard.press('Escape');
			await page.waitForTimeout(400);
		}
		await page.getByRole('button', {name: /^publish$/i}).first().click();
		await page.waitForTimeout(4000);
	});

	// --- Synonyms ---
	await step('Synonym set', async () => {
		await page.goto(CP + 'com_liferay_portal_search_tuning_synonyms_web_internal_portlet_SynonymsPortlet', {waitUntil: 'load'});
		await page.waitForTimeout(2500);
		if (await page.getByText('dark mode').count()) throw new Error('already there');
		await page.getByRole('button', {name: /^new$|new synonym/i}).or(page.getByRole('link', {name: /^new$|new synonym/i})).first().click();
		await page.waitForTimeout(3000);
		const input = page.locator('textarea, input[type="text"]').filter({hasNot: page.locator('[type="search"]')}).first();
		await input.click();
		await page.keyboard.type('dark mode, dark theme, night mode, dark scheme');
		await page.keyboard.press('Enter');
		await page.getByRole('button', {name: /^(save|publish)$/i}).first().click();
		await page.waitForTimeout(3000);
	});

	// --- Result ranking for "dark mode" ---
	await step('Result ranking', async () => {
		await page.goto(CP + 'com_liferay_portal_search_tuning_rankings_web_internal_portlet_ResultRankingsPortlet', {waitUntil: 'load'});
		await page.waitForTimeout(2500);
		if (await page.getByText('dark mode', {exact: false}).count() > 1) throw new Error('already there');
		await page.getByRole('button', {name: /^new$|add/i}).or(page.getByRole('link', {name: /^new$|add/i})).first().click();
		await page.waitForTimeout(3000);
		const q = page.locator('input[type="text"], input[type="search"]').first();
		await q.fill('dark mode');
		await q.press('Enter');
		await page.waitForTimeout(3000);
		await page.getByRole('button', {name: /^(add|save)$/i}).first().click();
		await page.waitForTimeout(4000);
		const save = page.getByRole('button', {name: /^(save|publish)$/i}).first();
		if (await save.count()) { await save.click(); await page.waitForTimeout(3000); }
	});

	// --- Single Approver workflow on Blogs, then a blog entry that stays pending ---
	await step('Single Approver on Blogs Entry', async () => {
		await page.goto(SITE + 'com_liferay_portal_workflow_web_internal_portlet_SiteAdministrationWorkflowPortlet', {waitUntil: 'load'});
		await page.waitForTimeout(2500);
		const row = page.locator('tr').filter({hasText: /blogs entry/i}).first();
		const select = row.locator('select').first();
		if (!(await select.count())) throw new Error('no select for Blogs Entry');
		await select.selectOption({label: 'Single Approver'});
		await page.waitForTimeout(3000);
	});
	await step('Pending blog entry', async () => {
		const res = await page.request.post(`${BASE}/o/headless-delivery/v1.0/sites/${await siteId()}/blog-postings`, {
			headers: {Authorization: 'Basic ' + Buffer.from('test@liferay.com:test').toString('base64'), 'Content-Type': 'application/json'},
			data: {headline: 'Pending: Dark Mode rollout plan', articleBody: '<p>This entry goes through Single Approver so the workflow screens have an open instance.</p>'},
		});
		if (!res.ok()) throw new Error(`blog posting -> ${res.status()}`);
	});

	await browser.close();
	log('done');

	async function siteId() {
		const r = await page.request.get(`${BASE}/o/headless-admin-site/v1.0/sites?pageSize=100`, {headers: {Authorization: 'Basic ' + Buffer.from('test@liferay.com:test').toString('base64')}});
		const j = await r.json();
		return (j.items.find((s) => s.friendlyUrlPath === '/' + SITE_URL) || j.items.find((s) => s.friendlyUrlPath === '/guest')).id;
	}
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
