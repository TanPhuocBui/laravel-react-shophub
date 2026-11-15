import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';

// Added to the existing real T02 browser harness with --products; no screenshots.
export async function runProductScenarios({ call, evaluate, click, fill, navigate, waitFor, browserApi, publicApi, pass, mutations, mediaRoot }) {
  const readyList = () => waitFor(() => !!document.querySelector('.admin-result'), 'products list');
  const readyForm = () => waitFor(() => !!document.querySelector('.product-editor #field-name'), 'product form');
  const options = (await browserApi('/api/admin/products/options')).data.data;
  const category = options.categories.find((item) => item.name === 'Laptop');
  const brand = options.brands.find((item) => item.name === 'ASUS');
  assert(category && brand);
  const selectFiles = async (path = resolve('src/assets/hero.png')) => {
    const { root } = await call('DOM.getDocument');
    const { nodeId } = await call('DOM.querySelector', { nodeId: root.nodeId, selector: '#product-images' });
    await call('DOM.setFileInputFiles', { nodeId, files: [path] });
  };
  const field = (name) => '[name="' + name + '"]';
  const details = async (id) => (await browserApi('/api/admin/products/' + id)).data.data;
  const payloadFor = (product) => ({
    ...Object.fromEntries(['name', 'slug', 'category_id', 'brand_id', 'description', 'short_description', 'warranty_months'].map((key) => [key, product[key]])),
    images: product.images.map(({ id, alt_text, sort_order }) => ({ id, alt_text, sort_order })),
    variants: product.variants.map((variant) => ({ ...variant, options: variant.options ? { ...variant.options } : null })),
  });
  const newForm = async (name, slug, sku) => {
    await navigate('/admin/products/create'); await readyForm();
    await fill({ '#field-name': name, '#field-slug': slug, '#field-category_id': String(category.id), '#field-brand_id': String(brand.id),
      [field('variants.0.sku')]: sku, [field('variants.0.name')]: 'Đen', [field('variants.0.list_price')]: '2000000', [field('variants.0.sale_price')]: '1800000', [field('variants.0.stock_quantity')]: '5' });
    await selectFiles();
    await waitFor(() => document.querySelectorAll('[data-image-index]').length === 1, 'selected upload');
  };
  const submit = () => click('.product-editor button[type="submit"]');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/admin/products'); await readyList();
  assert((await evaluate(() => document.querySelector('.admin-breadcrumb').textContent)).includes('Sản phẩm'));
  await newForm('Máy tính nháp T03 hai màu', 't03-browser-product', 'T03-BROWSER-BLACK');
  await fill({ [field('images.0.alt_text')]: 'Ảnh trước T03', '#field-warranty_months': '24' });
  await click('.product-add-sku');
  await fill({ [field('variants.1.sku')]: 'T03-BROWSER-BLACK', [field('variants.1.name')]: 'Bạc', [field('variants.1.list_price')]: '2100000', [field('variants.1.sale_price')]: '1900000', [field('variants.1.stock_quantity')]: '0' });
  await submit();
  await waitFor(() => !!document.getElementById('error-variants.1.sku'), 'duplicate row SKU response');
  assert.equal(await evaluate(() => document.querySelector('#field-name').value), 'Máy tính nháp T03 hai màu');
  assert.equal(await evaluate(() => document.querySelectorAll('[data-image-index]').length), 1);
  assert.equal((await browserApi('/api/admin/products?q=t03-browser-product')).data.meta.total, 0);
  await fill({ [field('variants.1.sku')]: 'T03-BROWSER-SILVER' });
  const beforeSave = mutations.length;
  await evaluate(() => {
    const form = document.querySelector('.product-editor');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await readyList();
  assert.equal(mutations.slice(beforeSave).filter((item) => item.method === 'POST' && item.url === '/api/admin/products').length, 1);
  const first = (await browserApi('/api/admin/products?q=t03-browser-product')).data.data[0];
  let product = await details(first.id);
  assert.equal(product.status, 'draft'); assert.equal(product.images.length, 1); assert.equal(product.variants.length, 2);
  assert.equal(product.variants[0].sale_price, 1800000); assert.equal(product.variants[1].stock_quantity, 0);
  assert.equal(product.images[0].alt_text, 'Ảnh trước T03');
  const uploaded = await fetch(product.images[0].url);
  assert.equal(uploaded.status, 200); assert(uploaded.headers.get('content-type').startsWith('image/'));
  assert.equal(uploaded.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await publicApi('products?q=t03-browser-product')).data.meta.total, 0);
  assert.equal((await publicApi('products/t03-browser-product')).status, 404);
  pass('T03 desktop: real multipart upload + two SKUs; duplicate row rejected without draft creation; retry preserves inputs/files and sends one POST; saved draft is absent from public list/detail.');
  const variantIds = product.variants.map((item) => item.id);
  const oldImageId = product.images[0].id;
  await navigate('/admin/products/' + first.id + '/edit'); await readyForm();
  await waitFor(() => document.querySelector('[data-image-index="0"] img')?.naturalWidth > 0, 'stored uploaded image rendered');
  assert.equal(await evaluate(() => document.querySelector('[name="variants.0.sku"]').value), 'T03-BROWSER-BLACK');
  assert.equal(await evaluate(() => document.querySelector('[name="variants.1.sale_price"]').value), '1900000');
  await fill({ [field('variants.0.sale_price')]: '1700000', [field('variants.0.stock_quantity')]: '7', '[data-sku-index="1"] input[type="checkbox"]': false });
  await selectFiles(); await waitFor(() => document.querySelectorAll('[data-image-index]').length === 2, 'second image');
  await fill({ [field('images.1.alt_text')]: 'Ảnh mới đại diện' }); await click('[aria-label="Đưa ảnh 2 lên"]');
  await submit(); await readyList();
  product = await details(first.id);
  assert.deepEqual(product.variants.map((item) => item.id), variantIds);
  assert.equal(product.variants[0].sale_price, 1700000); assert.equal(product.variants[0].stock_quantity, 7);
  assert.equal(product.variants[1].is_active, false); assert.equal(product.images[1].id, oldImageId);
  assert.equal(product.images[0].alt_text, 'Ảnh mới đại diện');
  await navigate('/admin/products/' + first.id + '/edit'); await readyForm();
  assert.equal(await evaluate(() => document.querySelector('[data-sku-index="0"] button') === null), true);
  await click('[aria-label="Bỏ ảnh 2"]'); await submit(); await readyList();
  product = await details(first.id); assert.equal(product.images.length, 1);
  assert.equal(product.images[0].alt_text, 'Ảnh mới đại diện');
  assert.deepEqual(product.variants.map((item) => item.id), variantIds);
  pass('T03 edit: image loads from real media URL, persisted SKU codes/prices/stock reopen correctly; IDs stay stable, inactive SKU retained, image ordering/removal update metadata.');
  await newForm('Sản phẩm T03 khác', 't03-browser-other', 'T03-BROWSER-OTHER'); await submit(); await readyList();
  const otherId = (await browserApi('/api/admin/products?q=t03-browser-other')).data.data[0].id;
  const other = await details(otherId);
  const snapshot = await details(first.id);
  const invalid = [
    ['foreign SKU', (data) => { data.variants[0].id = other.variants[0].id; }, 'variants.0.id'],
    ['foreign image', (data) => { data.images[0].id = other.images[0].id; }, 'images.0.id'],
    ['duplicate database SKU', (data) => { data.variants[0].sku = other.variants[0].sku; }, 'variants.0.sku'],
    ['sale above list', (data) => { data.variants[0].sale_price = data.variants[0].list_price + 1; }, 'variants.0.sale_price'],
    ['negative stock', (data) => { data.variants[0].stock_quantity = -1; }, 'variants.0.stock_quantity'],
    ['fractional stock', (data) => { data.variants[0].stock_quantity = '1.5'; }, 'variants.0.stock_quantity'],
    ['omitted saved SKU', (data) => { data.variants.pop(); }, 'variants'],
    ['client publication status', (data) => { data.status = 'active'; }, 'status'],
  ];
  for (const [label, change, fieldName] of invalid) {
    const body = payloadFor(snapshot); change(body);
    const response = await browserApi('/api/admin/products/' + first.id, 'PUT', body);
    assert.equal(response.status, 422, label); assert(response.data.errors[fieldName], label);
    assert.deepEqual(await details(first.id), snapshot, label + ' unchanged');
  }
  pass('T03 real HTTP: foreign IDs, DB SKU collision, invalid prices/stock, omitted saved SKU and publication payload all return 422 and leave the entire product unchanged.');
  await navigate('/admin/products/' + first.id + '/edit'); await readyForm();
  await fill({ [field('variants.1.sku')]: other.variants[0].sku }); await submit();
  await waitFor(() => !!document.getElementById('error-variants.1.sku'), 'database SKU error displayed on matching row');
  assert.equal(await evaluate(() => document.querySelectorAll('[data-sku-index]').length), 2);
  assert.equal(await evaluate(() => document.querySelector('#field-name').value), snapshot.name);
  pass('T03 database duplicate SKU is shown at the exact form row; entered product data remains available.');
  const filesBefore = await readdir(resolve(mediaRoot, 'catalog/products'));
  await navigate('/admin/products/create'); await readyForm();
  await fill({ '#field-name': 'Ảnh không hợp lệ', '#field-slug': 't03-bad-image', '#field-category_id': String(category.id), '#field-brand_id': String(brand.id), [field('variants.0.sku')]: 'T03-BAD-IMAGE', [field('variants.0.list_price')]: '100', [field('variants.0.sale_price')]: '90', [field('variants.0.stock_quantity')]: '1' });
  await selectFiles(resolve('../backend/public/images/demo/catalog-placeholder-front.svg'));
  await waitFor(() => document.querySelectorAll('[data-image-index]').length === 1, 'selected SVG for rejection');
  await submit(); await waitFor(() => !!document.getElementById('field-images.0.file'), 'invalid image response');
  assert.equal((await browserApi('/api/admin/products?q=t03-bad-image')).data.meta.total, 0);
  assert.deepEqual(await readdir(resolve(mediaRoot, 'catalog/products')), filesBefore);
  pass('T03 upload validation: SVG rejected by Laravel, no draft or new stored file remains.');
  const a = payloadFor(snapshot); const b = payloadFor(other);
  a.variants[0].sku = 'T03-COMPETING-SKU'; b.variants[0].sku = 'T03-COMPETING-SKU';
  const competing = await Promise.all([browserApi('/api/admin/products/' + first.id, 'PUT', a), browserApi('/api/admin/products/' + other.id, 'PUT', b)]);
  assert.deepEqual(competing.map((item) => item.status).sort(), [200, 422]);
  const skuResults = (await browserApi('/api/admin/products?q=T03-COMPETING-SKU')).data;
  assert.equal(skuResults.meta.total, 1);
  pass('T03 competing HTTP submissions reserve a global SKU once: one 200, one 422, one product matches. PHP CLI server serialization is not a multi-transaction stress test.');
  const active = (await browserApi('/api/admin/products?status=active&per_page=1')).data.data[0];
  await navigate('/admin/products/' + active.id); await readyForm();
  assert.equal(await evaluate(() => document.querySelector('.product-editor button[type="submit"]') === null), true);
  assert.equal((await browserApi('/api/admin/products/' + active.id, 'PUT', payloadFor(await details(active.id)))).status, 409);
  pass('T03 regression: the detail-only route stays read-only and the draft update API still returns 409 for an active product; T04 content edits use a separate endpoint.');
  for (const width of [1440, 768, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 960 });
    await navigate('/admin/products?status=draft'); await readyList();
    assert(await evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + ' product list overflow');
    await navigate('/admin/products/create'); await readyForm();
    assert(await evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + ' create overflow');
    await navigate('/admin/products/' + first.id + '/edit'); await readyForm();
    assert(await evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + ' edit overflow');
    assert.equal(await evaluate(() => document.querySelectorAll('[data-sku-index]').length), 2);
    assert.equal(await evaluate(() => document.querySelectorAll('[data-image-index]').length), 1);
    if (width === 390) {
      await fill({ [field('variants.0.stock_quantity')]: '8' }); await submit(); await readyList();
      assert.equal((await details(first.id)).variants[0].stock_quantity, 8);
    }
    pass('T03 ' + width + 'px: real product list/create/edit, uploaded image and two SKU rows, no horizontal page overflow' + (width === 390 ? ', mobile save persisted.' : '.'));
  }
}
