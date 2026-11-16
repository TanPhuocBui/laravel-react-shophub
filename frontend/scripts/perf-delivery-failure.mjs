// The server executes a real write; CDP drops only delivery of its response.
// No fabricated API payloads and no automatic repeat writes.
export async function measureDeliveryFailure({ call, evaluate, navigate, click, until, productId, armFailure }) {
  const samples = [];
  for (let round = 1; round <= 5; round++) {
    await navigate('/admin/products/' + productId + '/edit', '.publication-context');
    if (await evaluate(() => !!document.querySelector('[data-testid="publish-product"]'))) {
      await click('[data-testid="publish-product"]');
      if (!await until(() => evaluate(() => document.querySelector('.publication-context h3')?.textContent === 'Đang công khai'))) throw new Error('Fixture publication failed');
    }
    let dropped = 0;
    await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/admin/products/' + productId + '/hide', requestStage: 'Response' }] });
    armFailure(async (request) => {
      if (request.request.method === 'POST' && request.responseStatusCode === 200) {
        dropped++;
        await call('Fetch.failRequest', { requestId: request.requestId, errorReason: 'ConnectionClosed' });
      } else await call('Fetch.continueResponse', { requestId: request.requestId });
    });
    const start = Date.now();
    await click('.publication-context .admin-danger'); await until(() => evaluate(() => !!document.querySelector('.admin-confirm[open]'))); await click('.admin-confirm .admin-danger');
    if (!await until(() => evaluate(() => !!document.querySelector('#publishing-message')))) throw new Error('Missing write-error feedback');
    await call('Fetch.disable'); armFailure(null);
    const check = await evaluate(() => !!document.querySelector('[data-testid="check-publication-result"]'));
    const feedback = await evaluate(() => document.querySelector('#publishing-message').textContent);
    const actionDisabled = await evaluate(() => !document.querySelector('.publication-context .admin-danger') || document.querySelector('.publication-context .admin-danger').disabled);
    if (check) {
      await click('[data-testid="check-publication-result"]');
      if (!await until(() => evaluate(() => document.querySelector('.publication-context h3')?.textContent === 'Đã ẩn'))) throw new Error('Read-only reconciliation failed');
    } else await navigate('/admin/products/' + productId + '/edit', '.publication-context');
    const status = await evaluate(() => document.querySelector('.publication-context h3').textContent);
    samples.push({ action: 'lost-write-response', round, dropped, hasReadOnlyCheck: check, blockedRepeat: actionDisabled, feedback, finalStatus: status, readyMs: Date.now()-start, reloads: check ? 0 : 1 });
    console.log('DELIVERY ' + JSON.stringify(samples.at(-1)));
  }
  return samples;
}
