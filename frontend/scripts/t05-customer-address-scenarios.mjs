import assert from 'node:assert/strict';

export async function runAddressScenarios({ call, evaluate, click, fill, navigate, waitFor, browserApi, pass, mutations, login, apiBase, ws, fixture }) {
  const base = '/api/customer/addresses';
  const ready = () => waitFor(() => !!document.querySelector('.address-book .address-help[role="status"]'), 'address list loaded');
  const book = async () => { await navigate('/account?view=addresses'); await ready(); };
  const list = async () => (await browserApi(base)).data;
  const logout = () => evaluate(async (origin) => {
    await fetch(origin + '/sanctum/csrf-cookie', { credentials: 'include' });
    const token = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.slice(11);
    const response = await fetch(origin + '/logout', { method: 'POST', credentials: 'include', headers: { Accept: 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(token) } });
    if (response.status !== 204) throw new Error('Logout failed');
  }, apiBase);
  const fields = (name) => ({ recipient_name: name, phone: '0900000001', province: 'Thành phố Hồ Chí Minh', ward: 'Phường Kiểm Thử', address_line: '12 Đường Kiểm Thử', is_default: false });
  const formFill = async (name) => {
    const data = fields(name); const selectors = {};
    for (const [field,value] of Object.entries(data)) if (field !== 'is_default') selectors['#' + field] = value;
    await fill(selectors);
  };
  const save = () => click('.address-form button[type="submit"]');
  const saved = () => waitFor(() => !document.querySelector('.address-form') && document.querySelector('.orbit-notice[role="status"]')?.textContent.includes('Đã lưu'), 'address saved');
  const add = async (name) => { await click('.address-heading button'); await waitFor(() => !!document.querySelector('#recipient_name'), 'new form'); await formFill(name); };
  const rowAction = (id,text) => evaluate(({id,text}) => { const row = document.querySelector('[data-address-id="' + id + '"]'); const button = [...row.querySelectorAll('button')].find((b)=>b.textContent===text); if (!button || button.disabled) throw new Error('Missing row action'); button.focus(); button.click(); }, {id,text});
  const remove = async (id) => { await rowAction(id,'Xóa'); await waitFor(() => !!document.querySelector('.address-confirm[open]'), 'delete confirmation'); await click('.address-confirm .address-danger'); await waitFor((id) => !document.querySelector('.address-confirm') && !document.querySelector('[data-address-id="'+id+'"]'), 'address removed', id); await ready(); };

  await navigate('/account?view=addresses'); await waitFor(() => location.pathname === '/login', 'guest redirect');
  for (const [method,path] of [['GET',''],['POST',''],['PUT','/1'],['DELETE','/1'],['PATCH','/1/default']]) assert.equal((await browserApi(base+path,method)).status,401);
  await login('admin'); await navigate('/account');
  assert(!await evaluate(() => !!document.querySelector('.account-tabs')));
  for (const [method,path] of [['GET',''],['POST',''],['PUT','/1'],['DELETE','/1'],['PATCH','/1/default']]) assert.equal((await browserApi(base+path,method)).status,403);
  pass('T05 guest/admin: account redirect or hidden customer menu; all five real API endpoints enforce 401/403.');
  await logout(); await login('customer');
  await click('.account-tabs button:last-child'); await ready();
  assert.equal((await list()).meta.total,0); assert(await evaluate(() => document.body.textContent.includes('Bạn chưa có địa chỉ giao hàng')));
  const longName = 'Người nhận địa chỉ tiếng Việt dài để kiểm tra hiển thị trên màn hình nhỏ và bàn phím';
  await add(longName);
  const beforeCreate=mutations.length;
  await evaluate(() => { const form=document.querySelector('.address-form'); form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); });
  await saved();
  assert.equal(mutations.slice(beforeCreate).filter((r)=>r.method==='POST'&&r.url===base).length,1);
  let addresses=(await list()).data; const first=addresses[0];
  assert.equal(first.is_default,true); assert.equal(first.phone,'0900000001');
  await add('Người nhận thứ hai'); await save(); await saved();
  addresses=(await list()).data; const second=addresses.find((r)=>r.id!==first.id);
  assert.equal(second.is_default,false);
  await rowAction(second.id,'Đặt mặc định');
  await waitFor((id) => !!document.querySelector('[data-address-id="'+id+'"] .address-default'), 'default changed', second.id);
  assert.equal((await list()).data.filter((r)=>r.is_default).length,1);
  pass('T05 customer A: empty state, two real creations, first auto-default, phone leading zero preserved, duplicate submit blocked, switch default.');

  await rowAction(second.id,'Sửa'); await waitFor(() => !!document.querySelector('#recipient_name'), 'edit form');
  await fill({ '#recipient_name':'Người nhận đã sửa', '#phone':'sai-so', '#address_line':'99 Đường Đã Sửa' }); await save();
  await waitFor(() => !!document.querySelector('#phone-error'), 'phone validation');
  assert.equal(await evaluate(() => document.querySelector('#address_line').value),'99 Đường Đã Sửa');
  await waitFor(() => document.activeElement.id === 'phone', 'first invalid field focused');
  await fill({ '#phone':'+84900000002' }); await save(); await saved();
  assert.equal((await list()).data.find((r)=>r.id===second.id).is_default,true);
  await rowAction(second.id,'Xóa'); await waitFor(() => !!document.querySelector('.address-confirm[open]'), 'cancel dialog');
  const beforeCancel=mutations.length; await click('.address-confirm .address-actions button:first-child');
  assert.equal(mutations.length,beforeCancel);
  await rowAction(second.id,'Xóa'); await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27}); await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await waitFor(() => !document.querySelector('.address-confirm[open]'), 'escape cancel');
  assert(await evaluate(() => document.activeElement.textContent==='Xóa'));
  pass('T05 edit/validation/delete cancel: API field error preserves inputs, focuses phone, editing current default retains it; cancel and Escape send no mutation and restore dialog focus.');

  await logout(); await login('other'); await book(); assert.equal((await list()).meta.total,0);
  for (const [method,path,body] of [['PUT','/'+first.id,{}],['DELETE','/'+first.id],['PATCH','/'+first.id+'/default']]) assert.equal((await browserApi(base+path,method,body)).status,404);
  await add('Khách B riêng'); await save(); await saved(); assert.equal((await list()).meta.total,1);
  assert((await list()).data.every((r)=>r.id!==first.id&&r.id!==second.id));
  await logout(); await login('customer'); await book(); assert.equal((await list()).meta.total,2);
  pass('T05 ownership with actual sessions: customer B sees no A addresses and gets 404 for update/delete/default, owns an independent book; A data stays intact.');

  await fixture('lock');
  try { assert.equal((await browserApi(base)).status,403); assert.equal((await browserApi(base,'POST',fields('Blocked'))).status,403); }
  finally { await fixture('unlock'); }
  await remove(second.id); assert.equal((await list()).data[0].id,first.id); assert.equal((await list()).data[0].is_default,true);
  await remove(first.id); assert.equal((await list()).meta.total,0);
  await add('Tạo lại sau khi xóa hết'); await save(); await saved();
  assert.equal((await list()).data[0].is_default,true);
  pass('T05 locked existing session gets 403; deleting default selects oldest remaining, deleting all gives empty, next creation becomes default.');

  for (const width of [1440,768,390]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<960}); await book();
    assert(await evaluate(() => document.documentElement.scrollWidth<=innerWidth),width+' list overflow');
    await add(longName);
    assert(await evaluate(() => document.documentElement.scrollWidth<=innerWidth),width+' form overflow');
    await evaluate(() => document.querySelector('#phone').focus());
    assert(await evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=2));
    await click('.address-form button[type="button"]');
    const own=(await list()).data[0]; await rowAction(own.id,'Sửa'); await fill({'#phone':'0900000003'}); await save(); await saved();
    assert.equal((await list()).data[0].phone,'0900000003');
    pass('T05 '+width+'px: list/create/edit with long Vietnamese names, keyboard focus, no page overflow and real save.');
  }

  await add('Mất phản hồi sau khi tạo');
  let dropped=0;
  const deliveryHandler=async ({data}) => {
    const event=JSON.parse(data); if(event.method!=='Fetch.requestPaused') return;
    const p=event.params;
    if(p.request.method==='POST'&&p.responseStatusCode===201) {dropped++; await call('Fetch.failRequest',{requestId:p.requestId,errorReason:'ConnectionClosed'});}
    else await call('Fetch.continueResponse',{requestId:p.requestId});
  };
  ws.addEventListener('message',deliveryHandler);
  await call('Fetch.enable',{patterns:[{urlPattern:'*/api/customer/addresses',requestStage:'Response'}]});
  const beforeLost=mutations.length;
  try { await save(); await waitFor(() => !!document.querySelector('[data-testid="address-check-result"]'), 'unknown write outcome'); }
  finally { await call('Fetch.disable'); ws.removeEventListener('message',deliveryHandler); }
  assert.equal(dropped,1); assert.equal(await evaluate(() => document.querySelector('#recipient_name').value),'Mất phản hồi sau khi tạo');
  assert(await evaluate(() => document.querySelector('.address-form button[type="submit"]').disabled));
  await click('[data-testid="address-check-result"]'); await ready();
  await waitFor(() => !document.querySelector('[data-testid="address-check-result"]'), 'result read');
  assert.equal(mutations.slice(beforeLost).filter((r)=>r.method==='POST').length,1);
  assert((await list()).data.some((r)=>r.recipient_name==='Mất phản hồi sau khi tạo'));
  await click('.address-form button[type="button"]');
  pass('T05 uncertain create: real server commits 201 then response delivery is dropped; input retained, repeat writes blocked, explicit list GET reconciles without another POST.');

  await add('Ghi thành công nhưng đọc lại lỗi');
  await call('Network.setBlockedURLs',{urls:['*/api/customer/addresses?page=*']}); await save();
  await waitFor(() => !!document.querySelector('[data-testid="address-check-result"]'), 'post-write refresh failed');
  assert(await evaluate(() => document.body.textContent.includes('Thao tác đã thành công')));
  await call('Network.setBlockedURLs',{urls:[]}); await click('[data-testid="address-check-result"]'); await ready();
  await waitFor(() => !document.querySelector('[data-testid="address-check-result"]'), 'known success read restored');
  await click('.address-form button[type="button"]');
  await call('Network.setBlockedURLs',{urls:['*/api/customer/addresses?page=*']}); await navigate('/account?view=addresses');
  await waitFor(() => !!document.querySelector('.address-load-error'), 'initial list failure');
  await call('Network.setBlockedURLs',{urls:[]}); await click('.address-load-error button'); await ready();
  pass('T05 retry: known successful write with failed list read is not resubmitted; explicit check and initial-load Retry both restore the real list.');

  const total=(await list()).meta.total;
  for(let i=total;i<12;i++) assert.equal((await browserApi(base,'POST',fields('Phân trang '+i))).status,201);
  await book(); await click('.address-pagination button:last-child');
  await waitFor(() => document.querySelector('.address-pagination span')?.textContent==='Trang 2 / 2','pagination');
  assert.equal(await evaluate(() => document.querySelectorAll('[data-address-id]').length),2);
  pass('T05 pagination uses actual API metadata and shows only the current owner page.');
}
