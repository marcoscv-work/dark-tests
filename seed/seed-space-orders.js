// Seeds the two areas that stay empty after seed-api.js:
//  - the CMS Space (asset library): documents, web contents, Single Approver on web content so
//    some items stay pending, and a document in the recycle bin
//  - Commerce orders, a shipment and a payment on top of the Minium Full data
// Usage: node seed/seed-space-orders.js
const BASE = process.env.LR_BASE || 'http://localhost:8080';
const CRED = process.env.LR_USER || 'test@liferay.com:test';
const AUTH = 'Basic ' + Buffer.from(CRED).toString('base64');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function api(method, path, body) {
	const res = await fetch(BASE + path, {method, headers: {Authorization: AUTH, 'Content-Type': 'application/json', Accept: 'application/json'}, body: body === undefined ? undefined : JSON.stringify(body)});
	const text = await res.text(); let json = null;
	try { json = text ? JSON.parse(text) : null; } catch (e) { json = {raw: text.slice(0, 300)}; }
	if (!res.ok) { const err = new Error(`${method} ${path} -> ${res.status} ${(json && (json.title || json.message || json.raw)) || ''}`.slice(0, 400)); err.body = json; throw err; }
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
async function step(name, fn) { try { const r = await fn(); log('+', name, r === undefined ? '' : r); } catch (e) { log('?', name, 'skipped:', e.message.slice(0, 220)); } }
async function uploadDocument(scopePath, name, content, type) {
	const fd = new FormData();
	fd.append('file', new Blob([content], {type}), name);
	fd.append('document', JSON.stringify({title: name, description: 'Sample file for the Dark Mode screenshot gallery'}));
	const res = await fetch(`${BASE}${scopePath}/documents`, {method: 'POST', headers: {Authorization: AUTH}, body: fd});
	if (!res.ok) throw new Error(`document ${name} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
	return res.json();
}

(async () => {
	const me = await get('/api/jsonws/user/get-current-user');
	const companyId = me.companyId, userId = me.userId;

	// ---------- CMS space ----------
	const depots = (await get(`/api/jsonws/group/get-groups/company-id/${companyId}/parent-group-id/0/site/false`)).filter((g) => /asset-library-/.test(g.friendlyURL));
	if (!depots.length) { log('? no CMS space found; create one from the CMS home first'); }
	for (const depot of depots.slice(0, 1)) {
		const lib = `/o/headless-delivery/v1.0/asset-libraries/${depot.groupId}`;
		const spaceName = depot.nameCurrentValue || depot.name;
		log(`space "${spaceName}" (${depot.groupId})`);
		const existingDocs = (await get(`${lib}/documents?pageSize=100`)).items || [];
		const svg = (label, fill) => `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="${fill}"/><text x="40" y="220" font-family="sans-serif" font-size="48" fill="#fff">${label}</text></svg>`;
		for (const [name, content, type] of [
			['hero-dark.svg', svg('Dark Mode hero', '#1b1b23'), 'image/svg+xml'],
			['palette-light.svg', svg('Light palette', '#006eff'), 'image/svg+xml'],
			['review-checklist.txt', 'Checklist used in the Dark Mode reviews.\n1. Enable LPD-57922\n2. Switch to dark\n3. Compare against Clay tokens\n', 'text/plain'],
			['token-mapping.csv', 'legacy,token\n#F7F8F9,--gray-100\n#272833,--gray-900\n#006EFF,--blue\n', 'text/csv'],
		]) {
			if (existingDocs.some((d) => d.title === name)) { log('=', name, 'already there'); continue; }
			await step(`space document ${name}`, () => uploadDocument(lib, name, content, type).then((d) => d.id));
		}
		const structures = (await get(`/o/headless-delivery/v1.0/sites/${(await get('/o/headless-admin-site/v1.0/sites?pageSize=100')).items.find((s) => s.friendlyUrlPath === '/global').id}/content-structures?pageSize=50`)).items;
		const basic = structures.find((s) => s.name === 'Basic Web Content') || structures[0];
		const existingWC = (await get(`${lib}/structured-contents?pageSize=100`)).items || [];
		const wc = async (title, body) => {
			if (existingWC.some((c) => c.title === title)) { log('=', title, 'already there'); return; }
			await step(`space web content "${title}"`, () => post(`${lib}/structured-contents`, {title, contentStructureId: basic.id, contentFields: [{name: 'content', contentFieldValue: {data: `<p>${body}</p>`}}]}).then((c) => `${c.id} ${c.workflowStatus || ''}`));
		};
		await wc('Dark Mode launch announcement', 'The administration interface now supports a dark colour scheme. This article is approved sample content.');
		await wc('Token migration guide', 'Replace hardcoded hex values with Clay design tokens so components switch with the colour scheme.');
		await wc('Accessibility statement', 'Dark Mode meets WCAG 2.2 AA contrast. High Contrast modes will follow.');
		// Single Approver on web content in the space, then content that stays pending
		await step('Single Approver on space web content', () => jsonws('/workflowdefinitionlink/update-workflow-definition-link', {externalReferenceCode: '', userId, companyId, groupId: depot.groupId, className: 'com.liferay.journal.model.JournalArticle', classPK: 0, typePK: 0, workflowDefinitionName: 'Single Approver', workflowDefinitionVersion: 1}).then(() => 'linked'));
		await wc('Pending: Q4 dark mode roadmap', 'This article waits for approval so the Pending Workflows and dashboard widgets have data.');
		await wc('Pending: release notes draft', 'Second pending article.');
		// one document into the recycle bin
		await step('document moved to the recycle bin', async () => {
			const doc = (await get(`${lib}/documents?pageSize=100`)).items.find((d) => d.title === 'token-mapping.csv');
			if (!doc) throw new Error('no document to trash');
			await jsonws('/dltrash/move-file-entry-to-trash', {fileEntryId: doc.id});
			return doc.id;
		});
	}

	// ---------- Commerce orders ----------
	const channel = (await get('/o/headless-commerce-admin-channel/v1.0/channels?pageSize=5')).items[0];
	const accounts = (await get('/o/headless-admin-user/v1.0/accounts?pageSize=10&filter=type eq \'business\'')).items;
	const skus = (await get('/o/headless-commerce-admin-catalog/v1.0/skus?pageSize=20')).items.filter((s) => s.price > 0);
	const warehouses = (await get('/o/headless-commerce-admin-inventory/v1.0/warehouses?pageSize=5')).items;
	if (!channel || !accounts.length || !skus.length) { log('? commerce data missing (channel/accounts/skus); create the Minium Full site first'); }
	else {
		const existingOrders = (await get('/o/headless-commerce-admin-order/v1.0/orders?pageSize=50')).items || [];
		const specs = [
			{account: accounts[0], orderStatus: 1, paymentStatus: 2, items: [[skus[0], 4], [skus[1], 2]]},   // pending, payment pending
			{account: accounts[1] || accounts[0], orderStatus: 10, paymentStatus: 0, items: [[skus[2] || skus[0], 1], [skus[3] || skus[1], 6]]}, // processing, paid
			{account: accounts[2] || accounts[0], orderStatus: 15, paymentStatus: 0, items: [[skus[4] || skus[0], 3]]},   // shipped, paid
			{account: accounts[3] || accounts[0], orderStatus: 0, paymentStatus: 0, items: [[skus[5] || skus[1], 10]]},  // completed
		];
		if (existingOrders.length >= specs.length) log('=', `${existingOrders.length} orders already there`);
		else {
			const created = [];
			for (const s of specs) {
				await step(`order for ${s.account.name} (status ${s.orderStatus})`, async () => {
					const addresses = (await get(`/o/headless-admin-user/v1.0/accounts/${s.account.id}/postal-addresses`).catch(() => ({items: []}))).items || [];
					const order = await post('/o/headless-commerce-admin-order/v1.0/orders', {
						accountId: s.account.id, channelId: channel.id, currencyCode: channel.currencyCode || 'USD', orderStatus: s.orderStatus, paymentStatus: s.paymentStatus,
						shippingAddressId: addresses[0] ? addresses[0].id : undefined, billingAddressId: addresses[0] ? addresses[0].id : undefined,
						orderItems: s.items.map(([sku, qty]) => ({skuId: sku.id, quantity: qty, unitPrice: sku.price})),
					});
					created.push({order, spec: s});
					return order.id;
				});
			}
			const shipped = created.find((c) => c.spec.orderStatus === 15) || created[0];
			if (shipped) {
				await step('shipment for the shipped order', async () => {
					const full = await get(`/o/headless-commerce-admin-order/v1.0/orders/${shipped.order.id}?nestedFields=orderItems`);
					const items = full.orderItems || (await get(`/o/headless-commerce-admin-order/v1.0/orders/${shipped.order.id}/orderItems`)).items || [];
					const sh = await post('/o/headless-commerce-admin-shipment/v1.0/shipments', {
						orderId: shipped.order.id, accountId: shipped.order.accountId, carrier: 'UPS Ground', trackingNumber: '1Z999AA10123456784',
						shippingAddressId: shipped.order.shippingAddressId || undefined,
						shipmentItems: items.map((it) => ({orderItemId: it.id, quantity: it.quantity, warehouseId: warehouses[0] && warehouses[0].id})),
					});
					return sh.id;
				});
			}
			const paid = created.find((c) => c.spec.paymentStatus === 0) || created[0];
			if (paid) {
				await step('payment entry', () => post('/o/headless-commerce-admin-payment/v1.0/payments', {amount: 250, channelId: channel.id, currencyCode: channel.currencyCode || 'USD', paymentStatus: 0, reasonKey: 'sample'}).then((p) => p.id));
			}
		}
	}
	log('done');
})().catch((e) => { console.error('FAILED', e.message, e.body ? JSON.stringify(e.body).slice(0, 300) : ''); process.exit(1); });
