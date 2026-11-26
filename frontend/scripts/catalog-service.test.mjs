import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Execute the actual service module with a controllable HTTP transport and clock.
// No React/production imports or dependency additions are needed.
async function setup() {
  let clock = 0;
  const calls = [];
  const context = vm.createContext({ DOMException, URLSearchParams, AbortController, Date: { now: () => clock } });
  const api = { get: (path, options = {}) => new Promise((resolve, reject) => calls.push({ path, options, resolve, reject })) };
  const http = new vm.SyntheticModule(['default'], function () { this.setExport('default', api); }, { context });
  const utils = new vm.SyntheticModule(['filterProducts'], function () { this.setExport('filterProducts', () => []); }, { context });
  const source = await readFile(new URL('../src/services/catalogService.js', import.meta.url), 'utf8');
  const module = new vm.SourceTextModule(source, { context, initializeImportMeta: (meta) => { meta.env = {}; } });
  await module.link((name) => name === '../api/axios' ? http : utils);
  await module.evaluate();
  return { service: module.namespace, calls, advance: (ms) => { clock += ms; } };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
const metadata = (call) => call.resolve({ data: { data: [] } });
const products = (call) => call.resolve({ data: { data: [], meta: { total: 0 } } });

test('metadata shares in-flight GETs, handles subscriber cancellation, expires and force-refreshes', async () => {
  const { service, calls, advance } = await setup();
  const canceled = new AbortController();
  const one = service.getCatalog({ signal: canceled.signal });
  const two = service.getCatalog();
  assert.equal(calls.length, 2);
  canceled.abort();
  await assert.rejects(one, { name: 'AbortError' });
  calls.forEach(metadata);
  assert.equal((await two).categories.length, 0);
  await service.getCatalog();
  assert.equal(calls.length, 2);
  advance(30001);
  const expired = service.getCatalog();
  assert.equal(calls.length, 4);
  calls.slice(2).forEach(metadata);
  await expired;
  const forced = service.getCatalog({ force: true });
  assert.equal(calls.length, 6);
  calls.slice(4).forEach(metadata);
  await forced;
});

test('metadata failure is independent, never cached, and recovers on the next request', async () => {
  const { service, calls } = await setup();
  const result = service.getCatalog();
  calls[0].reject({ response: { status: 503 } });
  metadata(calls[1]);
  const failed = await result;
  assert.match(failed.errors.categories, /Máy chủ đang gặp sự cố/);
  assert.equal(failed.errors.brands, '');
  const retry = service.getCatalog();
  assert.equal(calls.length, 3);
  assert.equal(calls[2].path, '/api/public/categories');
  metadata(calls[2]);
  assert.equal((await retry).errors.categories, '');
});

test('home strips run at most two GETs, discard canceled queued work, and leave detail requests independent', async () => {
  const { service, calls } = await setup();
  const canceled = new AbortController();
  const jobs = [0, 1, 2, 3].map((page) => service.getHomeProducts({ page }, page === 3 ? { signal: canceled.signal } : {}));
  assert.equal(calls.length, 2);
  canceled.abort();
  await assert.rejects(jobs[3], { name: 'AbortError' });
  const detail = service.getProductDetail('independent');
  assert.equal(calls[2].path, '/api/public/products/independent');
  calls[2].resolve({ data: { data: { category: { slug: 'laptop' }, images: [], variants: [] } } });
  await detail;
  products(calls[0]);
  await flush();
  assert.equal(calls.length, 4);
  assert.equal(calls[3].options.params.page, 2);
  products(calls[1]);
  products(calls[3]);
  await Promise.all(jobs.slice(0, 3));
  await flush();
  assert.equal(calls.length, 4);
});

test('timeout, HTTP, validation and network failures are distinct and never retried automatically', async () => {
  const { service, calls } = await setup();
  const faults = [
    [{ code: 'ECONNABORTED' }, 'timeout', undefined],
    [{ response: { status: 503 } }, 'http', 503],
    [{ response: { status: 422, data: { errors: { page: ['Trang chưa hợp lệ.'] } } } }, 'http', 422],
    [{ code: 'ERR_NETWORK' }, 'network', undefined],
  ];
  for (const [fault, kind, status] of faults) {
    const pending = service.getProducts();
    calls.at(-1).reject(fault);
    await assert.rejects(pending, (error) => error.kind === kind && error.status === status);
  }
  await flush();
  assert.equal(calls.length, faults.length);
});
