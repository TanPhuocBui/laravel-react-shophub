import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';

// Chrome Network + Performance metrics. No screenshots, real HTTP only.
const arg = (key, fallback) => process.argv.find((a) => a.startsWith('--' + key + '='))?.split('=').slice(1).join('=') || fallback;
const label = arg('label', 'before');
const mode = arg('mode', 'local');
const cold = process.argv.includes('--cold');
const stress = process.argv.includes('--stress');
const delivery = process.argv.includes('--delivery');
const opcache = process.argv.includes('--opcache');
const baselineBundle = process.argv.includes('--baseline-bundle');
const resilience = process.argv.includes('--resilience');
if (!['local', 'dev', 'build'].includes(mode) || !/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid measurement mode/label');
if (mode === 'local' && (delivery || cold || resilience)) throw new Error('Only read-only measurements are permitted against daily local servers');
const root = resolve('../backend');
const out = resolve(root, 'storage/framework/testing');
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const children = [];
const php = process.env.CATALOG_PHP || 'D:/xampp/php/php.exe';
const freePort = () => new Promise((done) => { const socket = createServer(); socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(() => done(port)); }); });
const run = (command, args, cwd, env = process.env) => {
  const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: 'pipe' }); children.push(child);
  let log = ''; child.stdout.on('data', (data) => { log += data; }); child.stderr.on('data', (data) => { log += data; }); child.log = () => log;
  return child;
};
const complete = (child) => new Promise((done, reject) => { child.once('error', reject); child.once('exit', (code) => code === 0 ? done(child.log()) : reject(new Error(child.log()))); });
async function until(fn, limit = 30000) { const end = Date.now() + limit; while (Date.now() < end) { const result = await fn(); if (result) return result; await sleep(25); } return false; }
let base = 'http://localhost:5173', apiBase = 'http://localhost:8000', ws, password, metadata, env, apiServer, viteServer, startServers, startApi;
async function stop(child) { if (!child || child.exitCode !== null || child.signalCode !== null) return; const closed = new Promise((done) => child.once('exit', done)); child.kill(); await closed; }
const samples = [], requests = new Map(), exceptions = [];
let phase = '', productId, responseFailure;
try {
  if (mode !== 'local') {
    metadata = JSON.parse(await readFile(resolve(out, 'catalog-api-database.json'), 'utf8'));
    const server = JSON.parse((await readFile(resolve(out, 'catalog-test-server.json'), 'utf8')).replace(/^\uFEFF/, ''));
    if (!/^shophub_catalog_api_test_[a-f0-9]{10}$/.test(metadata.database)) throw new Error('Expected isolated test DB');
    apiBase = baselineBundle ? JSON.parse(await readFile(resolve(out, 'perf-before-build.json'), 'utf8')).config.apiBase : 'http://localhost:' + await freePort(); base = 'http://localhost:' + await freePort();
    password = randomBytes(24).toString('hex');
    env = { ...process.env, APP_ENV: 'local', APP_DEBUG: 'true', APP_URL: apiBase, DB_CONNECTION: 'mysql', DB_HOST: '127.0.0.1', DB_PORT: String(server.port), DB_DATABASE: metadata.database, DB_USERNAME: 'root', DB_PASSWORD: '', DB_URL: '',
      CATALOG_TEST_DATABASE: metadata.database, PERF_PASSWORD: password, SESSION_DRIVER: 'database', SESSION_COOKIE: 'perf_' + Date.now(), CACHE_STORE: 'database',
      LOG_CHANNEL: 'stderr', CORS_ALLOWED_ORIGINS: base, SANCTUM_STATEFUL_DOMAINS: base.replace('http://', '') + ',' + apiBase.replace('http://', ''),
      VITE_BACKEND_URL: apiBase, VITE_CATALOG_SOURCE: 'api', CATALOG_MEDIA_ROOT: resolve(out, 'perf-media') };
    console.log((await complete(run(php, ['scripts/perf-load-fixtures.php'], root, env))).trim());
    // This is the exact PHP child command observed under artisan serve. Owning it
    // directly also lets Windows cleanup close it without orphaning a child.
    if (mode === 'build' && !baselineBundle) {
      await complete(run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', 'node_modules/.cache/perf-build'], process.cwd(), env));
    }
    startApi = async () => {
      apiServer = run(php, [...(opcache ? ['-d', 'zend_extension=opcache', '-d', 'opcache.enable_cli=1', '-d', 'opcache.validate_timestamps=1', '-d', 'opcache.revalidate_freq=0'] : []), '-S', new URL(apiBase).host, resolve(root, 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')], resolve(root, 'public'), env);
      if (!await until(async () => apiServer.log().includes('Development Server'))) throw new Error('PHP server startup failed');
    };
    startServers = async () => {
      await startApi();
      viteServer = run(process.execPath, ['node_modules/vite/bin/vite.js', ...(mode === 'build' ? ['preview', '--outDir', baselineBundle ? 'node_modules/.cache/perf-build-baseline' : 'node_modules/.cache/perf-build'] : []), '--host', 'localhost', '--port', new URL(base).port, '--strictPort'], process.cwd(), env);
      if (!await until(async () => { try { return apiServer.log().includes('Development Server') && (await fetch(base)).ok; } catch { return false; } })) throw new Error('Servers failed ' + apiServer.log());
    };
    await startServers();
  }
  const profile = resolve('node_modules/.cache/perf-chrome-' + Date.now());
  run('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], process.cwd());
  let port;
  if (!await until(async () => { try { port = (await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; return port; } catch { return false; } })) throw new Error('Chrome startup failed');
  const page = (await (await fetch('http://localhost:' + port + '/json/list')).json()).find((p) => p.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((done) => ws.addEventListener('open', done, { once: true }));
  let sequence = 0; const pending = new Map();
  ws.addEventListener('message', ({ data }) => {
    const event = JSON.parse(data);
    if (event.id) { const p = pending.get(event.id); pending.delete(event.id); if (event.error) p.reject(new Error(JSON.stringify(event.error))); else p.done(event.result); }
    const p = event.params;
    if (event.method === 'Fetch.requestPaused' && responseFailure) responseFailure(p).catch((error) => exceptions.push({ phase, text: error.message }));
    if (event.method === 'Runtime.exceptionThrown') exceptions.push({ phase, text: p.exceptionDetails.text });
    if (event.method === 'Network.requestWillBeSent') requests.set(p.requestId, { phase, url: p.request.url.replace(base, '').replace(apiBase, ''), type: p.type, method: p.request.method, xsrf: Object.keys(p.request.headers).some((name) => name.toLowerCase() === 'x-xsrf-token'), start: p.timestamp });
    const r = requests.get(p?.requestId);
    if (r && event.method === 'Network.responseReceived') Object.assign(r, { status: p.response.status, headersMs: (p.timestamp - r.start) * 1000, timing: p.response.timing, cached: p.response.fromDiskCache });
    if (r && event.method === 'Network.loadingFinished') Object.assign(r, { totalMs: (p.timestamp - r.start) * 1000, bytes: p.encodedDataLength });
    if (r && event.method === 'Network.loadingFailed') Object.assign(r, { failed: p.errorText, canceled: p.canceled, totalMs: (p.timestamp - r.start) * 1000 });
  });
  const call = (method, params = {}) => new Promise((done, reject) => { const id = ++sequence; pending.set(id, { done, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (fn, arg) => { const r = await call('Runtime.evaluate', { expression: '(' + fn + ')(' + (JSON.stringify(arg) ?? '') + ')', returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  await Promise.all([call('Network.enable'), call('Page.enable'), call('Runtime.enable'), call('Performance.enable')]);
  await call('Page.addScriptToEvaluateOnNewDocument', { source: "window.__perfLongTasks=[]; new PerformanceObserver(l=>window.__perfLongTasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});" });
  const ready = (selector) => evaluate((selector) => !!document.querySelector(selector) && !document.querySelector('.admin-loading'), selector);
  async function navigate(path, selector, navigation = 'direct') {
    const start = Date.now();
    if (navigation === 'spa') {
      await evaluate((path) => { const anchor = document.querySelector('a[href="' + path + '"]'); if (anchor) anchor.click(); else { window.history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); } }, path);
    } else { await evaluate(() => { window.__perfLeaving = true; }); await call('Page.navigate', { url: base + path }); }
    const success = await until(async () => !await evaluate(() => !!window.__perfLeaving) && await ready(selector));
    return { success, readyMs: Date.now() - start };
  }
  const fill = (values) => evaluate((values) => { for (const [selector, value] of Object.entries(values)) { const e = document.querySelector(selector); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, value); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } }, values);
  const click = (selector) => evaluate((s) => document.querySelector(s).click(), selector);
  const publicPayload = await (await fetch(apiBase + '/api/public/products?per_page=1')).json();
  const slug = publicPayload.data[0].slug;
  if (mode !== 'local') {
    await navigate('/login', '.orbit-submit:not(:disabled)'); await fill({ '#email': 'perf-admin@shophub.invalid', '#password': password }); await click('.orbit-submit');
    if (!await until(() => evaluate(() => location.pathname === '/account'))) throw new Error('Login failed');
    productId = JSON.parse(await readFile(resolve(out, 'perf-fixture.json'), 'utf8')).id;
  }
  const pages = [['home', '/', '.hero'], ['products', '/products', '#catalog-filters'], ['detail', '/products/' + slug, '.pdp-grid'],
    ['admin', '/admin/categories', mode === 'local' ? '.admin-state h1' : '.admin-result'], ['specifications', '/admin/specifications', mode === 'local' ? '.admin-state h1' : '#field-config-category'],
    ['editor', '/admin/products/' + (productId || 1) + '/edit', mode === 'local' ? '.admin-state h1' : '.publication-context']];
  if (stress) {
    const { measureConcurrentPages } = await import('./perf-concurrent-pages.mjs');
    samples.push(...await measureConcurrentPages({ call, base, debugPort: port }));
  }
  if (delivery) {
    const { measureDeliveryFailure } = await import('./perf-delivery-failure.mjs');
    samples.push(...await measureDeliveryFailure({ call, evaluate, navigate, click, until, productId, armFailure: (handler) => { responseFailure = handler; } }));
  }
  if (resilience) {
    const { measureResilience } = await import('./perf-resilience-scenarios.mjs');
    samples.push(...await measureResilience({ call, evaluate, navigate, click, until, productId, apiBase, stopApi: () => stop(apiServer), restartApi: startApi }));
  }
  if (cold && mode !== 'local') {
    for (let round = 1; round <= 5; round++) for (const [name, path, selector] of pages.filter(([name]) => ['home','admin'].includes(name))) {
      await call('Page.navigate', { url: 'about:blank' }); await stop(viteServer); await stop(apiServer); await startServers(); await call('Network.clearBrowserCache');
      phase = name + '-cold-' + round;
      const sample = { phase, page: name, navigation: 'cold', round, ...(await navigate(path, selector)), reloads: 0 };
      samples.push(sample); console.log(JSON.stringify(sample));
    }
  }
  if (!cold && !stress && !delivery && !resilience) for (const navigation of ['direct', 'spa']) {
    for (let round = 1; round <= 5; round++) for (const [name, path, selector] of pages) {
      phase = name + '-' + navigation + '-' + round;
      const sample = { phase, page: name, navigation, round, ...(await navigate(path, selector, navigation)), reloads: 0 };
      sample.metrics = (await call('Performance.getMetrics')).metrics.filter((m) => ['TaskDuration', 'ScriptDuration', 'LayoutDuration'].includes(m.name));
      sample.longTasks = await evaluate(() => window.__perfLongTasks || []);
      samples.push(sample); console.log(JSON.stringify({ phase, ms: sample.readyMs, success: sample.success }));
    }
  }
  if (mode !== 'local' && !cold && !stress && !delivery && !resilience) {
    for (let round = 1; round <= 5; round++) {
      await navigate('/admin/products/' + productId + '/edit', '.publication-context');
      for (const action of ['save-specifications', 'publish', 'hide', 'republish']) {
        phase = action + '-' + round;
        const start = Date.now();
        if (action === 'save-specifications') {
          await fill({ '[name="values.0.value"]': String(16 + round) });
          await click('.product-publishing form button');
        } else if (action === 'hide') {
          await click('.publication-context .admin-danger'); await until(() => ready('.admin-confirm[open]')); await click('.admin-confirm .admin-danger');
        } else {
          const exists = await ready('[data-testid="publish-product"]');
          if (!exists) { samples.push({ phase, action, round, skipped: 'Already active' }); continue; }
          await click('[data-testid="publish-product"]');
        }
        const success = await until(async () => {
          if (action === 'save-specifications') return await evaluate(() => !!document.querySelector('.publication-context') && document.querySelector('.product-publishing').textContent.includes('Đã lưu thông số kỹ thuật.'));
          return await evaluate((hidden) => document.querySelector('.publication-context h3')?.textContent === (hidden ? 'Đã ẩn' : 'Đang công khai') && !document.querySelector('.admin-confirm'), action === 'hide');
        });
        samples.push({ phase, action, round, readyMs: Date.now() - start, success, reloads: 0 });
        console.log(JSON.stringify(samples.at(-1)));
        if (!success) throw new Error('Mutation failed; not automatically retried: ' + phase);
      }
      // Restore inactive so each next publish measures the actual transition.
      await click('.publication-context .admin-danger'); await until(() => ready('.admin-confirm[open]')); await click('.admin-confirm .admin-danger');
      await until(() => evaluate(() => document.querySelector('.publication-context h3')?.textContent === 'Đã ẩn'));
    }
  }
  await sleep(500);
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'perf-' + label + '-' + mode + (cold ? '-cold' : stress ? '-stress' : delivery ? '-delivery' : resilience ? '-resilience' : '') + (opcache ? '-opcache' : '') + '.json'), JSON.stringify({ label, mode, database: metadata?.database, config: { base, apiBase, sessions: mode === 'local' ? 'existing' : 'database', vite: mode, opcache, baselineBundle }, samples, requests: [...requests.values()], exceptions }, null, 2));
  console.log('RESULT ' + samples.length + ' samples; ' + exceptions.length + ' Runtime exceptions.');
} catch (error) {
  await writeFile(resolve(out, 'perf-failure-' + label + '-' + mode + '.json'), JSON.stringify({ message: error.message, samples, requests: [...requests.values()], exceptions }, null, 2));
  throw error;
} finally {
  ws?.close();
  for (const child of children.reverse()) if (child.exitCode === null && child.signalCode === null) child.kill();
}
