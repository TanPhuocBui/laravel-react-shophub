import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

// Real Chrome + Laravel + MariaDB. No screenshots or mocked API responses.
// Requires a NEW migrated database created by backend/scripts/catalog-test-database.php.
const backend = resolve('../backend');
const addressesReview = process.argv.includes('--addresses');
const publishingReview = process.argv.includes('--publishing');
const productsReview = process.argv.includes('--products') || publishingReview;
const mediaRoot = resolve(backend, 'storage/framework/testing', 't03-media-' + Date.now());
const metadata = JSON.parse(await readFile(resolve(backend, 'storage/framework/testing/catalog-api-database.json'), 'utf8'));
const server = JSON.parse((await readFile(resolve(backend, 'storage/framework/testing/catalog-test-server.json'), 'utf8')).replace(/^\uFEFF/, ''));
assert.match(metadata.database, /^shophub_catalog_api_test_[a-f0-9]{10}$/);
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
async function until(fn, label, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { try { const value = await fn(); if (value) return value; } catch {} await delay(100); }
  throw new Error(`Timed out: ${label}`);
}
const freePort = () => new Promise((done) => {
  const socket = createServer();
  socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(() => done(port)); });
});
const apiPort = await freePort();
const previewPort = await freePort();
const apiBase = `http://localhost:${apiPort}`;
const base = `http://localhost:${previewPort}`;
const password = randomBytes(24).toString('hex');
const env = { ...process.env, APP_ENV: 'testing', APP_DEBUG: 'false', APP_KEY: 'base64:' + randomBytes(32).toString('base64'), APP_URL: apiBase,
  DB_CONNECTION: 'mysql', DB_URL: '', DB_HOST: '127.0.0.1', DB_PORT: String(server.port), DB_DATABASE: metadata.database, DB_USERNAME: 'root', DB_PASSWORD: '',
  CATALOG_TEST_DATABASE: metadata.database, T02_TEST_PASSWORD: password, CACHE_STORE: 'array', SESSION_DRIVER: addressesReview ? 'database' : 'file', SESSION_COOKIE: `t02_${Date.now()}`,
  CORS_ALLOWED_ORIGINS: base, SANCTUM_STATEFUL_DOMAINS: `localhost:${previewPort},localhost:${apiPort}`, VITE_CATALOG_SOURCE: 'api', VITE_BACKEND_URL: apiBase };
if (productsReview) env.CATALOG_MEDIA_ROOT = mediaRoot;
function run(command, args, cwd) {
  const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: 'pipe' });
  let log = '';
  child.stdout.on('data', (value) => { log += value; }); child.stderr.on('data', (value) => { log += value; });
  child.log = () => log;
  return child;
}
const completion = (child) => new Promise((done, reject) => {
  child.once('error', reject);
  child.once('exit', (code) => code === 0 ? done(child.log()) : reject(new Error(child.log())));
});
async function stop(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise((done) => child.once('exit', done)); child.kill(); await closed;
}
const checks = [];
const network = [];
const exceptions = [];
const mutations = [];
let apiServer, preview, chrome, ws;
const php = process.env.CATALOG_PHP || 'D:/xampp/php/php.exe';
const opcodeArguments = process.env.CATALOG_PHP_OPCACHE === '1' ? ['-d', 'zend_extension=opcache', '-d', 'opcache.enable_cli=1', '-d', 'opcache.validate_timestamps=1', '-d', 'opcache.revalidate_freq=0'] : [];
const startApi = () => run(php, [...opcodeArguments, '-d', 'upload_max_filesize=5M', '-d', 'post_max_size=60M', '-S', `localhost:${apiPort}`, '-t', '.', resolve(backend, 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')], resolve(backend, 'public'));
try {
  console.log((await completion(run(php, ['scripts/t02-browser-fixtures.php', '--accounts-only'], backend))).trim());
  await completion(run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', 'node_modules/.cache/t02-build'], process.cwd()));
  apiServer = startApi();
  preview = run(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'node_modules/.cache/t02-build', '--host', 'localhost', '--port', String(previewPort), '--strictPort'], process.cwd());
  await until(async () => (await fetch(apiBase + '/api/health')).ok, 'Laravel');
  await until(async () => (await fetch(base)).ok, 'React preview');
  const profile = resolve('node_modules/.cache', `t02-chrome-${Date.now()}`);
  chrome = run(process.env.CATALOG_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], process.cwd());
  const debugPort = await until(async () => (await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0], 'Chrome');
  const target = (await (await fetch(`http://localhost:${debugPort}/json/list`)).json()).find((item) => item.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const entry = pending.get(message.id);
      if (entry) {
        pending.delete(message.id);
        if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
        else entry.done(message.result);
      }
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
    if (message.method === 'Network.requestWillBeSent') {
      const { request } = message.params;
      if (request.url.startsWith(apiBase + '/api/' + (addressesReview ? 'customer/' : 'admin/')) && request.method !== 'GET' && request.method !== 'OPTIONS') mutations.push({ url: request.url.replace(apiBase, ''), method: request.method });
    }
    if (message.method === 'Network.responseReceived') {
      const { response } = message.params;
      if (response.url.startsWith(apiBase + '/api/')) network.push({ url: response.url.replace(apiBase, ''), status: response.status });
    }
  });
  const call = (method, params = {}) => new Promise((done, reject) => { const id = ++sequence; pending.set(id, { done, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (fn, arg) => {
    const result = await call('Runtime.evaluate', { expression: `(${fn})(${JSON.stringify(arg) ?? ''})`, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (fn, label, arg) => {
    try { return await until(() => evaluate(fn, arg), label); }
    catch (error) { throw new Error(`${error.message}: ${await evaluate(() => location.pathname + ' ' + document.body.innerText.slice(0, 1800))}`); }
  };
  const navigate = async (path) => {
    await evaluate(() => { window.__t02Navigating = true; });
    await call('Page.navigate', { url: base + path });
    await waitFor(() => !window.__t02Navigating && document.readyState === 'complete', path);
  };
  const click = async (selector) => {
    assert(await evaluate((selector) => { const element = document.querySelector(selector); if (!element || element.disabled) return false; element.click(); return true; }, selector), selector);
    await delay(120);
  };
  const fill = (fields) => evaluate((fields) => {
    for (const [selector, value] of Object.entries(fields)) {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      if (element.type === 'checkbox') { if (element.checked !== Boolean(value)) element.click(); }
      else { Object.getOwnPropertyDescriptor(element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(element, value); }
      element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, fields);
  const browserApi = (path, method = 'GET', body) => evaluate(async ({ url, method, body }) => {
    if (method !== 'GET') await fetch(url.split('/api/')[0] + '/sanctum/csrf-cookie', { credentials: 'include', headers: { Accept: 'application/json' } });
    const token = document.cookie.split('; ').find((item) => item.startsWith('XSRF-TOKEN='))?.slice(11);
    const response = await fetch(url, { method, credentials: 'include', headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { url: apiBase + path, method, body });
  const publicApi = async (path) => {
    const response = await fetch(apiBase + '/api/public/' + path, { headers: { Accept: 'application/json' } });
    return { status: response.status, data: await response.json() };
  };
  const pass = (message) => { checks.push({ result: 'PASS', message }); console.log('PASS ' + message); };
  const readyList = () => waitFor(() => !!document.querySelector('.admin-result') && !document.querySelector('main [role="alert"]'), 'admin list');
  const readyForm = () => waitFor(() => !!document.querySelector('#field-name'), 'admin form');
  const login = async (role) => {
    await navigate('/login');
    await waitFor(() => !!document.querySelector('.orbit-submit') && !document.querySelector('.orbit-submit').disabled, 'login form');
    await fill({ '#email': `t02-${role}@shophub.invalid`, '#password': password });
    await click('.orbit-submit');
    await waitFor(() => location.pathname === '/account', `login ${role}`);
  };
  await Promise.all([call('Page.enable'), call('Runtime.enable'), call('Network.enable')]);
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  if (addressesReview) {
    await completion(run(php, ['scripts/t05-browser-fixtures.php'], backend));
    const { runAddressScenarios } = await import('./t05-customer-address-scenarios.mjs');
    await runAddressScenarios({ call, evaluate, click, fill, navigate, waitFor, browserApi, pass, mutations, login, apiBase, ws, fixture: (action) => completion(run(php, ['scripts/t05-browser-fixtures.php', action], backend)) });
    assert.deepEqual(exceptions, []);
    await writeFile(resolve(backend, 'storage/framework/testing/t05-browser-results.json'), JSON.stringify({ database: metadata.database, driver: 'mysql', server: metadata.server, widths: [1440,768,390], checks, exceptions, network, mutations }, null, 2));
    console.log(`PASS ${checks.length} T05 browser scenarios; ${network.length} real API responses; no screenshots.`);
  } else {
  await navigate('/admin/categories');
  await waitFor(() => document.body.textContent.includes('Cần đăng nhập'), 'guest guard');
  for (const kind of ['categories', 'brands', ...(productsReview ? ['products'] : [])]) assert.equal((await browserApi(`/api/admin/${kind}`)).status, 401);
  pass('Guest: Admin UI asks for login; both API lists return 401.');
  if (publishingReview) assert.equal((await browserApi('/api/admin/specifications')).status, 401);
  await login('customer'); await navigate('/admin/brands');
  await waitFor(() => document.body.textContent.includes('Không đủ quyền truy cập'), 'customer guard');
  for (const kind of ['categories', 'brands', ...(productsReview ? ['products'] : [])]) assert.equal((await browserApi(`/api/admin/${kind}`)).status, 403);
  pass('Customer: Admin UI denies access; both API lists return 403.');
  if (publishingReview) assert.equal((await browserApi('/api/admin/specifications')).status, 403);
  // Logout current test session via real T00 endpoint; never fabricate auth state.
  await evaluate(async (url) => {
    await fetch(url + '/sanctum/csrf-cookie', { credentials: 'include' });
    const token = document.cookie.split('; ').find((item) => item.startsWith('XSRF-TOKEN='))?.slice(11);
    const response = await fetch(url + '/logout', { method: 'POST', credentials: 'include', headers: { Accept: 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(token) } });
    if (response.status !== 204) throw new Error('Logout failed');
  }, apiBase);
  await login('admin'); await navigate('/admin/categories'); await readyList();
  for (const kind of ['categories', 'brands']) {
    await navigate('/admin/' + kind); await readyList();
    assert.equal((await browserApi('/api/admin/' + kind)).data.meta.total, 0);
    assert((await evaluate(() => document.querySelector('main').textContent)).includes(kind === 'categories' ? 'Chưa có danh mục' : 'Chưa có thương hiệu'));
    assert.equal(await evaluate(() => document.querySelector('.admin-state a').getAttribute('href')), '/admin/' + kind + '/create');
  }
  pass('Empty database: both modules distinguish first-use empty lists and offer the matching create action.');
  await completion(run(php, ['scripts/catalog-browser-fixtures.php', 'seed'], backend));
  await completion(run(php, ['scripts/catalog-browser-fixtures.php', 'specifications'], backend));
  await navigate('/admin/categories'); await readyList();
  await click('a[href="/admin/categories/create"]'); await readyForm();
  await fill({ '#field-name': 'T02 Root', '#field-slug': 't02-root', '#field-sort_order': '10' }); await click('.admin-editor button[type="submit"]'); await readyList();
  const root = (await browserApi('/api/admin/categories?q=t02-root')).data.data[0];
  assert(root);
  await click('a[href="/admin/categories/create"]'); await readyForm();
  await fill({ '#field-name': 'T02 Child', '#field-slug': 't02-child', '#field-parent_id': String(root.id) }); await click('.admin-editor button[type="submit"]'); await readyList();
  const child = (await browserApi('/api/admin/categories?q=t02-child')).data.data[0];
  assert.equal(child.parent_id, root.id);
  await navigate(`/admin/categories/${root.id}/edit`); await readyForm();
  const availableParents = await evaluate(() => [...document.querySelector('#field-parent_id').options].map((item) => item.value));
  assert(!availableParents.includes(String(root.id)) && !availableParents.includes(String(child.id)));
  await fill({ '#field-name': 'T02 Root edited' }); await click('.admin-editor button[type="submit"]'); await readyList();
  assert.equal((await browserApi(`/api/admin/categories/${root.id}`)).data.data.name, 'T02 Root edited');
  pass('Admin category UI: create root and child, choose parent, edit; self and descendants excluded from parent options.');
  await navigate('/admin/categories/create'); await readyForm();
  await fill({ '#field-name': 'Duplicate', '#field-slug': 't02-root' }); await click('.admin-editor button[type="submit"]');
  await waitFor(() => !!document.querySelector('#error-slug'), 'duplicate slug validation');
  pass('Form renders Laravel field validation for duplicate slug.');
  const snapshot = (await browserApi('/api/admin/categories/options')).data.data;
  const grand = (await browserApi('/api/admin/categories', 'POST', { name: 'T02 Grandchild', slug: 't02-grandchild', parent_id: child.id, sort_order: 0, is_active: true })).data.data;
  const treeBefore = (await browserApi('/api/admin/categories/options')).data.data;
  for (const parent of [999999999, root.id, grand.id]) {
    const result = await browserApi(`/api/admin/categories/${root.id}`, 'PUT', { name: 'Must not change', slug: 'must-not-change', parent_id: parent, sort_order: 0, is_active: true });
    assert.equal(result.status, 422); assert(result.data.errors.parent_id);
    assert.deepEqual((await browserApi('/api/admin/categories/options')).data.data, treeBefore);
  }
  assert.equal(treeBefore.length, snapshot.length + 1);
  pass('Real session HTTP: missing parent, self parent and three-level cycle return 422 and preserve the entire tree.');
  await navigate('/admin/categories'); await readyList();
  await click(`[data-record-id="${root.id}"] button`);
  await waitFor(() => !!document.querySelector('.admin-confirm[open]'), 'hide confirmation');
  const beforeCancel = mutations.length;
  await click('.admin-confirm .admin-actions button:first-child');
  assert.equal(mutations.length, beforeCancel);
  assert.equal((await browserApi(`/api/admin/categories/${root.id}`)).data.data.is_active, true);
  await click(`[data-record-id="${root.id}"] button`); await click('.admin-confirm .admin-danger');
  await waitFor((id) => !document.querySelector('.admin-confirm') && document.querySelector(`[data-record-id="${id}"] .admin-badge`)?.textContent === 'Đã ẩn', 'hide category', root.id);
  assert.equal((await browserApi(`/api/admin/categories/${child.id}`)).data.data.parent_id, root.id);
  pass('Category hide requires confirmation; cancel preserves status; hide keeps descendants and links.');
  await navigate('/admin/brands'); await readyList();
  await click('a[href="/admin/brands/create"]'); await readyForm();
  await fill({ '#field-name': 'T02 Brand', '#field-slug': 't02-brand' }); await click('.admin-editor button[type="submit"]'); await readyList();
  const brand = (await browserApi('/api/admin/brands?q=t02-brand')).data.data[0];
  await navigate(`/admin/brands/${brand.id}/edit`); await readyForm();
  await fill({ '#field-name': 'T02 Brand edited', 'input[name="is_active"]': false }); await click('.admin-editor button[type="submit"]');
  await waitFor(() => !!document.querySelector('.admin-confirm[open]'), 'edit hide confirmation'); await click('.admin-confirm .admin-danger'); await readyList();
  assert.equal((await browserApi(`/api/admin/brands/${brand.id}`)).data.data.is_active, false);
  await navigate(`/admin/brands/${brand.id}/edit`); await readyForm();
  await fill({ 'input[name="is_active"]': true }); await click('.admin-editor button[type="submit"]'); await readyList();
  await click(`[data-record-id="${brand.id}"] button`); await click('.admin-confirm .admin-danger');
  await waitFor((id) => !document.querySelector('.admin-confirm') && document.querySelector(`[data-record-id="${id}"] .admin-badge`)?.textContent === 'Đã ẩn', 'hide brand', brand.id);
  pass('Admin brand UI: create, edit, hide by edit with confirmation, reactivate, and hide from list.');
  await fill({ '#admin-search': 'zzzz-t02-none' }); await click('.admin-filters button');
  await waitFor(() => document.querySelector('main')?.textContent.includes('Không tìm thấy kết quả'), 'admin empty list');
  await click('.admin-filters a'); await readyList();
  pass('Admin empty state and clear filters recover real data.');
  // Hide seeded catalog relations through UI and verify public UI plus HTTP.
  const laptop = (await browserApi('/api/admin/categories?q=laptop')).data.data.find((item) => item.slug === 'laptop');
  await navigate('/admin/categories'); await readyList();
  await click(`[data-record-id="${laptop.id}"] button`); await click('.admin-confirm .admin-danger');
  await waitFor((id) => !document.querySelector('.admin-confirm') && document.querySelector(`[data-record-id="${id}"] .admin-badge`)?.textContent === 'Đã ẩn', 'hide laptop', laptop.id);
  assert.equal((await publicApi('products?category=laptop')).data.meta.total, 0);
  assert.equal((await publicApi('products/public-demo-laptop-1')).status, 404);
  await navigate('/products?category=laptop'); await waitFor(() => !!document.querySelector('.empty-state'), 'hidden category public empty');
  await navigate(`/admin/categories/${laptop.id}/edit`); await readyForm();
  await fill({ 'input[name="is_active"]': true }); await click('.admin-editor button[type="submit"]'); await readyList();
  assert.equal((await publicApi('products?category=laptop')).data.meta.total, 10);
  const asus = (await browserApi('/api/admin/brands?q=asus')).data.data.find((item) => item.slug === 'asus');
  await navigate('/admin/brands'); await readyList(); await click(`[data-record-id="${asus.id}"] button`); await click('.admin-confirm .admin-danger');
  await waitFor((id) => !document.querySelector('.admin-confirm') && document.querySelector(`[data-record-id="${id}"] .admin-badge`)?.textContent === 'Đã ẩn', 'hide asus', asus.id);
  assert.equal((await publicApi('products/public-demo-laptop-1')).status, 404);
  await navigate('/products/public-demo-laptop-1'); await waitFor(() => !document.querySelector('.pdp-info') && document.body.textContent.includes('Không tìm thấy'), 'hidden brand public detail');
  await navigate(`/admin/brands/${asus.id}/edit`); await readyForm(); await fill({ 'input[name="is_active"]': true }); await click('.admin-editor button[type="submit"]'); await readyList();
  pass('Hiding category/brand via Admin removes related products from public UI/API; reactivation restores them.');
  await navigate('/products?category=laptop'); await waitFor(() => document.querySelectorAll('.listing-grid .pcard').length === 8, 'T01 listing');
  await click('[aria-label="Trang 2"]'); await waitFor(() => document.querySelectorAll('.listing-grid .pcard').length === 2, 'T01 pagination');
  await click('.pname a[href="/products/public-demo-laptop-1"]'); await waitFor(() => !!document.querySelector('.sku'), 'T01 detail');
  await click('.opt-btns .opt-btn:nth-child(2)');
  await waitFor(() => document.querySelector('.sku')?.textContent.includes('SILVER') && !!document.querySelector('.stock-label.sold-out'), 'T01 sold out SKU');
  assert((await evaluate(() => document.querySelector('.pdp-price .now').textContent)).includes('18.400.000'));
  await click('#tab-specs'); assert.equal(await evaluate(() => document.querySelectorAll('#panel-specs tr').length), 4);
  pass('T01 browser regression: category 8+2 pagination, detail, silver sold-out price and real specifications.');
  const longNames = {
    categories: ['Đồ điện và thiết bị gia dụng thông minh dành cho gia đình Việt Nam — phiên bản đặc biệt', 'do-dien-va-thiet-bi-gia-dung-thong-minh-danh-cho-gia-dinh-viet-nam-phien-ban-dac-biet'],
    brands: ['Điện Máy Đẳng Cấp – Thương hiệu thiết bị công nghệ và gia dụng dành cho gia đình Việt', 'dien-may-dang-cap-thuong-hieu-thiet-bi-cong-nghe-va-gia-dung-danh-cho-gia-dinh-viet'],
  };
  const uiRecords = {};
  const press = async (key, code = key, keyCode = 0, shift = false) => {
    const text = key === 'Enter' ? '\r' : undefined;
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, text, unmodifiedText: text, modifiers: shift ? 8 : 0 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers: shift ? 8 : 0 });
    await delay(100);
  };
  for (const kind of ['categories', 'brands']) {
    await navigate('/admin/' + kind + '/create'); await readyForm();
    await fill({ '#field-name': longNames[kind][0] });
    assert.equal(await evaluate(() => document.querySelector('#field-slug').value), longNames[kind][1]);
    const slug = 't02-ui-' + kind;
    await fill({ '#field-slug': slug });
    await fill({ '#field-name': 'Đổi tên ' + longNames[kind][0] });
    assert.equal(await evaluate(() => document.querySelector('#field-slug').value), slug);
    const beforeSave = mutations.length;
    await evaluate(() => {
      const form = document.querySelector('.admin-editor');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await readyList();
    assert.equal(mutations.slice(beforeSave).filter((entry) => entry.method === 'POST' && entry.url === '/api/admin/' + kind).length, 1);
    uiRecords[kind] = (await browserApi('/api/admin/' + kind + '?q=' + slug)).data.data[0];
    assert(uiRecords[kind]);
    await navigate('/admin/' + kind + '/' + uiRecords[kind].id + '/edit'); await readyForm();
    const editedName = 'Đã sửa ' + longNames[kind][0];
    await fill({ '#field-name': editedName });
    assert.equal(await evaluate(() => document.querySelector('#field-slug').value), slug);
    await fill({ '#field-slug': 'slug sai Đ' }); await click('.admin-editor button[type="submit"]');
    await waitFor(() => !!document.querySelector('#error-slug') && document.activeElement?.id === 'field-slug', 'invalid slug focus');
    assert.equal(await evaluate(() => document.querySelector('#field-name').value), editedName);
    assert.equal(await evaluate(() => document.querySelector('#field-slug').value), 'slug sai Đ');
    await fill({ '#field-slug': slug });
    if (kind === 'categories') {
      await fill({ '#field-parent_id': String(root.id) });
      assert((await evaluate(() => document.querySelector('.admin-parent-warning').textContent)).includes('đang ẩn'));
    }
    await click('.admin-editor button[type="submit"]'); await readyList();
    assert.equal((await browserApi('/api/admin/' + kind + '/' + uiRecords[kind].id)).data.data.slug, slug);
    await navigate('/admin/' + kind + '/' + uiRecords[kind].id + '/edit'); await readyForm();
    await fill({ 'input[name="is_active"]': false }); await click('.admin-editor button[type="submit"]');
    await waitFor(() => !!document.querySelector('.admin-confirm[open]'), 'cancel edit hide');
    const beforeEscape = mutations.length;
    await press('Escape', 'Escape', 27);
    await waitFor(() => !document.querySelector('.admin-confirm'), 'dismiss edit hide with Escape');
    assert.equal(mutations.length, beforeEscape);
    assert.equal((await browserApi('/api/admin/' + kind + '/' + uiRecords[kind].id)).data.data.is_active, true);
    await click('.admin-form-actions a'); await readyList();
    pass(kind + ': Vietnamese đ/Đ slug suggestion, manual override, stable edit slug, preserved invalid input/error focus, duplicate submit guard, Escape cancellation.');
  }
  const returnQuery = '?q=t02&status=all&per_page=1&page=2';
  for (const kind of ['categories', 'brands']) {
    const url = '/admin/' + kind + returnQuery;
    await navigate(url); await readyList();
    await click('.admin-row-actions a'); await readyForm();
    await click('.admin-back'); await readyList();
    assert.equal(await evaluate(() => location.pathname + location.search), url);
    await click('.admin-row-actions a'); await readyForm();
    await click('.admin-editor button[type="submit"]'); await readyList();
    assert.equal(await evaluate(() => location.pathname + location.search), url);
  }
  pass('Both modules retain search, status, page size and page 2 through Back, Cancel and Save navigation.');
  await navigate('/admin/categories?q=t02-child'); await readyList();
  assert.equal(await evaluate(() => document.querySelector('.admin-parent-cell').textContent), 'T02 Root edited');
  assert((await evaluate(() => document.querySelector('.admin-table-note').textContent)).includes('không phải toàn bộ cây'));
  await navigate('/admin/categories/' + laptop.id + '/edit'); await readyForm();
  const laptopSummary = (await browserApi('/api/admin/categories?q=laptop')).data.data.find((item) => item.id === laptop.id);
  assert.equal(Number(await evaluate(() => document.querySelector('.admin-context-fact strong').textContent)), laptopSummary.products_count);
  assert((await evaluate(() => document.querySelector('.admin-context-fact').textContent)).includes('sản phẩm liên kết'));
  assert((await evaluate(() => document.querySelector('.admin-context-help').textContent)).includes('Ẩn cha không tự ẩn con'));
  pass('Filtered category rows show real direct-parent names; context uses linked-product counts without claiming public-product counts.');
  // Real connection failure, with the authenticated React tree still mounted.
  await navigate('/admin/brands'); await readyList();
  await stop(apiServer);
  await fill({ '#admin-search': 'T02' }); await click('.admin-filters button');
  await waitFor(() => !!document.querySelector('.admin-state[role="alert"]'), 'Admin API offline state');
  apiServer = startApi();
  await until(async () => (await fetch(apiBase + '/api/health')).ok, 'restart Laravel');
  await click('.admin-state button'); await readyList();
  pass('Real Laravel connection failure shows error and Retry; restarting the server restores the filtered list.');
  const contrast = (foreground, background) => {
    const luminance = (color) => {
      const components = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((n) => n / 255).map((n) => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
      return components[0] * .2126 + components[1] * .7152 + components[2] * .0722;
    };
    const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (light + .05) / (dark + .05);
  };
  const auditContrast = async (selectors) => {
    const values = await evaluate((selectors) => selectors.map((selector) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error('Missing contrast target ' + selector);
      const style = getComputedStyle(element);
      let ancestor = element;
      while (ancestor && ['rgba(0, 0, 0, 0)', 'transparent'].includes(getComputedStyle(ancestor).backgroundColor)) ancestor = ancestor.parentElement;
      return { selector, color: style.color, background: ancestor ? getComputedStyle(ancestor).backgroundColor : 'rgb(255, 255, 255)' };
    }), selectors);
    for (const value of values) assert(contrast(value.color, value.background) >= 4.5, JSON.stringify(value));
  };
  for (const width of [1440, 768, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 960 });
    for (const kind of ['categories', 'brands']) {
      await navigate('/admin/' + kind); await readyList();
      assert(await evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + ' list overflow');
      await auditContrast(['.admin-heading .admin-primary', '.admin-heading p', '.admin-record-name', '.admin-badge.active']);
      if (width < 960) {
        await evaluate(() => document.querySelector('.admin-menu-trigger').focus());
        assert(await evaluate(() => document.activeElement === document.querySelector('.admin-menu-trigger')), 'mobile trigger receives focus');
        await press('Enter', 'Enter', 13);
        await waitFor(() => !!document.querySelector('.admin-nav-dialog[open]'), 'keyboard opens mobile menu');
        for (let tab = 0; tab < 7; tab++) {
          await press('Tab', 'Tab', 9);
          assert(await evaluate(() => document.querySelector('.admin-nav-dialog').contains(document.activeElement)), 'menu focus trap');
        }
        await press('Escape', 'Escape', 27);
        await waitFor(() => !document.querySelector('.admin-nav-dialog[open]') && document.activeElement === document.querySelector('.admin-menu-trigger'), 'Escape returns menu focus');
        await click('.admin-menu-trigger'); await click('.admin-nav-dialog button');
        await waitFor(() => !document.querySelector('.admin-nav-dialog[open]'), 'mobile close button');
      }
      await click('a[href="/admin/' + kind + '/create"]'); await readyForm();
      await fill({ '#field-name': longNames[kind][0] });
      assert(await evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + ' create overflow');
      await auditContrast(['.admin-form-actions .admin-primary', '.admin-field label', '.admin-help']);
      await navigate('/admin/' + kind + '/' + uiRecords[kind].id + '/edit'); await readyForm();
      assert(await evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + ' edit overflow');
      assert((await evaluate(() => document.querySelector('.admin-breadcrumb [aria-current="page"]').textContent)).startsWith('Sửa'));
      await evaluate(() => document.querySelector('#field-name').focus());
      await press('Tab', 'Tab', 9);
      const focus = await evaluate(() => { const style = getComputedStyle(document.activeElement); return { id: document.activeElement.id, width: parseFloat(style.outlineWidth), style: style.outlineStyle }; });
      assert.equal(focus.id, 'field-slug'); assert(focus.width >= 3 && focus.style !== 'none');
    }
    pass(width + 'px: both module lists/create/edit, long Vietnamese names, no page overflow, readable text contrast and visible keyboard focus; mobile menu keyboard/close/Escape work.');
  }
  if (productsReview) {
    const { runProductScenarios } = await import('./t03-admin-products-scenarios.mjs');
    await runProductScenarios({ call, evaluate, click, fill, navigate, waitFor, browserApi, publicApi, pass, mutations, mediaRoot });
  }
  if (publishingReview) {
    const { runPublishingScenarios } = await import('./t04-admin-publishing-scenarios.mjs');
    await runPublishingScenarios({ call, evaluate, click, fill, navigate, waitFor, browserApi, publicApi, pass, mutations });
  }
  assert.deepEqual(exceptions, []);
  assert(network.some((entry) => entry.url.startsWith('/api/admin/categories') && entry.status === 422));
  assert(network.some((entry) => entry.url.startsWith('/api/admin/brands') && entry.status === 201));
  await writeFile(resolve(backend, 'storage/framework/testing/' + (publishingReview ? 't04-browser-results.json' : productsReview ? 't03-browser-results.json' : 't02-browser-results.json')), JSON.stringify({ database: metadata.database, driver: 'mysql', server: metadata.server, source: 'api', widths: [1440, 768, 390], checks, exceptions, network, mutations }, null, 2));
  console.log(`PASS ${checks.length} browser scenarios; ${network.length} real API responses; no Runtime exceptions or screenshots.`);
  }
} finally {
  ws?.close();
  await Promise.all([stop(chrome), stop(preview), stop(apiServer)]);
}
