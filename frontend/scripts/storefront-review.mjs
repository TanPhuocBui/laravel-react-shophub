import { spawn } from 'node:child_process';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';
import { reviewNavigation } from './review-navigation.mjs';

const navigationReview = process.argv.includes('--navigation');
const output = resolve(navigationReview ? '../docs/catalog-navigation-review' : '../docs/catalog-bazaar-review');
await (await import('node:fs/promises')).mkdir(output, { recursive: true });
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
async function until(fn, label, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { const result = await fn(); if (result) return result; } catch {}
    await delay(100);
  }
  throw new Error(`Timed out: ${label}`);
}
const port = await new Promise((done) => {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => done(port)); });
});
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', 'localhost', '--port', String(port), '--strictPort'], { windowsHide: true, stdio: 'pipe' });
let serverLog = '';
server.stdout.on('data', (data) => serverLog += data);
server.stderr.on('data', (data) => serverLog += data);
const profile = resolve('node_modules/.cache/shophub', `chrome-${Date.now()}`);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws;
let call;
const report = [];
const errors = [];
try {
  const base = `http://localhost:${port}`;
  await until(async () => (await fetch(base)).ok, `Vite preview (${serverLog})`);
  const debugPort = await until(async () => (await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0], 'Chrome port');
  const targets = await (await fetch(`http://localhost:${debugPort}/json/list`)).json();
  const target = targets.find((item) => item.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const entry = pending.get(message.id);
      if (entry) { pending.delete(message.id); if (message.error) entry.reject(new Error(JSON.stringify(message.error))); else entry.done(message.result); }
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) errors.push(`${message.params.response.status}: ${message.params.response.url}`);
    if (message.method === 'Network.loadingFailed' && !message.params.canceled) errors.push(message.params.errorText);
  });
  call = (method, params = {}) => new Promise((done, reject) => {
    const id = ++sequence;
    pending.set(id, { done, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (fn, argument) => {
    const result = await call('Runtime.evaluate', { expression: `(${fn})(${JSON.stringify(argument) ?? ''})`, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = (fn, label) => until(() => evaluate(fn), label, 7000);
  const navigate = async (path) => {
    await call('Page.navigate', { url: base + path });
    await waitFor(() => !!document.querySelector('.site-header') && !document.querySelector('.spinner'), path);
  };
  const click = async (selector) => {
    assert(await evaluate((selector) => { const item = document.querySelector(selector); if (!item) return false; item.click(); return true; }, selector), `Missing ${selector}`);
    await delay(140);
  };
  const screenshot = async (name) => {
    const { contentSize } = await call('Page.getLayoutMetrics');
    const { data } = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: contentSize.width, height: contentSize.height, scale: 1 } });
    await writeFile(resolve(output, name + '-full.png'), Buffer.from(data, 'base64'));
    const top = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(output, name + '-top.png'), Buffer.from(top.data, 'base64'));
  };
  const noOverflow = async (label) => {
    const sizes = await evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth, overflowing: [...document.querySelectorAll('main *')].filter((item) => item.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map((item) => item.className?.baseVal || item.className) }));
    assert(sizes.scroll <= sizes.width, `${label}: horizontal overflow ${JSON.stringify(sizes)}`);
  };
  await Promise.all([call('Page.enable'), call('Runtime.enable'), call('Network.enable')]);
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  if (process.argv.includes('--before')) {
    const exists = await access(resolve(output, 'shophub-before-home-1440-top.png')).then(() => true, () => false);
    if (exists) throw new Error('Baseline already exists. Keep the captured before images; do not overwrite them after modifying the UI.');
    for (const [name, file] of [['bazaar-home-1440','index.html'],['bazaar-detail-1440','product.html']]) {
      await call('Page.navigate', { url: (await import('node:url')).pathToFileURL(resolve('../docs/bazaar_template', file)).href });
      await waitFor(() => document.readyState === 'complete', name);
      await evaluate(async () => {
        for (let y=0; y<document.body.scrollHeight; y+=700) {
          window.scrollTo(0,y); await new Promise(done=>setTimeout(done,80));
        }
        window.scrollTo(0,0);
      });
      await delay(700);
      await screenshot(name);
      console.log('Captured ' + name);
    }
    for (const [name,path] of [['shophub-before-home-1440','/'],['shophub-before-detail-1440','/products/laptop-asus-vivobook-15-demo'],['shophub-before-products-1440','/products']]) {
      await navigate(path); await delay(300); await screenshot(name); console.log('Captured ' + name);
    }
  } else {
  if (navigationReview) await reviewNavigation({ call, evaluate, waitFor, navigate, click, noOverflow, report, output });
  await navigate('/');
  await waitFor(() => document.querySelectorAll('.pcard').length === 20, 'home cards');
  assert.equal(await evaluate(() => document.querySelectorAll('.flash-item').length), 4);
  assert.equal(await evaluate(() => document.querySelectorAll('.promo-card').length), 2);
  assert.equal(await evaluate(() => document.querySelectorAll('.spot').length), 3);
  assert.equal(await evaluate(() => getComputedStyle(document.querySelector('.site-header')).backgroundColor), 'rgb(202, 24, 51)');
  await waitFor(() => [...document.querySelectorAll('.spot img')].every((item) => item.complete && item.naturalWidth > 0), 'banner images');
  await evaluate(() => document.fonts.ready);
  assert(await evaluate(() => document.fonts.check('700 16px "Big Shoulders Display"')), 'Local display font loaded');
  assert(await evaluate(() => document.fonts.check('400 16px "IBM Plex Sans"')), 'Local body font loaded');
  assert(await evaluate(() => {
    const probe = document.createElement('article');
    probe.className = 'pcard';
    document.body.append(probe);
    const isolated = getComputedStyle(probe).borderTopStyle === 'none';
    probe.remove();
    return isolated;
  }), 'Storefront CSS must not style matching classes outside its root');
  await noOverflow('desktop home');
  await screenshot('shophub-after-home-1440');
  report.push('Desktop /: red Bazaar header, 2-column hero and 2 promo cards, 3 banners, 4 flash cards and 20 standard cards, local fonts/images, no horizontal overflow; CSS isolation checked.');
  await click('[aria-label="Banner tiếp theo"]');
  assert((await evaluate(() => document.querySelector('.deal-body h2').textContent)).includes('Nâng cấp nhỏ'));
  await click('[aria-label="Banner trước"]');
  assert((await evaluate(() => document.querySelector('.deal-body h2').textContent)).includes('Nâng tầm'));
  await click('[aria-label="Banner 3"]');
  assert((await evaluate(() => document.querySelector('.deal-body h2').textContent)).includes('Nhà gọn'));
  report.push('React carousel: next, previous, dot selection update slide and category destination.');
  await evaluate(() => { document.querySelector('#header-search').value = 'ssd'; document.querySelector('#header-category').value = 'linh-kien-phu-kien'; document.querySelector('.searchbar').requestSubmit(); });
  await waitFor(() => document.querySelectorAll('.listing-grid .pcard').length === 1, 'header search');
  assert.equal(await evaluate(() => new URLSearchParams(location.search).get('q')), 'ssd');
  assert.equal(await evaluate(() => new URLSearchParams(location.search).get('category')), 'linh-kien-phu-kien');
  await evaluate(() => history.back());
  await waitFor(() => location.pathname === '/' && !!document.querySelector('.deal-carousel'), 'browser Back to home');
  report.push('Header search submits keyword/category via Router; browser Back restores previous route.');
  for (const [title, slug] of [['Laptop', 'laptop'], ['Linh kiện và phụ kiện', 'linh-kien-phu-kien'], ['Thiết bị gia dụng', 'thiet-bi-gia-dung']]) {
    await click(`[aria-label="Tất cả ${title}"]`);
    await waitFor(() => !!document.querySelector('.listing-grid'), `category ${slug}`);
    assert.equal(await evaluate(() => new URLSearchParams(location.search).get('category')), slug);
    assert.equal(await evaluate(() => document.querySelectorAll('.listing-grid .pcard').length), 5);
    assert.equal(await evaluate(() => document.querySelector('.page-heading h1').textContent), title);
    await click('.brand');
  }
  report.push('All three category Tất cả links navigate to correct URL and show 5 matching demo products.');
  await click('[aria-label="Tất cả Khuyến mãi"]');
  assert.equal(await evaluate(() => new URLSearchParams(location.search).get('promotion')), '1');
  await click('.brand');
  await click('[aria-label="Tất cả Sản phẩm mới"]');
  assert.equal(await evaluate(() => new URLSearchParams(location.search).get('sort')), 'newest');
  await navigate('/products?category=laptop');
  await click('.pname a[href="/products/laptop-asus-vivobook-15-demo"]');
  await waitFor(() => !!document.querySelector('.pdp-info'), 'detail');
  await screenshot('shophub-after-detail-1440');
  assert((await evaluate(() => document.querySelector('.sku').textContent)).includes('UI-ASUS-V15-BLACK'));
  await evaluate(() => [...document.querySelectorAll('.opt-btn')].find((item) => item.textContent.includes('Bạc')).click());
  await waitFor(() => document.querySelector('.sku').textContent.includes('UI-ASUS-V15-SILVER'), 'silver SKU');
  assert((await evaluate(() => document.querySelector('.pdp-price .now').textContent)).includes('16.290.000'));
  assert((await evaluate(() => document.querySelector('.pdp-meta .stock-label').textContent)).includes('Tạm hết hàng'));
  await click('[aria-label="Xem hình 2"]');
  assert.equal(await evaluate(() => document.querySelector('[aria-label="Xem hình 2"]').getAttribute('aria-pressed')), 'true');
  await noOverflow('desktop detail');
  await screenshot('shophub-after-detail-variant-1440');
  await click('#tab-specs');
  assert.equal(await evaluate(() => document.querySelector('#panel-specs').hidden), false);
  await evaluate(() => document.querySelector('#product-tabs').scrollIntoView({ block: 'start' }));
  await screenshot('shophub-after-detail-specs-1440');
  await click('#tab-warranty');
  assert.equal(await evaluate(() => document.querySelector('#panel-warranty').hidden), false);
  await click('#tab-reviews');
  assert.equal(await evaluate(() => document.querySelector('#panel-reviews').hidden), false);
  await click('#tab-description');
  await evaluate(() => document.querySelector('#tab-description').focus());
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' });
  assert.equal(await evaluate(() => document.activeElement.id), 'tab-specs');
  await click('#tab-description');
  report.push('Product tabs: descriptions, specs, warranty, roving keyboard focus and selected panels work.');
  await evaluate(() => [...document.querySelectorAll('.opt-btn')].find((item) => item.textContent.includes('Đen')).click());
  await waitFor(() => document.querySelector('.sku').textContent.includes('UI-ASUS-V15-BLACK'), 'black SKU');
  assert((await evaluate(() => document.querySelector('.pdp-price .now').textContent)).includes('15.990.000'));
  assert((await evaluate(() => document.querySelector('.pdp-meta .stock-label').textContent)).includes('Còn hàng (8)'));
  report.push('Detail click-through, gallery selection, both variant directions: SKU, VND price and stock update correctly.');
  await navigate('/products');
  assert.equal(await evaluate(() => document.querySelectorAll('.listing-grid .pcard').length), 8);
  await click('[aria-label="Trang 2"]');
  assert.equal(await evaluate(() => document.querySelectorAll('.listing-grid .pcard').length), 7);
  assert.equal(await evaluate(() => new URLSearchParams(location.search).get('page')), '2');
  await navigate('/products');
  await evaluate(() => {
    document.querySelector('#list-search').value = 'chuot';
    document.querySelector('#catalog-filters').requestSubmit();
  });
  await waitFor(() => document.querySelectorAll('.listing-grid .pcard').length === 1, 'accent insensitive search');
  assert((await evaluate(() => document.querySelector('.pname').textContent)).includes('Chuột'));
  await navigate('/products');
  await evaluate(() => {
    document.querySelector('#filter-category').value = 'laptop';
    document.querySelector('#filter-brand').value = 'asus';
    document.querySelector('#filter-min').value = '15000000';
    document.querySelector('#filter-max').value = '17000000';
    document.querySelector('#catalog-filters').requestSubmit();
  });
  await waitFor(() => document.querySelectorAll('.listing-grid .pcard').length === 1, 'combined filters');
  assert((await evaluate(() => document.querySelector('.pname').textContent)).includes('Vivobook 15'));
  await evaluate(() => {
    document.querySelector('#filter-min').value = '18000000';
    document.querySelector('#filter-max').value = '17000000';
    document.querySelector('#catalog-filters').requestSubmit();
  });
  await waitFor(() => document.querySelector('#price-error').textContent.includes('Giá tối đa'), 'price validation');
  await navigate('/products?sort=price_asc&in_stock=1');
  assert.equal(await evaluate(() => document.querySelector('.result-total').textContent), '14 sản phẩm');
  assert.equal(await evaluate(() => document.querySelectorAll('.listing-grid .sold-out').length), 0);
  const prices = await evaluate(() => [...document.querySelectorAll('.pprice .now')].map((item) => Number(item.textContent.replace(/\D/g, ''))));
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  await navigate('/products?q=doesnotexist');
  assert.equal(await evaluate(() => !!document.querySelector('.empty-state')), true);
  await click('.empty-state .btn-bz');
  assert.equal(await evaluate(() => document.querySelectorAll('.listing-grid .pcard').length), 8);
  await screenshot('shophub-after-products-1440');
  report.push('List: pagination 8/7, accent-insensitive search, combined category/brand/price filters, invalid price feedback, sort, in-stock, empty state and reset.');
  await navigate('/products/no-such-product');
  assert((await evaluate(() => document.querySelector('main h1').textContent)).includes('Không tìm thấy sản phẩm'));
  await navigate('/not-a-route');
  assert((await evaluate(() => document.querySelector('main h1').textContent)).includes('Trang này chưa có'));
  report.push('Unknown product slug and unknown route render explicit 404 states.');
  for (const width of [390, 320]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
    for (const path of ['/', '/products', '/products/laptop-asus-vivobook-15-demo']) {
      await navigate(path);
      await noOverflow(`${width}px ${path}`);
      if (width === 390) await screenshot(`shophub-after-${path === '/' ? 'home' : path === '/products' ? 'products' : 'detail'}-390`);
    }
    await click('[aria-label="Mở danh mục"]');
    await waitFor(() => document.querySelector('#mobile-menu').open, 'mobile menu open');
    assert.equal(await evaluate(() => document.activeElement.getAttribute('aria-label')), 'Đóng danh mục');
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await waitFor(() => !document.querySelector('#mobile-menu').open, 'mobile menu Escape');
    await click('[aria-label="Mở danh mục"]');
    await click('#mobile-menu a[href="/products?category=thiet-bi-gia-dung"]');
    await waitFor(() => new URLSearchParams(location.search).get('category') === 'thiet-bi-gia-dung', 'mobile category navigation');
    assert.equal(await evaluate(() => document.querySelector('#mobile-menu').open), false);
    assert.equal(await evaluate(() => document.body.style.overflow), '');
  }
  report.push('Mobile 390px and 320px: all three routes fit without horizontal overflow; menu focus, Escape, category navigation and scroll restoration pass.');
  assert.deepEqual(errors, [], `Browser errors: ${JSON.stringify(errors)}`);
  report.push('No uncaught runtime errors or failed HTTP asset responses during the catalog checks.');
  await writeFile(resolve(output, 'browser-results.json'), JSON.stringify({ report, errors }, null, 2));
  console.log(JSON.stringify({ report, errors, screenshots: output }, null, 2));
  }
} finally {
  try { if (call) await call('Browser.close'); } catch {}
  ws?.close();
  chrome.kill();
  server.kill();
}
