import assert from 'node:assert/strict';

export async function measureResilience({ call, evaluate, navigate, click, until, stopApi, restartApi, productId, apiBase }) {
  const samples = [];
  for (let round = 1; round <= 5; round++) {
    await stopApi();
    await navigate('/admin/categories', '.admin-state[role="alert"]');
    assert(await evaluate(() => document.body.textContent.includes('Chưa thể kiểm tra phiên đăng nhập')));
    await restartApi(); await click('.admin-state button');
    assert(await until(() => evaluate(() => !!document.querySelector('.admin-result'))));
    samples.push({ scenario: 'startup-api-unavailable', round, success: true, reloads: 0 });

    await call('Network.setBlockedURLs', { urls: ['*/api/public/products?category=*&per_page=6*'] });
    await navigate('/products/public-demo-laptop-1', '.pdp-grid');
    assert(await until(() => evaluate(() => !!document.querySelector('section[aria-label="Sản phẩm cùng danh mục"] [role="alert"]'))));
    assert(await evaluate(() => !!document.querySelector('.sku') && !document.querySelector('#tab-specs').disabled));
    await call('Network.setBlockedURLs', { urls: [] });
    await click('section[aria-label="Sản phẩm cùng danh mục"] button');
    assert(await until(() => evaluate(() => !!document.querySelector('section[aria-label="Cùng danh mục"] .pcard'))));
    samples.push({ scenario: 'optional-related-request-fails', round, success: true, reloads: 0 });
  }
  await navigate('/admin/products/' + productId + '/edit', '.publication-context');
  const result = await evaluate(async ({ apiBase, productId }) => {
    const url = apiBase + '/api/admin/products/' + productId;
    const before = await (await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } })).json();
    const response = await fetch(url + '/publish', { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' } });
    const after = await (await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } })).json();
    return { status: response.status, unchanged: before.data.status === after.data.status };
  }, { apiBase, productId });
  assert.equal(result.status, 419); assert(result.unchanged);
  samples.push({ scenario: 'unsafe-post-still-requires-csrf', success: true, ...result });
  console.log('RESILIENCE ' + JSON.stringify(samples));
  return samples;
}
