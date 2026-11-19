import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function runCartScenarios({ call, evaluate, click, fill, navigate, waitFor, browserApi, pass, mutations, login, apiBase, ws, fixture, data, password, demo }) {
  const path = '/products/' + data.slug;
  const submit = '[data-testid="cart-add-submit"]';
  const check = '[data-testid="cart-check-result"]';
  const first = data.variants[0].id;
  const second = data.variants[1].id;
  const writes = () => mutations.filter((r) => r.url === '/api/customer/cart/items' && r.method === 'POST').length;
  const ready = () => waitFor(() => !!document.querySelector('#cart-quantity') && !document.querySelector('.cart-add')?.textContent.includes('Đang kiểm tra phiên'), 'cart form ready');
  const open = async () => { await navigate(path); await ready(); };
  const success = () => waitFor(() => !!document.querySelector('[data-testid="cart-success"]'), 'cart success');
  const summary = async (id = first) => (await browserApi('/api/customer/cart/summary?product_variant_id=' + id)).data.data;
  const select = async (index) => {
    await evaluate((index) => { const button = document.querySelectorAll('.opt-btn')[index]; button.focus(); button.click(); }, index);
    await waitFor((index) => document.querySelectorAll('.opt-btn')[index]?.getAttribute('aria-pressed') === 'true', 'selected SKU', index);
  };
  const logout = () => evaluate(async (origin) => {
    await fetch(origin + '/sanctum/csrf-cookie', { credentials: 'include' });
    const token = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.slice(11);
    const response = await fetch(origin + '/logout', { method: 'POST', credentials: 'include', headers: { Accept: 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(token) } });
    if (response.status !== 204) throw new Error('Test logout failed.');
  }, apiBase);
  const intercept = async (stage, handler, action) => {
    const errors = [];
    const listener = async ({ data: message }) => {
      const event = JSON.parse(message);
      if (event.method !== 'Fetch.requestPaused') return;
      const request = event.params;
      try {
        if (request.request.method === 'POST') await handler(request);
        else await call(stage === 'Request' ? 'Fetch.continueRequest' : 'Fetch.continueResponse', { requestId: request.requestId });
      } catch (error) { errors.push(error.message); }
    };
    ws.addEventListener('message', listener);
    await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/customer/cart/items', requestStage: stage }] });
    try { await action(); }
    finally { await call('Fetch.disable'); ws.removeEventListener('message', listener); }
    assert.deepEqual(errors, []);
  };

  if (demo) {
    const before = writes();
    await navigate('/products/laptop-asus-vivobook-15-demo');
    await waitFor(() => document.querySelector('.cart-add')?.textContent.includes('Dữ liệu demo'), 'demo cart notice');
    assert(!await evaluate(() => !!document.querySelector('[data-testid="cart-add-submit"]')));
    await select(1);
    assert.equal(writes(), before);
    pass('Demo catalog keeps variant browsing and displays a demo notice; no real cart POST or action is available.');
    return;
  }

  await open(); await select(1); await fill({ '#cart-quantity': '2' });
  const beforeGuest = writes();
  await click(submit);
  await waitFor(() => location.pathname === '/login' && !document.querySelector('.orbit-submit')?.disabled, 'guest login');
  await click('.orbit-switch a');
  await waitFor(() => location.pathname === '/register' && !!document.querySelector('#name'), 'registration');
  const email = `uc14-new-${Date.now()}@shophub.invalid`;
  await fill({ '#name': 'Khách kiểm thử UC14', '#email': email, '#password': password, '#password_confirmation': password });
  await click('.orbit-submit');
  await waitFor(() => location.pathname === '/login' && !!document.querySelector('.orbit-notice[role="status"]'), 'registered login');
  await fill({ '#password': password }); await click('.orbit-submit');
  await waitFor((slug) => location.pathname === '/products/' + slug && !!document.querySelector('#cart-quantity'), 'return product', data.slug);
  await ready();
  assert.equal(await evaluate(() => document.querySelector('.opt-btn[aria-pressed="true"]').textContent), 'Bạc');
  assert.equal(await evaluate(() => document.querySelector('#cart-quantity').value), '2');
  assert.equal(writes(), beforeGuest);
  await click(submit); await success();
  assert.equal((await summary(second)).selected_item.quantity, 2);
  pass('Guest -> registration -> login -> exact product/SKU/quantity; no automatic add; explicit confirmation stores the selected SKU using real cookie/CSRF.');

  await logout(); await login('customer');
  await navigate('/account?view=addresses');
  await waitFor(() => !!document.querySelector('.address-empty'), 'existing address book');
  await click('.address-heading button');
  await fill({ '#recipient_name': 'UC14 Người nhận kiểm thử', '#phone': '0900000001', '#province': 'Tỉnh Kiểm Thử', '#ward': 'Phường Kiểm Thử', '#address_line': '12 Đường Kiểm Thử' });
  await click('.address-form button[type="submit"]');
  await waitFor(() => !document.querySelector('.address-form') && !!document.querySelector('.address-card'), 'address saved');
  pass('Ordinary login still opens /account; existing address UI saves and reads a real address on the isolated DB.');

  await open(); await fill({ '#cart-quantity': '2' });
  const beforeDouble = writes();
  await evaluate(() => {
    const form = document.querySelector('.cart-add form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await success(); assert.equal(writes() - beforeDouble, 1);
  assert.equal((await summary()).selected_item.quantity, 2);
  await click(submit); await success();
  assert.equal((await summary()).selected_item.quantity, 4);
  await select(1); await click(submit); await success();
  assert.equal((await summary(second)).selected_item.quantity, 1);
  assert.equal((await summary()).item_count, 2);
  pass('First/repeated SKU and a different SKU use real API responses; two same-frame submit events dispatch only one POST.');

  await select(0); await fill({ '#cart-quantity': '0' });
  const beforeInvalid = writes(); await click(submit);
  await waitFor(() => !!document.querySelector('#cart-quantity-error') && document.activeElement?.id === 'cart-quantity', 'quantity validation focus');
  assert.equal(writes(), beforeInvalid);
  await select(2); assert(await evaluate(() => document.querySelector('[data-testid="cart-add-submit"]').disabled));
  assert.equal(writes(), beforeInvalid);
  pass('Invalid quantity focuses its field error; sold-out SKU disables Add; neither sends a POST.');

  await select(0); await fixture('stock-low'); await fill({ '#cart-quantity': '1' }); await click(submit);
  await waitFor(() => document.querySelector('.cart-feedback')?.textContent.includes('Tồn hiện tại: 1'), 'stock conflict');
  assert.equal(await evaluate(() => document.querySelector('#cart-quantity').value), '1');
  assert((await evaluate(() => document.querySelector('.variant-summary').textContent)).includes('Còn hàng (1)'));
  assert.equal((await summary()).selected_item.quantity, 4);
  await fixture('stock-restore');
  pass('Stock changed after page load: backend returns 409, UI displays current stock/cart quantity and preserves the input; previous line is unchanged.');

  await open(); await fill({ '#cart-quantity': '2' });
  let changed = 0;
  await intercept('Request', async (request) => {
    const body = JSON.parse(request.request.postData); body.quantity = 0; changed++;
    await call('Fetch.continueRequest', { requestId: request.requestId, postData: Buffer.from(JSON.stringify(body)).toString('base64') });
  }, async () => {
    await click(submit);
    await waitFor(() => !!document.querySelector('#cart-quantity-error') && document.activeElement?.id === 'cart-quantity', 'real 422');
  });
  assert.equal(changed, 1); assert.equal(await evaluate(() => document.querySelector('#cart-quantity').value), '2');
  pass('A deliberately invalid outgoing quantity receives a real Laravel 422; field error/focus and the typed value are preserved.');

  let stripped = 0;
  await intercept('Request', async (request) => {
    stripped++;
    const headers = Object.entries(request.request.headers).filter(([key]) => key.toLowerCase() !== 'x-xsrf-token').map(([name, value]) => ({ name, value }));
    await call('Fetch.continueRequest', { requestId: request.requestId, headers });
  }, async () => {
    await click(submit);
    await waitFor(() => document.querySelector('.cart-feedback')?.textContent.includes('Phiên xác thực đã hết hạn'), 'real 419');
  });
  assert.equal(stripped, 1);
  await click(submit); await success();
  pass('Removing the CSRF header produces real 419 feedback; explicit retry bootstraps CSRF again and succeeds.');

  const beforeCsrf = writes();
  await call('Network.setBlockedURLs', { urls: ['*/sanctum/csrf-cookie'] });
  await click(submit);
  await waitFor(() => document.querySelector('.cart-feedback')?.textContent.includes('yêu cầu thêm giỏ chưa được gửi'), 'failed CSRF bootstrap');
  assert.equal(writes(), beforeCsrf); assert(!await evaluate(() => !!document.querySelector('[data-testid="cart-check-result"]')));
  await call('Network.setBlockedURLs', { urls: [] });
  pass('CSRF bootstrap connection failure is reported before any cart POST and does not create an uncertain-write marker.');

  await fill({ '#cart-quantity': '1' });
  const beforeLost = writes(); let dropped = 0;
  const previous = (await summary()).selected_item.quantity;
  await intercept('Response', async (request) => {
    assert([200, 201].includes(request.responseStatusCode)); dropped++;
    await call('Fetch.failRequest', { requestId: request.requestId, errorReason: 'ConnectionClosed' });
  }, async () => { await click(submit); await waitFor(() => !!document.querySelector('[data-testid="cart-check-result"]'), 'lost response check'); });
  assert.equal(dropped, 1); assert.equal(writes() - beforeLost, 1);
  assert(await evaluate(() => document.querySelector('[data-testid="cart-add-submit"]').disabled));
  assert.equal((await summary()).selected_item.quantity, previous + 1);
  await open();
  await waitFor(() => !!document.querySelector('[data-testid="cart-check-result"]'), 'recovery after refresh');
  assert.equal(writes() - beforeLost, 1);
  await logout(); await login('other'); await open();
  assert(!await evaluate(() => !!document.querySelector('[data-testid="cart-check-result"]') || !!document.querySelector('[data-testid="cart-success"]')));
  await click(submit); await success(); assert.equal((await summary()).selected_item.quantity, 1);
  await logout(); await login('customer'); await open();
  await waitFor(() => !!document.querySelector('[data-testid="cart-check-result"]'), 'same-owner recovery');
  const beforeCheck = writes();
  await call('Network.setBlockedURLs', { urls: ['*/api/customer/cart/summary*'] });
  await click(check); await waitFor(() => !!document.querySelector('.cart-error'), 'failed reconciliation read');
  assert(await evaluate(() => document.querySelector('[data-testid="cart-add-submit"]').disabled));
  await call('Network.setBlockedURLs', { urls: [] });
  await click(check); await waitFor(() => !document.querySelector('[data-testid="cart-check-result"]') && !!document.querySelector('[data-testid="cart-success"]'), 'successful reconciliation');
  assert.equal(writes(), beforeCheck);
  assert((await evaluate(() => document.querySelector('[data-testid="cart-success"]').textContent)).includes(`hiện có ${previous + 1}`));
  pass('Server commits but response delivery is dropped: refresh preserves the check, a different account sees none, the same account recovers; failed/successful GET checks never replay POST.');

  await open();
  const beforeLeaving = writes();
  const quantityBeforeLeaving = (await summary()).selected_item.quantity;
  let pausedResponse;
  await intercept('Response', async (request) => { pausedResponse = request; }, async () => {
    await click(submit);
    const deadline = Date.now() + 5000;
    while (!pausedResponse && Date.now() < deadline) await new Promise((done) => setTimeout(done, 20));
    assert(pausedResponse && [200, 201].includes(pausedResponse.responseStatusCode));
    assert(await evaluate(() => document.querySelector('.variant-group').disabled));
    await navigate('/products');
    assert(!await evaluate(() => !!document.querySelector('.cart-feedback')));
  });
  await open(); await waitFor(() => !!document.querySelector('[data-testid="cart-check-result"]'), 'navigation pending recovery');
  await click(check); await waitFor(() => !document.querySelector('[data-testid="cart-check-result"]') && !!document.querySelector('[data-testid="cart-success"]'), 'navigation check complete');
  assert.equal(writes() - beforeLeaving, 1);
  assert.equal((await summary()).selected_item.quantity, quantityBeforeLeaving + 1);
  pass('Leaving the product while a committed POST response is paused aborts the old UI request; returning requires read-only reconciliation and sends no extra POST.');

  await open(); await fixture('hide'); await click(submit);
  await waitFor(() => !!document.querySelector('.cart-reload'), 'unavailable SKU reload');
  assert(await evaluate(() => document.querySelector('[data-testid="cart-add-submit"]').disabled));
  await click('.cart-reload'); await waitFor(() => !document.querySelector('.cart-add'), 'hidden product reload');
  await fixture('show');
  pass('Product hidden after page load returns 404, blocks further adds and reloads the real public product state.');

  await open(); await fill({ '#cart-quantity': '2' }); await logout(); await click(submit);
  await waitFor(() => document.querySelector('.cart-add')?.textContent.includes('Phiên đăng nhập đã hết hạn'), 'expired session');
  await click(submit);
  await waitFor(() => location.pathname === '/login' && !document.querySelector('.orbit-submit')?.disabled, 'login after expiry');
  await fill({ '#email': 't02-customer@shophub.invalid', '#password': password }); await click('.orbit-submit');
  await waitFor((slug) => location.pathname === '/products/' + slug, 'return after expiry', data.slug); await ready();
  assert.equal(await evaluate(() => document.querySelector('#cart-quantity').value), '2');
  await fixture('lock'); await click(submit);
  await waitFor(() => document.querySelector('.cart-add')?.textContent.includes('không đủ quyền sử dụng giỏ'), 'locked account');
  await fixture('unlock'); await logout();
  await login('admin'); await open();
  assert(await evaluate(() => document.querySelector('[data-testid="cart-add-submit"]').disabled));
  assert((await evaluate(() => document.querySelector('.cart-add').textContent)).includes('tài khoản khách hàng'));
  pass('Real expired session (401), subsequently locked account (403), and admin role have the correct UI/permission behavior.');

  await logout();
  await call('Network.setBlockedURLs', { urls: ['*/api/user'] }); await open();
  await waitFor(() => document.querySelector('.cart-add')?.textContent.includes('Chưa tải được thông tin tài khoản'), 'account unavailable');
  assert(await evaluate(() => document.querySelector('[data-testid="cart-add-submit"]').disabled));
  await call('Network.setBlockedURLs', { urls: [] });
  await click('.cart-feedback button');
  await waitFor(() => !document.querySelector('[data-testid="cart-add-submit"]').disabled, 'account retry');
  await login('customer');
  pass('Unavailable account lookup blocks Add and retries the account read without assuming the visitor is logged out.');

  for (const width of [1440, 768, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 620 });
    await open();
    assert(await evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + ' page overflow');
    await fill({ '#cart-quantity': '1' });
    await evaluate(() => document.querySelector('#cart-quantity').focus());
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    const focus = await evaluate(() => ({ submit: document.activeElement === document.querySelector('[data-testid="cart-add-submit"]'), outline: parseFloat(getComputedStyle(document.activeElement).outlineWidth) }));
    assert(focus.submit && focus.outline >= 3);
    const before = (await summary()).selected_item.quantity;
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await success(); assert.equal((await summary()).selected_item.quantity, before + 1);
    if (width !== 768) {
      const preview = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(resolve('../backend/storage/framework/testing', `uc14-t03-${width}.png`), Buffer.from(preview.data, 'base64'));
    }
    pass(width + 'px: no page overflow, visible Tab focus and keyboard Enter add through real API.');
  }

  await logout(); await navigate('/login');
  await evaluate(() => { history.replaceState({ ...history.state, usr: { cartReturn: { slug: 'https://external.invalid', variantId: 1, quantity: 1 } } }, ''); window.__uc14Reloading = true; });
  await call('Page.reload');
  await waitFor(() => !window.__uc14Reloading && !!document.querySelector('#email') && !document.querySelector('.orbit-submit')?.disabled, 'malformed return context');
  await fill({ '#email': 't02-customer@shophub.invalid', '#password': password }); await click('.orbit-submit');
  await waitFor(() => location.pathname === '/account', 'safe default return');
  pass('Malformed/external return context is ignored; ordinary account navigation remains internal.');
}
