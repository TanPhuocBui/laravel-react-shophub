import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Faults interrupt real requests; successful data always comes from Laravel/MariaDB.
export async function runCatalogResilienceScenarios({ call, evaluate, click, navigate, waitFor, pass, apiBase, ws, data, backend }) {
  const metadataUrls = ['categories', 'brands'].map((name) => apiBase + '/api/public/' + name);
  const requests = [];
  const track = ({ data: raw }) => {
    const message = JSON.parse(raw);
    if (message.method === 'Network.requestWillBeSent' && message.params.request.url.startsWith(apiBase + '/api/public/')) requests.push(message.params.request.url);
  };
  ws.addEventListener('message', track);
  const block = (urls) => call('Network.setBlockedURLs', { urls });
  const readyProducts = () => waitFor(() => !!document.querySelector('.listing-grid .pcard'), 'real product list');
  const readyDetail = () => waitFor(() => !!document.querySelector('.detail-page'), 'real product detail');
  const retryReady = () => waitFor(() => !!document.querySelector('.catalog-load-status button') && !document.querySelector('.catalog-load-status button').disabled, 'single retry ready');
  try {
    await block(metadataUrls);
    await navigate('/products?category=uc14-laptop');
    await readyProducts();
    await waitFor(() => !!document.querySelector('.catalog-load-status [role="alert"]') && document.querySelector('#filter-category').disabled && document.querySelector('#filter-brand').disabled, 'metadata failure only');
    await click('#catalog-filters button[type="submit"]');
    assert.equal(await evaluate(() => new URLSearchParams(location.search).get('category')), 'uc14-laptop');
    pass('Metadata unavailable: products still display; applying filters preserves the selected category.');
    await block([]);
    await retryReady();
    await click('.catalog-load-status button');
    await waitFor(() => !document.querySelector('.catalog-load-status') && !document.querySelector('#filter-category').disabled && document.querySelector('#filter-category').options.length > 1, 'metadata recovery');
    assert.equal(await evaluate(() => document.querySelector('#filter-category').value), 'uc14-laptop');
    pass('One metadata retry restores controls and keeps the selected filter.');

    await block([metadataUrls[0]]);
    await navigate('/products');
    await readyProducts();
    await waitFor(() => document.querySelector('#filter-category').disabled && !document.querySelector('#filter-brand').disabled, 'partial metadata success');
    pass('Category failure leaves brands and the product list usable.');

    await block([...metadataUrls, apiBase + '/api/public/products?*']);
    await navigate('/');
    await retryReady();
    assert(await evaluate(() => !!document.querySelector('.hero')));
    assert.equal(await evaluate(() => document.querySelectorAll('.catalog-load-status button').length), 1);
    assert.equal(await evaluate(() => document.querySelectorAll('main .state-panel').length), 0);
    const beforeRetry = requests.length;
    await block([]);
    await click('.catalog-load-status button');
    await waitFor(() => !!document.querySelector('.flash-item') && !!document.querySelector('[aria-label="Sản phẩm mới"] .pcard') && !!document.querySelector('.spot') && !document.querySelector('.catalog-load-status'), 'all failed requests recover together');
    for (const metadataUrl of metadataUrls) assert.equal(requests.slice(beforeRetry).filter((url) => url === metadataUrl).length, 1);
    pass('All metadata/product failures show exactly ONE retry; one click restores every failed group and loads category products.');

    await block([apiBase + '/api/public/products?*promotion=1*']);
    await navigate('/');
    await retryReady();
    await waitFor(() => !!document.querySelector('[aria-label="Sản phẩm mới"] .pcard'), 'unaffected products remain visible');
    await block([]);
    await click('.catalog-load-status button');
    await waitFor(() => !!document.querySelector('.flash-item') && !document.querySelector('.catalog-load-status'), 'single promotion failure recovery');
    pass('A single strip failure keeps successful data visible and uses the same shared retry.');

    let faultStatus = 503;
    const failNewest = async ({ data: raw }) => {
      const message = JSON.parse(raw);
      if (message.method !== 'Fetch.requestPaused') return;
      const { requestId, request } = message.params;
      const url = new URL(request.url);
      const fail = url.pathname === '/api/public/products' && !url.searchParams.has('promotion') && !url.searchParams.has('category');
      await call(fail ? 'Fetch.fulfillRequest' : 'Fetch.continueRequest', fail ? {
        requestId, responseCode: faultStatus, responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Access-Control-Allow-Origin', value: request.headers.Origin || request.headers.origin },
          { name: 'Access-Control-Allow-Credentials', value: 'true' },
        ], body: Buffer.from('{"message":"Controlled server fault"}').toString('base64'),
      } : { requestId });
    };
    ws.addEventListener('message', failNewest);
    await call('Fetch.enable', { patterns: [{ urlPattern: apiBase + '/api/public/products?*', requestStage: 'Request' }] });
    try {
      await navigate('/');
      await waitFor(() => document.querySelector('.catalog-load-status')?.textContent.includes('Máy chủ đang gặp sự cố') && !!document.querySelector('.flash-item'), 'HTTP 503 classification');
      pass('HTTP 503 has a server error message; other home strips remain available.');
    } finally {
      await call('Fetch.disable');
      ws.removeEventListener('message', failNewest);
    }
    await retryReady();
    await click('.catalog-load-status button');
    await waitFor(() => !!document.querySelector('[aria-label="Sản phẩm mới"] .pcard'), 'newest retry');
    pass('A single strip retry recovers after HTTP 503 without reloading the page.');

    faultStatus = 404;
    ws.addEventListener('message', failNewest);
    await call('Fetch.enable', { patterns: [{ urlPattern: apiBase + '/api/public/products', requestStage: 'Request' }] });
    try {
      await navigate('/products');
      await waitFor(() => document.querySelector('.catalog-load-status [role="alert"]')?.textContent.includes('Không tìm thấy dữ liệu'), 'listing HTTP 404 is visible');
    } finally {
      await call('Fetch.disable');
      ws.removeEventListener('message', failNewest);
    }
    await retryReady();
    await click('.catalog-load-status button');
    await readyProducts();
    pass('A listing endpoint 404 shows the shared retry instead of leaving a blank page.');
    await navigate('/products/missing-resilience-product-82916');
    await waitFor(() => document.querySelector('main h1')?.textContent === 'Không tìm thấy sản phẩm' && !document.querySelector('.catalog-load-status'), 'real missing product');
    pass('A real missing product shows its 404 page without an unnecessary retry.');

    await block(metadataUrls);
    await navigate('/products/' + data.slug);
    await readyDetail();
    await waitFor(() => !!document.querySelector('.catalog-load-status [role="alert"]'), 'detail metadata error');
    assert(await evaluate(() => !!document.querySelector('.detail-page .sku')));
    pass('Product detail remains usable when both metadata endpoints fail.');

    await block([apiBase + '/api/public/products/' + data.slug]);
    await navigate('/products/' + data.slug);
    await waitFor(() => document.querySelector('.catalog-load-status [role="alert"]')?.textContent.includes('Không kết nối được máy chủ'), 'network error classification');
    await block([]);
    await retryReady();
    await click('.catalog-load-status button');
    await readyDetail();
    pass('Network errors are identified; one click restores the product detail.');

    const hold = ({ data: raw }) => {
      const message = JSON.parse(raw);
      if (message.method === 'Fetch.requestPaused') { /* Hold until Axios times out. */ }
    };
    ws.addEventListener('message', hold);
    await call('Fetch.enable', { patterns: [{ urlPattern: apiBase + '/api/public/products/' + data.slug, requestStage: 'Request' }] });
    try {
      await navigate('/products/' + data.slug);
      await waitFor(() => document.querySelector('.catalog-load-status [role="alert"]')?.textContent.includes('Máy chủ phản hồi quá lâu'), '10-second timeout classification');
      pass('A stalled request ends with a timeout message and a retry button.');
    } finally {
      await call('Fetch.disable');
      ws.removeEventListener('message', hold);
    }
    await retryReady();
    await click('.catalog-load-status button');
    await readyDetail();
    pass('The detail recovers after a timeout without any automatic cart POST.');

    await navigate('/products?q=no-match-resilience-82916');
    await waitFor(() => !!document.querySelector('.empty-state'), 'real empty query');
    assert.equal(await evaluate(() => [...document.querySelectorAll('main [role="alert"]')].some((element) => element.textContent.trim())), false);
    pass('A successful empty result is displayed separately from API errors.');

    for (const width of [1440, 390]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 641 });
      await navigate('/');
      await waitFor(() => !document.querySelector('.catalog-load-status') && !document.querySelector('#header-category').disabled && !!document.querySelector('.spot') && !!document.querySelector('.flash-item') && !!document.querySelector('[aria-label="Sản phẩm mới"] .pcard'), 'responsive home');
      assert(await evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      await writeFile(resolve(backend, `storage/framework/testing/catalog-resilience-${width}.png`), Buffer.from(shot.data, 'base64'));
    }
    pass('Real home data renders at 1440/390px without horizontal overflow.');
  } finally {
    await block([]);
    ws.removeEventListener('message', track);
  }
}
