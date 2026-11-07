import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';

// Runs real Laravel HTTP + MariaDB fixtures. Never uses the configured shophub DB.
// Run from frontend/, after preparing the isolated database described in the API report.
const backend = resolve('../backend');
const database = JSON.parse(await readFile(resolve(backend, 'storage/framework/testing/catalog-api-database.json'), 'utf8')).database;
const databaseServer = JSON.parse((await readFile(resolve(backend, 'storage/framework/testing/catalog-test-server.json'), 'utf8')).replace(/^\uFEFF/, ''));
assert.match(database, /^shophub_catalog_api_test_[a-f0-9]{10}$/);
const specificationsReview = process.argv.includes('--specifications');
const output = resolve(specificationsReview ? '../docs/catalog-specifications-review' : '../docs/catalog-api-review');
await mkdir(output, { recursive: true });
const php = process.env.CATALOG_PHP || 'D:/xampp/php/php.exe';
const chromePath = process.env.CATALOG_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
async function until(fn, label, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { const value = await fn(); if (value) return value; } catch {}
    await delay(100);
  }
  throw new Error(`Timed out: ${label}`);
}
const freePort = () => new Promise((done) => {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => done(port)); });
});
const apiPort = await freePort();
const previewPort = await freePort();
const base = `http://localhost:${previewPort}`;
const apiBase = `http://localhost:${apiPort}`;
const env = {
  ...process.env, APP_ENV: 'testing', APP_DEBUG: 'false', APP_URL: apiBase,
  DB_CONNECTION: 'mysql', DB_URL: '', DB_HOST: '127.0.0.1', DB_PORT: String(databaseServer.port),
  DB_DATABASE: database, DB_USERNAME: 'root', DB_PASSWORD: '', CATALOG_TEST_DATABASE: database,
  CACHE_STORE: 'array', SESSION_DRIVER: 'array', CORS_ALLOWED_ORIGINS: base,
  VITE_CATALOG_SOURCE: 'api', VITE_BACKEND_URL: apiBase,
};
function processRun(command, args, cwd, extra = {}) {
  const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: 'pipe', ...extra });
  let log = '';
  child.stdout?.on('data', (data) => { log += data; });
  child.stderr?.on('data', (data) => { log += data; });
  child.on('error', (error) => { log += error.message; });
  child.log = () => log;
  return child;
}
const completion = (child) => new Promise((done, reject) => {
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? done(child.log()) : reject(new Error(child.log() || `Exit ${code}`)));
});
const fixtures = (action) => completion(processRun(php, ['scripts/catalog-browser-fixtures.php', action], backend));
const startApi = () => processRun(php, ['-S', `localhost:${apiPort}`, '-t', '.', resolve(backend, 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')], resolve(backend, 'public'));
async function stop(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise((done) => child.once('exit', done));
  child.kill();
  await closed;
}
let apiServer;
let preview;
let chrome;
let ws;
const report = [];
const exceptions = [];
const requests = [];
try {
  console.log((await fixtures('seed')).trim());
  await completion(processRun(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', 'node_modules/.cache/catalog-api-build'], process.cwd()));
  apiServer = startApi();
  preview = processRun(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'node_modules/.cache/catalog-api-build', '--host', 'localhost', '--port', String(previewPort), '--strictPort'], process.cwd());
  await until(async () => (await fetch(apiBase + '/api/health')).ok, 'Laravel server');
  await until(async () => (await fetch(base)).ok, 'Vite preview');
  const fetchApi = async (path) => {
    const response = await fetch(apiBase + '/api/public/' + path, { headers: { Accept: 'application/json' } });
    assert.equal(response.status, 200, path);
    return response.json();
  };
  const categories = (await fetchApi('categories')).data;
  for (const category of categories) {
    const results = await fetchApi('products?category=' + category.slug);
    assert.equal(category.product_count, results.meta.total);
  }
  assert.equal((await fetchApi('products')).meta.total, 12);
  assert.equal((await fetchApi('products?category=laptop')).meta.total, 10);
  assert.equal((await fetchApi('products?category=laptop&page=2')).data.length, 2);
  const oldDraft = 'laptop-asus-demo';
  assert.equal((await fetch(apiBase + '/api/public/products/' + oldDraft, { headers: { Accept: 'application/json' } })).status, 404);
  report.push('Real MariaDB API: 12 public products; original 3 draft fixtures excluded; category counts 10/1/1 match filtered totals; laptop page 2 contains 2 products.');
  const profile = resolve('node_modules/.cache/shophub', `chrome-api-${Date.now()}`);
  chrome = processRun(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], process.cwd());
  const debugPort = await until(async () => (await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0], 'Chrome port');
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
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
  });
  const call = (method, params = {}) => new Promise((done, reject) => { const id = ++sequence; pending.set(id, { done, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (fn, argument) => {
    const result = await call('Runtime.evaluate', { expression: `(${fn})(${JSON.stringify(argument) ?? ''})`, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (fn, label) => {
    try { return await until(() => evaluate(fn), label); }
    catch (error) {
      const state = await evaluate(() => ({ url: location.href, main: document.querySelector('main')?.textContent.slice(0, 2500) }));
      throw new Error(`${error.message}: ${JSON.stringify(state)}; exceptions=${JSON.stringify(exceptions)}`);
    }
  };
  const navigate = async (path) => {
    await evaluate(() => { window.__catalogReviewNavigation = true; });
    await call('Page.navigate', { url: base + path });
    await waitFor(() => !window.__catalogReviewNavigation && document.readyState === 'complete' && !!document.querySelector('.site-header') && !document.querySelector('.spinner'), path);
  };
  const click = async (selector) => { assert(await evaluate((selector) => { const item = document.querySelector(selector); if (!item) return false; item.click(); return true; }, selector), selector); await delay(120); };
  const screenshot = async (name) => {
    await evaluate(async () => {
      await document.fonts.ready;
      for (let y = 0; y < document.body.scrollHeight; y += 800) { scrollTo(0, y); await new Promise((done) => setTimeout(done, 30)); }
      scrollTo(0, 0);
    });
    await delay(250);
    const sizes = await evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert(sizes.scroll <= sizes.width, `${name} overflow`);
    if (specificationsReview && !name.startsWith('detail')) return;
    const { contentSize } = await call('Page.getLayoutMetrics');
    const { data } = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: contentSize.width, height: contentSize.height, scale: 1 } });
    await writeFile(resolve(output, name + '.png'), Buffer.from(data, 'base64'));
  };
  await Promise.all([call('Page.enable'), call('Runtime.enable'), call('Network.enable')]);
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/');
  await waitFor(() => document.querySelectorAll('.cat-tile').length === 3 && document.querySelectorAll('.pcard').length > 0, 'home data');
  assert.deepEqual(await evaluate(() => [...document.querySelectorAll('.cat-count')].map((item) => item.textContent.match(/\d+/)[0])), ['10', '1', '1']);
  await screenshot('home-api-1440');
  await click('[aria-label="Banner tiếp theo"]');
  await click('[aria-label="Banner trước"]');
  await click('[aria-label="Tất cả Laptop"]');
  await waitFor(() => document.querySelectorAll('.listing-grid .pcard').length === 8, 'laptop page 1');
  assert.equal(await evaluate(() => new URLSearchParams(location.search).get('category')), 'laptop');
  await click('[aria-label="Trang 2"]');
  await waitFor(() => document.querySelectorAll('.listing-grid .pcard').length === 2, 'laptop page 2');
  await screenshot('products-api-1440');
  await click('.pname a[href="/products/public-demo-laptop-1"]');
  await waitFor(() => document.querySelector('.sku')?.textContent.includes('PUBLIC-DEMO-LAPTOP-1-BLACK'), 'real product detail');
  assert((await evaluate(() => document.querySelector('.pdp-price .now').textContent)).includes('18.100.000'));
  await waitFor(() => document.querySelector('.gallery-main img')?.naturalWidth > 0, 'backend image');
  await evaluate(() => [...document.querySelectorAll('.opt-btn')].find((item) => item.textContent.includes('Bạc')).click());
  await waitFor(() => document.querySelector('.sku').textContent.includes('PUBLIC-DEMO-LAPTOP-1-SILVER'), 'silver SKU');
  assert((await evaluate(() => document.querySelector('.pdp-price .now').textContent)).includes('18.400.000'));
  assert((await evaluate(() => document.querySelector('.pdp-meta .stock-label').textContent)).includes('Tạm hết hàng'));
  await click('[aria-label="Xem hình 2"]');
  assert.equal(await evaluate(() => document.querySelector('[aria-label="Xem hình 2"]').getAttribute('aria-pressed')), 'true');
  await click('#tab-specs');
  assert((await evaluate(() => document.querySelector('#panel-specs').textContent)).includes('đang được cập nhật'));
  await screenshot('detail-variant-api-1440');
  report.push('1440px: Home → Tất cả Laptop → 8+2 server pagination → real slug → Black 18,100,000 VND/in stock → Silver 18,400,000 VND/sold out. Thumbnail and empty specifications tab work. Carousel responds; no page overflow.');
  if (specificationsReview) {
    await fixtures('specifications');
    const specs = (await fetchApi('products/public-demo-laptop-1')).data.specifications;
    assert.deepEqual(specs, [
      { name: 'CPU', value: 'Intel Core i5 (demo)' }, { name: 'RAM', value: '16 GB' },
      { name: 'Dung lượng lưu trữ', value: '512 GB' }, { name: 'Kích thước màn hình', value: '15.6 inch' },
    ]);
    assert.equal((await fetchApi('products/public-demo-kettle')).data.specifications[0].value, '1800 W');
    assert.equal((await fetchApi('products/public-demo-ssd')).data.specifications[0].value, '1000 GB');
    await navigate('/products/public-demo-laptop-1');
    await waitFor(() => !!document.querySelector('.pdp-info'), 'detail after specification seed');
    await click('#tab-specs');
    assert.deepEqual(await evaluate(() => [...document.querySelectorAll('#panel-specs tr')].map((row) => ({ name: row.querySelector('th').textContent, value: row.querySelector('td').textContent }))), specs);
    assert(!(await evaluate(() => document.querySelector('#panel-specs').textContent)).includes('GB GB'));
    await screenshot('detail-specifications-api-1440');
    report.push('Specifications: empty tab before seed; after seeding real API, 1440px table follows CPU → RAM 16 GB → storage 512 GB → screen 15.6 inch. SSD 1000 GB and kettle 1800 W verified; no repeated units.');
  }
  await navigate('/products?category=laptop');
  await evaluate(() => { document.querySelector('#filter-min').value = '18100000'; document.querySelector('#filter-max').value = '18100000'; document.querySelector('#filter-brand').value = 'asus'; document.querySelector('#catalog-filters').requestSubmit(); });
  await waitFor(() => document.querySelectorAll('.listing-grid .pcard').length === 1, 'price/brand filters');
  assert((await evaluate(() => document.querySelector('.listing-grid .now').textContent)).includes('18.100.000'));
  await evaluate(() => history.back());
  await waitFor(() => document.querySelectorAll('.listing-grid .pcard').length === 8, 'Back preserves category');
  await evaluate(() => { document.querySelector('#list-search').value = 'PUBLIC-DEMO-LAPTOP-1-SILVER'; document.querySelector('#catalog-filters').requestSubmit(); });
  await waitFor(() => document.querySelectorAll('.listing-grid .pcard').length === 1, 'SKU search');
  await navigate('/products?category=laptop&in_stock=1&promotion=1&sort=price_asc');
  await waitFor(() => document.querySelector('.result-total')?.textContent.startsWith('9 '), 'stock/promotion filters');
  assert((await evaluate(() => document.querySelector('.listing-grid .pname').textContent)).includes('demo 1'));
  report.push('Browser: price + ASUS filters match card price; SKU search uses server; in_stock + promotion + price_asc gives 9 laptops; browser Back restores category query and 8-card page.');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate('/');
  await waitFor(() => document.querySelectorAll('.cat-tile').length === 3, 'mobile categories');
  await screenshot('home-api-390');
  for (const slug of ['laptop', 'linh-kien-phu-kien', 'thiet-bi-gia-dung']) {
    await waitFor(() => document.querySelectorAll('.cat-tile').length === 3, 'home ready before category click');
    await click(`.cat-tile[href="/products?category=${slug}"]`);
    await waitFor(() => !!document.querySelector('.listing-grid'), `mobile ${slug}`);
    assert.equal(await evaluate(() => new URLSearchParams(location.search).get('category')), slug);
    await navigate('/');
  }
  await click('[aria-label="Tài khoản"]');
  assert.equal(await evaluate(() => document.querySelectorAll('[role="menuitem"]').length), 3);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  await navigate('/products/public-demo-laptop-1');
  await waitFor(() => !!document.querySelector('.pdp-info'), 'mobile detail');
  if (specificationsReview) {
    await click('#tab-specs');
    assert.equal(await evaluate(() => document.querySelectorAll('#panel-specs tr').length), 4);
    assert((await evaluate(() => document.querySelector('#panel-specs').textContent)).includes('16 GB'));
  }
  await screenshot('detail-api-390');
  report.push('390px: all 3 category cards open correct server lists; account menu still has 3 items and Escape closes it; home/detail have no horizontal page overflow.');
  // A failed image must render a clear placeholder, never a guessed SKU photo.
  await evaluate(() => { const image = document.querySelector('.gallery-main img'); image.src = '/deliberately-missing-product-image.png'; });
  await waitFor(() => !document.querySelector('.gallery-main img'), 'missing image fallback');
  await fixtures('empty');
  await navigate('/');
  await waitFor(() => document.body.textContent.includes('Catalog chưa có sản phẩm công khai'), 'empty home');
  assert.equal(await evaluate(() => document.querySelectorAll('.pcard').length), 0);
  await screenshot('empty-api-390');
  await navigate('/products');
  await waitFor(() => !!document.querySelector('.empty-state'), 'empty listing');
  await navigate('/products/public-demo-laptop-1');
  await waitFor(() => !document.querySelector('.pdp-info') && document.body.textContent.includes('Không tìm thấy'), 'unpublished detail 404');
  await fixtures('restore');
  await stop(apiServer);
  await navigate('/');
  await waitFor(() => !!document.querySelector('main [role="alert"]'), 'backend offline');
  assert.equal(await evaluate(() => document.querySelectorAll('.pcard').length), 0);
  assert((await evaluate(() => document.querySelector('main [role="alert"]').textContent)).includes('Không kết nối được máy chủ'));
  await screenshot('offline-api-390');
  apiServer = startApi();
  await until(async () => (await fetch(apiBase + '/api/health')).ok, 'restart backend');
  await click('main .state-panel button');
  await waitFor(() => document.querySelectorAll('.pcard').length > 0, 'Retry restores API');
  report.push('Empty catalog: 0 cards, explicit empty home/list and unpublished detail 404. Backend stopped: Vietnamese error + Retry, 0 demo cards; restarting Laravel and Retry restores real products. Broken image becomes placeholder.');
  assert(requests.some((url) => url.startsWith(apiBase + '/api/public/products?') && url.includes('per_page=4')));
  assert(requests.some((url) => url.startsWith(apiBase + '/api/public/products?') && url.includes('per_page=5')));
  assert(!requests.some((url) => /demoCatalog.*\.js/.test(url)));
  assert.deepEqual(exceptions, []);
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ database, server: 'MariaDB 10.11.16; private instance', source: 'api', widths: [1440, 390], report, exceptions, apiRequests: requests.filter((url) => url.startsWith(apiBase + '/api/public/')).map((url) => url.replace(apiBase, '')) }, null, 2));
  for (const line of report) console.log('PASS ' + line);
} finally {
  // Restore only our fixture namespace, including when a browser assertion fails.
  await fixtures('restore').catch((error) => console.error(error.message));
  ws?.close();
  await Promise.all([stop(chrome), stop(preview), stop(apiServer)]);
}
