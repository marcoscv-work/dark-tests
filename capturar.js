// Captures Liferay administration screens in dark mode, per team.
// Usage: node capturar.js <team|all>   (teams: search, site-management, page-management, content-management, commerce)
// Requires a local bundle on http://localhost:8080 with test@liferay.com / test and feature flag LPD-57922 enabled.
// SHOTS_SITE=<friendly url> picks the site used for site-scoped screens (default guest).
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/Users/marcoscastro/projects/liferay-portal/modules/node_modules/playwright'); }
const {chromium} = pw;
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8080';
const ROOT = process.env.SHOTS_OUT || path.join(process.env.HOME, 'Desktop', 'dark-mode-reviews');
const CP = `${BASE}/group/control_panel/manage?p_p_id=`;
const SITE_KEY = (process.env.SHOTS_SITE || 'guest').replace(/^\//, '');
const SITE = `${BASE}/group/${SITE_KEY}/~/control_panel/manage?p_p_id=`;
const SITE_HOME = `${BASE}/web/${SITE_KEY}`;
const CMS_SITE = `${BASE}/web/cms`;

const clickFirstRow = async (page) => {
	await page.locator('.table-list-title a, table tbody tr td a, .card-title a, .list-group-title a').first().click({timeout: 8000});
	await page.waitForTimeout(3500);
};
const clickText = (re, wait = 3500) => async (page) => {
	await page.getByRole('link', {name: re}).or(page.getByRole('button', {name: re})).first().click({timeout: 8000});
	await page.waitForTimeout(wait);
};

const TEAMS = {
	'search': [
		{dir: 'search-admin', file: '01-search-admin', title: 'Search Admin', url: CP + 'com_liferay_portal_search_admin_web_portlet_SearchAdminPortlet'},
		{dir: 'search-admin', file: '02-search-admin-field-mappings', title: 'Search Admin: Field Mappings', url: CP + 'com_liferay_portal_search_admin_web_portlet_SearchAdminPortlet', after: clickText(/field mappings/i)},
		{dir: 'blueprints', file: '01-lista', title: 'Search Blueprints', url: CP + 'com_liferay_search_experiences_web_internal_blueprint_admin_portlet_SXPBlueprintAdminPortlet'},
		{dir: 'blueprints', file: '02-editor', title: 'Search Blueprints: editor', url: CP + 'com_liferay_search_experiences_web_internal_blueprint_admin_portlet_SXPBlueprintAdminPortlet', after: clickFirstRow},
		{dir: 'blueprints', file: '03-elements', title: 'Search Blueprints: Elements', url: CP + 'com_liferay_search_experiences_web_internal_blueprint_admin_portlet_SXPBlueprintAdminPortlet', after: clickText(/^elements$/i)},
		{dir: 'synonyms', file: '01-lista', title: 'Synonyms', url: CP + 'com_liferay_portal_search_tuning_synonyms_web_internal_portlet_SynonymsPortlet'},
		{dir: 'result-rankings', file: '01-lista', title: 'Result Rankings', url: CP + 'com_liferay_portal_search_tuning_rankings_web_internal_portlet_ResultRankingsPortlet'},
		{dir: 'result-rankings', file: '02-editor', title: 'Result Rankings: editor', url: CP + 'com_liferay_portal_search_tuning_rankings_web_internal_portlet_ResultRankingsPortlet', after: async (page) => { await page.locator('table a, .list-group a, a[href*="rankings"]').filter({hasText: /dark mode/i}).first().click({timeout: 8000}); await page.waitForTimeout(4000); }},
		{dir: 'collections', file: '01-lista', title: 'Collections', url: SITE + 'com_liferay_asset_list_web_portlet_AssetListPortlet'},
		{dir: 'collections', file: '02-editor', title: 'Collections: editor', url: SITE + 'com_liferay_asset_list_web_portlet_AssetListPortlet', after: clickFirstRow},
		{dir: 'search-page', file: '01-resultados', title: 'Site search page (widgets)', url: `${SITE_HOME}/search?q=dark`},
	],
	'site-management': [
		{dir: 'sites', file: '01-lista', title: 'Sites', url: CP + 'com_liferay_site_admin_web_portlet_SiteAdminPortlet'},
		{dir: 'sites', file: '02-site-settings', title: 'Site Settings', url: SITE + 'com_liferay_site_admin_web_portlet_SiteSettingsPortlet'},
		{dir: 'sites', file: '03-site-templates', title: 'Site Templates', url: CP + 'com_liferay_site_admin_web_portlet_SiteTemplatesPortlet'},
		{dir: 'navigation-menus', file: '01-lista', title: 'Navigation Menus', url: SITE + 'com_liferay_site_navigation_admin_web_portlet_SiteNavigationAdminPortlet'},
		{dir: 'navigation-menus', file: '02-editor', title: 'Navigation Menus: editor', url: SITE + 'com_liferay_site_navigation_admin_web_portlet_SiteNavigationAdminPortlet', after: clickFirstRow},
		{dir: 'publications', file: '01-lista', title: 'Publications', url: CP + 'com_liferay_change_tracking_web_portlet_PublicationsPortlet'},
		{dir: 'export-import', file: '01-export', title: 'Export / Import', url: SITE + 'com_liferay_exportimport_web_portlet_ExportImportPortlet'},
		{dir: 'staging', file: '01-staging', title: 'Staging', url: SITE + 'com_liferay_staging_processes_web_portlet_StagingProcessesPortlet'},
	],
	'page-management': [
		{dir: 'pages', file: '01-arbol-paginas', title: 'Pages: page tree', url: SITE + 'com_liferay_layout_admin_web_portlet_GroupPagesPortlet'},
		{dir: 'pages', file: '02-configuracion-pagina', title: 'Pages: page configuration', url: SITE + 'com_liferay_layout_admin_web_portlet_GroupPagesPortlet', after: clickFirstRow},
		{dir: 'page-editor', file: '01-editor', title: 'Page Editor', url: `${SITE_HOME}/home?p_l_mode=edit`, wait: 6000},
		{dir: 'page-editor', file: '02-editor-widgets-panel', title: 'Page Editor: Widgets tab', url: `${SITE_HOME}/home?p_l_mode=edit`, wait: 6000, after: async (page) => {
			await page.getByRole('button', {name: /^widgets$/i}).first().click({timeout: 8000});
			await page.waitForTimeout(2500);
		}},
		{dir: 'page-templates', file: '01-lista', title: 'Page Templates', url: SITE + 'com_liferay_layout_page_template_admin_web_portlet_LayoutPageTemplatesPortlet'},
		{dir: 'page-templates', file: '02-master-pages', title: 'Page Templates: Master Pages', url: SITE + 'com_liferay_layout_page_template_admin_web_portlet_LayoutPageTemplatesPortlet', after: clickText(/^masters$/i)},
		{dir: 'page-templates', file: '03-display-page-templates', title: 'Page Templates: Display Page Templates', url: SITE + 'com_liferay_layout_page_template_admin_web_portlet_LayoutPageTemplatesPortlet', after: clickText(/display page templates/i)},
		{dir: 'fragments', file: '01-lista', title: 'Fragments', url: SITE + 'com_liferay_fragment_web_portlet_FragmentPortlet'},
		{dir: 'fragments', file: '02-editor', title: 'Fragments: editor', url: SITE + 'com_liferay_fragment_web_portlet_FragmentPortlet', after: clickFirstRow},
	],
	'content-management': [
		{dir: 'cms', file: '01-home', title: 'CMS: Home', url: CMS_SITE + '/home', wait: 6000},
		{dir: 'cms', file: '02-dashboard', title: 'CMS: Dashboard', url: CMS_SITE + '/dashboard', wait: 6000},
		{dir: 'cms', file: '03-shared-with-me', title: 'CMS: Shared with Me (as reviewer)', url: CMS_SITE + '/shared-with-me', wait: 6000, as: 'reviewer'},
		{dir: 'cms', file: '04-all', title: 'CMS: All', url: CMS_SITE + '/all', wait: 6000},
		{dir: 'cms', file: '05-contents', title: 'CMS: Contents', url: CMS_SITE + '/contents', wait: 6000},
		{dir: 'cms', file: '06-files', title: 'CMS: Files', url: CMS_SITE + '/files', wait: 6000},
		{dir: 'cms', file: '07-recycle-bin', title: 'CMS: Recycle Bin', url: CMS_SITE + '/recycle-bin', wait: 6000},
		{dir: 'cms', file: '08-all-spaces', title: 'CMS: All Spaces', url: CMS_SITE + '/all-spaces', wait: 6000},
		{dir: 'cms', file: '09-new-space', title: 'CMS: New Space', url: CMS_SITE + '/new-space', wait: 6000},
		{dir: 'cms', file: '10-export-import', title: 'CMS: Export / Import', url: CMS_SITE + '/export-import', wait: 6000},
		{dir: 'cms', file: '11-overdue-reviews', title: 'CMS: Overdue Reviews', url: CMS_SITE + '/overdue-reviews', wait: 6000},
		{dir: 'cms', file: '12-pending-workflows', title: 'CMS: Pending Workflows', url: CMS_SITE + '/pending-workflows', wait: 6000},
		{dir: 'cms', file: '13-broken-links', title: 'CMS: Broken Links', url: CMS_SITE + '/broken-links', wait: 6000},
		{dir: 'cms', file: '14-bulk-action-task-report', title: 'CMS: Bulk Action Task Report', url: CMS_SITE + '/bulk-action-task-report', wait: 6000},
		{dir: 'web-content', file: '01-lista', title: 'Web Content', url: SITE + 'com_liferay_journal_web_portlet_JournalPortlet'},
		{dir: 'web-content', file: '02-editor', title: 'Web Content: editor', url: SITE + 'com_liferay_journal_web_portlet_JournalPortlet', after: async (page) => { await page.locator('a[title="Accessibility statement"], a[title="Welcome to the dark side"]').first().click({timeout: 8000}); await page.waitForTimeout(5000); }},
		{dir: 'web-content', file: '03-structures', title: 'Web Content: Structures', url: SITE + 'com_liferay_journal_web_portlet_JournalPortlet', after: clickText(/^structures$/i)},
		{dir: 'web-content', file: '04-templates', title: 'Web Content: Templates', url: SITE + 'com_liferay_journal_web_portlet_JournalPortlet', after: clickText(/^templates$/i)},
		{dir: 'blogs', file: '01-lista', title: 'Blogs', url: SITE + 'com_liferay_blogs_web_portlet_BlogsAdminPortlet'},
		{dir: 'blogs', file: '02-editor', title: 'Blogs: editor', url: SITE + 'com_liferay_blogs_web_portlet_BlogsAdminPortlet', after: clickText(/^new$|add blog entry/i, 5000)},
		{dir: 'documents-and-media', file: '01-lista', title: 'Documents and Media', url: SITE + 'com_liferay_document_library_web_portlet_DLAdminPortlet'},
		{dir: 'documents-and-media', file: '02-detalle', title: 'Documents and Media: detail / preview', url: SITE + 'com_liferay_document_library_web_portlet_DLAdminPortlet', after: clickFirstRow},
		{dir: 'knowledge-base', file: '01-lista', title: 'Knowledge Base', url: SITE + 'com_liferay_knowledge_base_web_portlet_AdminPortlet'},
		{dir: 'message-boards', file: '01-lista', title: 'Message Boards', url: SITE + 'com_liferay_message_boards_web_portlet_MBAdminPortlet'},
		{dir: 'message-boards', file: '02-statistics', title: 'Message Boards: Statistics', url: SITE + 'com_liferay_message_boards_web_portlet_MBAdminPortlet', after: clickText(/statistics/i)},
	],
	'commerce': [
		{dir: 'catalogs', file: '01-lista', title: 'Catalogs', url: CP + 'com_liferay_commerce_catalog_web_internal_portlet_CommerceCatalogsPortlet'},
		{dir: 'products', file: '01-lista', title: 'Products', url: CP + 'com_liferay_commerce_product_definitions_web_internal_portlet_CPDefinitionsPortlet'},
		{dir: 'products', file: '02-editor', title: 'Products: editor', url: CP + 'com_liferay_commerce_product_definitions_web_internal_portlet_CPDefinitionsPortlet', after: clickFirstRow},
		{dir: 'pricing', file: '01-price-lists', title: 'Price Lists', url: CP + 'com_liferay_commerce_pricing_web_internal_portlet_CommercePriceListPortlet'},
		{dir: 'pricing', file: '02-promotions', title: 'Promotions', url: CP + 'com_liferay_commerce_pricing_web_internal_portlet_CommercePromotionPortlet'},
		{dir: 'pricing', file: '03-discounts', title: 'Discounts', url: CP + 'com_liferay_commerce_pricing_web_internal_portlet_CommerceDiscountPortlet'},
		{dir: 'inventory', file: '01-inventory', title: 'Inventory', url: CP + 'com_liferay_commerce_inventory_web_internal_portlet_CommerceInventoryPortlet'},
		{dir: 'orders', file: '01-orders', title: 'Orders', url: CP + 'com_liferay_commerce_order_web_internal_portlet_CommerceOrderPortlet'},
		{dir: 'orders', file: '02-order-detail', title: 'Orders: detail', url: CP + 'com_liferay_commerce_order_web_internal_portlet_CommerceOrderPortlet', after: clickFirstRow},
		{dir: 'orders', file: '03-returns', title: 'Returns', url: CP + 'com_liferay_commerce_order_web_internal_portlet_CommerceReturnPortlet'},
		{dir: 'orders', file: '04-shipments', title: 'Shipments', url: CP + 'com_liferay_commerce_shipment_web_internal_portlet_CommerceShipmentPortlet'},
		{dir: 'orders', file: '05-payments', title: 'Payments', url: CP + 'com_liferay_commerce_payment_web_internal_portlet_CommercePaymentPortlet'},
		{dir: 'channels', file: '01-lista', title: 'Channels', url: CP + 'com_liferay_commerce_channel_web_internal_portlet_CommerceChannelsPortlet'},
		{dir: 'channels', file: '02-editor', title: 'Channels: editor', url: CP + 'com_liferay_commerce_channel_web_internal_portlet_CommerceChannelsPortlet', after: clickFirstRow},
		{dir: 'organizations', file: '01-organizations', title: 'Organizations (Commerce)', url: CP + 'com_liferay_commerce_organization_web_internal_portlet_CommerceOrganizationPortlet'},
	],
};

(async () => {
	const arg = process.argv[2] || 'all';
	const teams = arg === 'all' ? Object.keys(TEAMS) : [arg];
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
	if (!signedIn) { console.error('LOGIN FAILED at', page.url()); process.exit(2); }
	log('logged in');
	const ff = await page.evaluate(() => Liferay.FeatureFlags && Liferay.FeatureFlags['LPD-57922']);
	if (!ff) { console.error('El flag LPD-57922 no está activo; actívalo en Instance Settings > Feature Flags > Beta'); process.exit(3); }
	const setScheme = async (s, p = page) => { await p.evaluate((v) => Liferay.Util.Session.set('com_liferay_application_list_taglib_SideNavigationColorScheme', v), s); await p.waitForTimeout(500); };
	await setScheme('dark');
	let reviewerPage = null;
	const getReviewerPage = async () => {
		if (reviewerPage) return reviewerPage;
		const ctx = await browser.newContext({viewport: {width: 1440, height: 1000}, colorScheme: 'dark'});
		const p = await ctx.newPage();
		await p.goto(`${BASE}/c/portal/login`, {waitUntil: 'load'});
		await p.locator('input[name$="_login"]').fill(process.env.SHOTS_REVIEWER_USER || 'reviewer@liferay.com');
		await p.locator('input[name$="_password"]').fill(process.env.SHOTS_REVIEWER_PASSWORD || 'Reviewer2026!');
		await Promise.all([p.waitForNavigation({waitUntil: 'load', timeout: 30000}).catch(() => {}), p.locator('input[name$="_password"]').press('Enter')]);
		await p.waitForTimeout(2500);
		await p.goto(`${BASE}/web/guest/home`, {waitUntil: 'load'});
		await setScheme('dark', p);
		reviewerPage = p;
		return p;
	};

	for (const team of teams) {
		const OUT = path.join(ROOT, team);
		const results = [];
		for (const s of TEAMS[team]) {
			const r = {dir: s.dir, file: s.file + '.jpg', title: s.title, url: s.url, ok: false, note: ''};
			const pg = s.as === 'reviewer' ? await getReviewerPage() : page;
			try {
				await pg.goto(s.url, {waitUntil: 'load', timeout: 60000});
				await pg.waitForTimeout(s.wait || 2500);
				if (s.after) { try { await s.after(pg); } catch (e) { r.note = 'paso extra falló: ' + e.message.split('\n')[0]; } }
				r.scheme = await pg.evaluate(() => document.documentElement.dataset.colorScheme);
				const bodyText = await pg.evaluate(() => document.body.innerText.slice(0, 600));
				if (/not available|no está disponible|temporarily unavailable|Page Not Found|404/i.test(bodyText)) r.note += ' pantalla no disponible;';
				fs.mkdirSync(path.join(OUT, s.dir), {recursive: true});
				await pg.screenshot({path: path.join(OUT, s.dir, r.file), type: 'jpeg', quality: 78});
				r.ok = true;
			}
			catch (e) { r.note += ' ERROR ' + e.message.split('\n')[0]; }
			log(team, s.dir + '/' + s.file, r.ok ? 'ok' : 'FAIL', r.scheme || '', r.note);
			results.push(r);
		}
		fs.mkdirSync(OUT, {recursive: true});
		fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(results, null, 2));
	}
	await setScheme('light');
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
