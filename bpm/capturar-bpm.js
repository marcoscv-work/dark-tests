let pw; try { pw = require('playwright'); } catch (e) { pw = require('/Users/marcoscastro/projects/liferay-portal/modules/node_modules/playwright'); }
const {chromium} = pw;
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8080';
const OUT = process.env.SHOTS_OUT || path.join(process.env.HOME, 'Desktop', 'dark-mode-reviews', 'bpm');
const CP = `${BASE}/group/control_panel/manage?p_p_id=`;
const SITE = `${BASE}/group/guest/~/control_panel/manage?p_p_id=`;

const SCREENS = [
	{id: '01-objects-list', dir: 'objects', file: '01-lista-definiciones', title: 'Objects: definitions list', url: CP + 'com_liferay_object_web_internal_object_definitions_portlet_ObjectDefinitionsPortlet'},
	{id: '02-objects-editor', dir: 'objects', file: '02-editor-definicion', title: 'Objects: definition editor', url: CP + 'com_liferay_object_web_internal_object_definitions_portlet_ObjectDefinitionsPortlet', after: async (page) => {
		await page.locator('.table-list-title a, table tbody tr td a').first().click({timeout: 8000});
		await page.waitForTimeout(2500);
	}},
	{id: '03-objects-model-builder', dir: 'objects', file: '03-model-builder', title: 'Objects: Model Builder', url: CP + 'com_liferay_object_web_internal_object_definitions_portlet_ObjectDefinitionsPortlet', after: async (page) => {
		const mb = page.getByRole('link', {name: /model builder/i}).or(page.getByRole('button', {name: /model builder/i})).or(page.locator('a[href*="model_builder"], a[href*="modelBuilder"]')).first();
		await mb.click({timeout: 8000});
		await page.waitForTimeout(3500);
	}},
	{id: '04-picklists', dir: 'picklists', file: '01-lista', title: 'Picklists', url: CP + 'com_liferay_object_web_internal_list_type_portlet_portlet_ListTypeDefinitionsPortlet'},
	{id: '05-picklist-editor', dir: 'picklists', file: '02-side-panel-edicion', title: 'Picklists: edit side panel', url: CP + 'com_liferay_object_web_internal_list_type_portlet_portlet_ListTypeDefinitionsPortlet', after: async (page) => {
		await page.locator('.table-list-title a, table tbody tr td a').first().click({timeout: 8000});
		await page.waitForTimeout(2500);
	}},
	{id: '06-process-builder', dir: 'workflow', file: '01-process-builder', title: 'Workflow: Process Builder (definitions)', url: CP + 'com_liferay_portal_workflow_web_portlet_ControlPanelWorkflowPortlet'},
	{id: '07-kaleo-designer', dir: 'workflow', file: '02-kaleo-designer-canvas', title: 'Workflow: Kaleo Designer (Single Approver canvas)', url: CP + 'com_liferay_portal_workflow_web_portlet_ControlPanelWorkflowPortlet', after: async (page) => {
		await page.getByRole('link', {name: /single approver/i}).first().click({timeout: 8000});
		await page.waitForTimeout(4000);
	}},
	{id: '08-workflow-metrics', dir: 'workflow', file: '03-metrics', title: 'Workflow Metrics', url: CP + 'com_liferay_portal_workflow_metrics_web_internal_portlet_WorkflowMetricsPortlet'},
	{id: '09-workflow-submissions', dir: 'workflow', file: '04-submissions', title: 'Workflow: Submissions (instances)', url: CP + 'com_liferay_portal_workflow_web_internal_portlet_ControlPanelWorkflowInstancePortlet'},
	{id: '10-instance-tracker', dir: 'workflow', file: '05-instance-tracker', title: 'Workflow: Instance Tracker', url: CP + 'com_liferay_portal_workflow_instance_tracker_web_internal_portlet_WorkflowInstanceTrackerPortlet'},
	{id: '11-site-workflow', dir: 'workflow', file: '06-configuracion-sitio', title: 'Workflow: site configuration', url: SITE + 'com_liferay_portal_workflow_web_internal_portlet_SiteAdministrationWorkflowPortlet'},
	{id: '12-my-workflow-tasks', dir: 'workflow', file: '07-my-workflow-tasks', title: 'My Workflow Tasks', url: `${BASE}/user/test/~/control_panel/manage?p_p_id=com_liferay_portal_workflow_web_internal_portlet_UserWorkflowPortlet`},
	{id: '13-kaleo-forms', dir: 'workflow', file: '08-kaleo-forms-admin', title: 'Kaleo Forms Admin', url: SITE + 'com_liferay_portal_workflow_kaleo_forms_web_portlet_KaleoFormsAdminPortlet'},
	{id: '14-forms-list', dir: 'forms', file: '01-lista', title: 'Forms: list', url: SITE + 'com_liferay_dynamic_data_mapping_form_web_portlet_DDMFormAdminPortlet'},
	{id: '15-forms-builder', dir: 'forms', file: '02-builder', title: 'Forms: builder', url: SITE + 'com_liferay_dynamic_data_mapping_form_web_portlet_DDMFormAdminPortlet', after: async (page) => {
		const first = page.locator('.table-list-title a, table tbody tr td a, .card-title a').first();
		if (await first.count()) {
			await first.click({timeout: 8000});
		}
		else {
			await page.getByRole('button', {name: /new form/i}).or(page.getByRole('link', {name: /new form/i})).first().click({timeout: 8000});
		}
		await page.waitForTimeout(5000);
	}},
	{id: '16-ddl', dir: 'dynamic-data-lists', file: '01-lista', title: 'Dynamic Data Lists', url: SITE + 'com_liferay_dynamic_data_lists_web_portlet_DDLPortlet'},
	{id: '17-ddm', dir: 'ddm-data-providers', file: '01-lista', title: 'DDM: Data Providers / structures', url: SITE + 'com_liferay_dynamic_data_mapping_web_portlet_DDMPortlet'},
	{id: '18-notification-templates', dir: 'notification-templates', file: '01-lista', title: 'Notification Templates', url: CP + 'com_liferay_notification_web_internal_portlet_NotificationTemplatesPortlet'},
	{id: '19-digital-signature', dir: 'digital-signature', file: '01-lista', title: 'Digital Signature', url: CP + 'com_liferay_digital_signature_web_internal_portlet_DigitalSignaturePortlet'},
];

(async () => {
	fs.mkdirSync(OUT, {recursive: true});
	const browser = await chromium.launch();
	const context = await browser.newContext({viewport: {width: 1440, height: 1000}, colorScheme: 'dark'});
	const page = await context.newPage();
	const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

	await page.goto(`${BASE}/c/portal/login`, {waitUntil: 'load'});
	await page.locator('input[name$="_login"]').fill('test@liferay.com');
	await page.locator('input[name$="_password"]').fill('test');
	await page.locator('input[name$="_password"]').press('Enter');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	const signedIn = await page.evaluate(() => !!(window.Liferay && Liferay.ThemeDisplay && Liferay.ThemeDisplay.isSignedIn()));
	if (!signedIn) { console.error('LOGIN FAILED at', page.url()); await page.screenshot({path: path.join(OUT, '00-login-failed.jpg'), type: 'jpeg'}); process.exit(2); }
	if (/terms_of_use/.test(page.url())) {
		await page.getByRole('button', {name: /agree/i}).click();
		await page.waitForLoadState('load');
	}
	log('logged in at', page.url());

	await page.goto(`${BASE}/group/control_panel`, {waitUntil: 'load'});
	const ffBefore = await page.evaluate(() => Liferay.FeatureFlags && Liferay.FeatureFlags['LPD-57922']);
	log('FF LPD-57922 before:', ffBefore);
	if (!ffBefore) {
		const res = await page.evaluate(async () => {
			const fd = new FormData();
			fd.append('key', 'LPD-57922');
			fd.append('enabled', 'true');
			fd.append('p_auth', Liferay.authToken);
			const r = await fetch('/o/com-liferay-feature-flag-web/set-enabled', {method: 'POST', body: fd});
			return r.status + ' ' + (await r.text()).slice(0, 200);
		});
		log('set-enabled ->', res);
		await page.reload({waitUntil: 'load'});
		log('FF after:', await page.evaluate(() => Liferay.FeatureFlags['LPD-57922']));
	}

	const setScheme = async (scheme) => {
		await page.evaluate((s) => Liferay.Util.Session.set('com_liferay_application_list_taglib_SideNavigationColorScheme', s), scheme);
		await page.waitForTimeout(500);
	};
	await setScheme('dark');
	await page.reload({waitUntil: 'load'});
	log('html data-color-scheme:', await page.evaluate(() => document.documentElement.dataset.colorScheme));

	const results = [];
	for (const s of SCREENS) {
		const r = {id: s.id, title: s.title, url: s.url, ok: false, note: ''};
		try {
			await page.goto(s.url, {waitUntil: 'load', timeout: 60000});
			await page.waitForTimeout(2500);
			if (s.after) {
				try { await s.after(page); } catch (e) { r.note = 'paso extra falló: ' + e.message.split('\n')[0]; }
			}
			r.scheme = await page.evaluate(() => document.documentElement.dataset.colorScheme);
			r.pageTitle = await page.title();
			const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400));
			if (/not available|no está disponible|no disponible|Portlet is temporarily unavailable/i.test(bodyText)) r.note += ' portlet no disponible;';
			fs.mkdirSync(path.join(OUT, s.dir), {recursive: true});
			const file = path.join(OUT, s.dir, `${s.file}.jpg`);
			await page.screenshot({path: file, type: 'jpeg', quality: 78});
			r.file = file; r.ok = true;
		}
		catch (e) { r.note += ' ERROR ' + e.message.split('\n')[0]; }
		log(s.id, r.ok ? 'ok' : 'FAIL', r.scheme || '', r.note);
		results.push(r);
	}
	await setScheme('light');
	fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(results.map((r) => ({...r, file: r.file && path.relative(OUT, r.file)})), null, 2));
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
