import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function reviewNavigation({ call, evaluate, waitFor, navigate, click, noOverflow, report, output }) {
  const key = async (name) => {
    const codes = { Escape: 27, Enter: 13, ArrowDown: 40, ArrowUp: 38, Home: 36, End: 35 };
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: codes[name], ...(name === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: codes[name] });
  };
  const pointerClick = async (selector) => {
    const point = await evaluate((selector) => {
      const element = document.querySelector(selector);
      const bounds = element.getBoundingClientRect();
      // The mobile account popup can overlap the right half of search.
      return { x: bounds.x + (selector === '#header-search' ? 16 : bounds.width / 2), y: bounds.y + bounds.height / 2 };
    }, selector);
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
  };
  const picture = async (name) => {
    const { data } = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(output, `${name}.png`), Buffer.from(data, 'base64'));
  };
  const accountButton = 'button[aria-label="Tài khoản"]';
  const pendingOpen = () => document.querySelector('.feature-pending').open;
  const pendingClosed = () => !document.querySelector('.feature-pending').open;

  for (const width of [1440, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: width === 1440 ? 1000 : 844, deviceScaleFactor: 1, mobile: width === 390 });
    await navigate('/');
    await waitFor(() => document.querySelectorAll('.category-rail .cat-tile').length === 3, 'category rail');
    await evaluate(() => document.fonts.ready);
    assert.deepEqual(await evaluate(() => [...document.querySelectorAll('.category-rail .cat-name')].map((item) => item.textContent)), ['Laptop', 'Linh kiện và phụ kiện', 'Thiết bị gia dụng']);
    assert.deepEqual(await evaluate(() => [...document.querySelectorAll('.category-rail .cat-count')].map((item) => item.textContent)), ['5 sản phẩm', '5 sản phẩm', '5 sản phẩm']);
    assert(await evaluate(() => {
      const rail = document.querySelector('.category-rail');
      return rail.previousElementSibling.matches('.spotlight') && rail.nextElementSibling.matches('.flash');
    }), 'Category rail must be between the three banners and promotions');
    assert.equal(await evaluate(() => document.querySelectorAll('.header-utilities .count').length), 0);
    assert(await evaluate(() => ['Tài khoản', 'Yêu thích', 'Giỏ hàng'].every((name) => {
      const element = document.querySelector(`button[aria-label="${name}"]`);
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.x >= 0 && rect.right <= innerWidth;
    })), 'All three utilities must stay visible');
    if (width === 390) {
      assert(await evaluate(() => document.querySelector('.searchbar').getBoundingClientRect().width > 300 && document.querySelector('#header-search').getBoundingClientRect().width > 220), 'Mobile search stays wide');
      assert(await evaluate(() => { const rail = document.querySelector('.catrail-track'); return rail.scrollWidth > rail.clientWidth; }), 'Mobile category scrolling is internal');
    }
    await noOverflow(`${width}px navigation home`);
    await picture(`header-${width}`);
    await evaluate(() => document.querySelector('.category-rail').scrollIntoView({ block: 'center' }));
    await picture(`categories-${width}`);
    const links = await evaluate(() => [...document.querySelectorAll('.category-rail .cat-tile')].map((item) => item.getAttribute('href')));
    for (const href of links) {
      await evaluate((href) => document.querySelector(`.category-rail a[href="${href}"]`).scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }), href);
      await pointerClick(`.category-rail a[href="${href}"]`);
      await waitFor(() => !!document.querySelector('.listing-grid'), 'category destination');
      assert.equal(await evaluate(() => location.pathname + location.search), href);
      assert.equal(await evaluate(() => document.querySelectorAll('.listing-grid .pcard').length), 5);
      await navigate('/');
    }
    await click('.category-rail .see-all');
    assert.equal(await evaluate(() => location.pathname + location.search), '/products');
    assert.equal(await evaluate(() => document.querySelector('.result-total').textContent), '15 sản phẩm');
    await navigate('/');

    await click(accountButton);
    await waitFor(() => !!document.querySelector('#account-menu'), 'account menu');
    assert.deepEqual(await evaluate(() => [...document.querySelectorAll('#account-menu [role="menuitem"]')].map((item) => item.textContent)), ['Đăng nhập', 'Đăng ký', 'Tra cứu đơn hàng']);
    await noOverflow(`${width}px account menu`);
    await picture(`account-menu-${width}`);
    await key('Escape');
    await waitFor(() => !document.querySelector('#account-menu'), 'Escape closes account menu');
    assert.equal(await evaluate(() => document.activeElement.getAttribute('aria-label')), 'Tài khoản');
    await click(accountButton);
    await pointerClick('#header-search');
    await waitFor(() => !document.querySelector('#account-menu'), 'outside click closes menu');
    assert.equal(await evaluate(() => document.activeElement.id), 'header-search');
    await evaluate(() => document.querySelector('button[aria-label="Tài khoản"]').focus());
    await key('ArrowDown');
    await waitFor(() => document.activeElement.textContent === 'Đăng nhập', 'account keyboard opening');
    await key('ArrowDown');
    assert.equal(await evaluate(() => document.activeElement.textContent), 'Đăng ký');
    await key('End');
    assert.equal(await evaluate(() => document.activeElement.textContent), 'Tra cứu đơn hàng');
    await key('Home');
    await key('Enter');
    await waitFor(pendingOpen, 'keyboard selection shows pending state');
    assert.equal(await evaluate(() => document.querySelector('#account-menu')), null);
    assert.equal(await evaluate(() => document.querySelector('#feature-pending-title').textContent), 'Tính năng đang được phát triển');
    await noOverflow(`${width}px pending dialog`);
    await picture(`pending-feature-${width}`);
    await key('Escape');
    await waitFor(pendingClosed, 'pending Escape');
    assert.equal(await evaluate(() => document.activeElement.getAttribute('aria-label')), 'Tài khoản');

    for (const index of [0, 1, 2]) {
      await click(accountButton);
      await click(`#account-menu [role="menuitem"]:nth-child(${index + 1})`);
      await waitFor(pendingOpen, 'account item pending');
      assert((await evaluate(() => document.querySelector('#feature-pending-description').textContent)).includes(['Đăng nhập', 'Đăng ký', 'Tra cứu đơn hàng'][index]));
      assert.equal(await evaluate(() => document.querySelector('#account-menu')), null);
      assert.equal(await evaluate(() => location.pathname + location.search), '/');
      await click('.feature-pending .btn-bz');
      await waitFor(pendingClosed, 'pending dismiss');
    }
    for (const name of ['Yêu thích', 'Giỏ hàng']) {
      await click(`button[aria-label="${name}"]`);
      await waitFor(pendingOpen, name);
      assert((await evaluate(() => document.querySelector('#feature-pending-description').textContent)).includes(name));
      assert.equal(await evaluate(() => location.pathname + location.search), '/');
      await click('.feature-pending .btn-bz');
      await waitFor(pendingClosed, 'utility dismiss');
      assert.equal(await evaluate(() => document.activeElement.getAttribute('aria-label')), name);
      assert.equal(await evaluate(() => document.body.style.overflow), '');
    }
    report.push(`${width}px: category order/counts/all 3 actual clicks and full-catalog link pass; all header utilities visible without fake badges; account keyboard navigation, Escape/outside/selection close and 5 pending actions pass; no 404 or overflow.`);
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
}
