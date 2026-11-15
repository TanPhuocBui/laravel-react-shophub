import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import ProductPublishingPanel, { CategorySpecificationPreview } from '../../components/admin/ProductPublishingPanel';
import { AdminFeedback, AdminField } from '../../components/admin/AdminFeedback';
import AdminFilterToolbar from '../../components/admin/AdminFilterToolbar';
import useCatalog from '../../hooks/useCatalog';
import { adminError } from '../../services/adminCatalogService';
import { getAdminProduct, getProductOptions, listAdminProducts, saveAdminProduct } from '../../services/adminProductService';
import { catalogReturnTo, suggestCatalogSlug } from '../../utils/adminCatalog';
import { formatPrice } from '../../utils/catalog';

const fail = (error) => Object.assign(new Error(adminError(error)), { status: error.response?.status });
const statusLabel = (status) => ({ draft: 'Nháp', active: 'Đang công khai', inactive: 'Đã ẩn' })[status] || status;
function ProductStatus({ status }) { return <span className={'admin-badge product-status-' + status}>{statusLabel(status)}</span>; }
const freshVariant = () => ({ key: crypto.randomUUID(), sku: '', name: 'Mặc định', color: '', options: null, list_price: '', sale_price: '', stock_quantity: '0', is_active: true });

export function AdminProductsList() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const query = params.toString();
  const loader = useCallback(async ({ signal }) => {
    try {
      const [listing, options] = await Promise.all([listAdminProducts(Object.fromEntries(new URLSearchParams(query)), signal), getProductOptions(signal)]);
      return { ...listing, options };
    } catch (error) { throw fail(error); }
  }, [query]);
  const request = useCatalog(loader);
  const { data } = request;
  const returnTo = location.pathname + location.search;
  const filtered = ['q', 'status', 'category_id', 'brand_id'].some((field) => params.get(field));
  function search(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) if (String(value).trim()) next.set(key, String(value).trim());
    setParams(next);
  }
  function page(number) { const next = new URLSearchParams(params); next.set('page', number); setParams(next); }
  return <>
    <div className="admin-heading"><div><h1>Sản phẩm</h1><p>Tạo bản nháp, quản lý bộ ảnh và giá, tồn kho của từng SKU.</p></div><Link className="admin-primary" to="/admin/products/create" state={{ returnTo }}><Icon name="chip" />Thêm sản phẩm</Link></div>
    {location.state?.notice && <p className="admin-notice" role="status"><Icon name="check" />{location.state.notice}</p>}
    <section className="admin-card">
      <AdminFilterToolbar query={query} onSubmit={search} resetTo="/admin/products"
        search={{ id: 'product-search', value: params.get('q'), maxLength: 200, placeholder: 'Tìm tên, slug hoặc mã SKU…' }}
        filters={[
          { id: 'product-status', name: 'status', label: 'Trạng thái', value: params.get('status') || '', options: [{ value: '', label: 'Tất cả trạng thái' }, { value: 'draft', label: 'Nháp' }, { value: 'active', label: 'Đang công khai' }, { value: 'inactive', label: 'Đã ẩn' }] },
          { id: 'product-category', name: 'category_id', label: 'Danh mục', value: params.get('category_id') || '', options: [{ value: '', label: 'Tất cả danh mục' }, ...(data?.options.categories || []).map((item) => ({ value: item.id, label: item.name }))] },
        ]} />
      <AdminFeedback loading={request.loading} error={request.error ? { message: request.error, status: request.status } : null} retry={request.retry}>
        {data && <>
          <div className="admin-results-bar"><p className="admin-result" role="status">{data.meta.total} sản phẩm{data.data.length > 0 && <span> · Hiển thị {data.meta.from}–{data.meta.to}</span>}</p><p className="admin-table-note">Nhập thông số và quản lý công bố tại trang sửa sản phẩm.</p></div>
          {data.data.length ? <div className="admin-table-wrap" role="region" aria-label="Bảng sản phẩm" tabIndex={0}><table className="admin-table"><thead><tr><th>Sản phẩm</th><th>Danh mục / Thương hiệu</th><th className="admin-number">SKU</th><th className="admin-number">Giá SKU thấp nhất</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
            {data.data.map((product) => <tr key={product.id} data-product-id={product.id}><td className="admin-name-cell"><Link className="admin-record-name" to={'/admin/products/' + product.id + '/edit'} state={{ returnTo }}>{product.name}</Link><small className="admin-slug">{product.slug}</small></td><td>{product.category.name}<small className="product-muted">{product.brand.name}</small></td><td className="admin-number">{product.variants_count}</td><td className="admin-number">{product.min_sale_price == null ? '—' : formatPrice(product.min_sale_price)}</td><td><ProductStatus status={product.status} /></td><td><Link aria-label={'Sửa ' + product.name} to={'/admin/products/' + product.id + '/edit'} state={{ returnTo }}>{product.status === 'draft' ? 'Sửa nháp' : 'Quản lý'}</Link></td></tr>)}
          </tbody></table></div> : <div className="admin-state"><Icon name="search" /><h2>{filtered ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm'}</h2><p>{filtered ? 'Thử từ khóa khác hoặc xóa bộ lọc.' : 'Bắt đầu với một bản nháp có ảnh và ít nhất một SKU.'}</p><Link className="admin-primary" to={filtered ? '/admin/products' : '/admin/products/create'} state={{ returnTo }}>{filtered ? 'Xóa bộ lọc' : 'Thêm sản phẩm'}</Link></div>}
          {(data.meta.last_page > 1 || data.meta.current_page > 1) && <nav className="admin-pagination" aria-label="Phân trang sản phẩm"><span>Trang {data.meta.current_page} / {data.meta.last_page}</span><div><button disabled={data.meta.current_page <= 1} onClick={() => page(data.meta.current_page - 1)}>Trang trước</button><button disabled={data.meta.current_page >= data.meta.last_page} onClick={() => page(data.meta.current_page + 1)}>Trang sau</button></div></nav>}
        </>}
      </AdminFeedback>
    </section>
  </>;
}

export function AdminProductForm({ readOnly = false }) {
  const { id } = useParams();
  const [currentStatus, setCurrentStatus] = useState(null);
  const location = useLocation();
  const loader = useCallback(async ({ signal }) => {
    try {
      const [record, options] = await Promise.all([id ? getAdminProduct(id, signal) : Promise.resolve({ name: '', slug: '', category_id: '', brand_id: '', short_description: '', description: '', warranty_months: 0, status: 'draft', variants: [], images: [] }), getProductOptions(signal)]);
      return { record, options };
    } catch (error) { throw fail(error); }
  }, [id]);
  const request = useCatalog(loader);
  const returnTo = catalogReturnTo('products', location.state);
  const status = currentStatus && currentStatus.id === id ? currentStatus.status : request.data?.record.status || 'draft';
  return <>
    <Link className="admin-back" to={returnTo}>← Quay lại sản phẩm</Link>
    <div className="admin-heading"><div><h1>{readOnly ? 'Chi tiết sản phẩm' : id ? 'Sửa sản phẩm' : 'Thêm sản phẩm nháp'}</h1><p>Lưu nội dung, thông số và quản lý trạng thái công bố.</p></div><ProductStatus status={status} /></div>
    <AdminFeedback loading={request.loading} error={request.error ? { message: request.error, status: request.status } : null} retry={request.retry}>
      {request.data && <><ProductEditor key={(id || 'new') + '-' + status} id={id} returnTo={returnTo} readOnly={readOnly || status === 'inactive'} activeContent={status === 'active'} {...request.data} record={{ ...request.data.record, status }} />{id && !readOnly && <ProductPublishingPanel id={id} name={request.data.record.name} onStatusChange={(status) => setCurrentStatus({ id, status })} />}</>}
    </AdminFeedback>
  </>;
}

function ProductEditor({ id, record, options, returnTo, readOnly, activeContent }) {
  const navigate = useNavigate();
  const [category, setCategory] = useState(record.category_id);
  const [name, setName] = useState(record.name);
  const [slug, setSlug] = useState(record.slug);
  const [manualSlug, setManualSlug] = useState(false);
  const [variants, setVariants] = useState(() => record.variants.length ? record.variants.map((variant) => ({ ...variant, key: 'saved-' + variant.id, color: variant.options?.color || '' })) : [freshVariant()]);
  const [images, setImages] = useState(() => record.images.map((image) => ({ ...image, key: 'saved-' + image.id })));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const previewUrls = useRef(new Set());
  useEffect(() => { const urls = previewUrls.current; return () => urls.forEach((url) => URL.revokeObjectURL(url)); }, []);
  const disabled = busy || readOnly;
  function updateName(event) { setName(event.target.value); if (!id && !manualSlug) setSlug(suggestCatalogSlug(event.target.value)); }
  function updateVariant(key, field, value) { setVariants((rows) => rows.map((row) => row.key === key ? { ...row, [field]: value } : row)); }
  function preview(file) { const url = URL.createObjectURL(file); previewUrls.current.add(url); return url; }
  function addImages(event) {
    const files = [...event.target.files];
    if (images.length + files.length > 10) { setMessage('Bộ ảnh tối đa 10 ảnh.'); event.target.value = ''; return; }
    setImages((rows) => [...rows, ...files.map((file) => ({ key: crypto.randomUUID(), file, preview: preview(file), alt_text: '', sort_order: rows.length }))]);
    event.target.value = '';
  }
  function updateImage(key, values) { setImages((rows) => rows.map((row) => row.key === key ? { ...row, ...values } : row)); }
  function moveImage(index, direction) {
    setImages((rows) => { const next = [...rows]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; });
  }
  async function submit(event) {
    event.preventDefault();
    if (submitting.current || readOnly) return;
    const data = new FormData(event.currentTarget);
    const fields = Object.fromEntries((activeContent ? ['name', 'short_description', 'description'] : ['name', 'slug', 'category_id', 'brand_id', 'short_description', 'description', 'warranty_months']).map((key) => [key, data.get(key)]));
    submitting.current = true; setBusy(true); setErrors({}); setMessage('');
    try {
      const saved = await saveAdminProduct(id, fields, variants, images, activeContent);
      navigate(returnTo, { state: { notice: (activeContent ? 'Đã cập nhật nội dung “' : 'Đã lưu bản nháp “') + saved.name + '”.' } });
    } catch (error) {
      setErrors(error.response?.data?.errors || {});
      setMessage(error.response?.status === 409 ? error.response.data.message : adminError(error));
      const field = Object.keys(error.response?.data?.errors || {})[0];
      requestAnimationFrame(() => {
        const element = document.getElementById('field-' + field) || document.getElementById('product-form-error');
        element?.focus(); element?.scrollIntoView({ block: 'center' });
      });
    } finally { submitting.current = false; setBusy(false); }
  }
  return <>
    {readOnly && <p className="admin-notice" role="status">Thông tin sản phẩm hiện chỉ được xem. Sản phẩm đã ẩn có thể nhập thông số và công bố lại bên dưới.</p>}
    {activeContent && !readOnly && <p className="admin-notice">Chỉ sửa tên, mô tả, ảnh và thông số. Slug, danh mục, thương hiệu, SKU, giá và tồn kho được giữ nguyên.</p>}
    <form className="admin-editor product-editor" onSubmit={submit} aria-busy={busy}>
      {message && <p id="product-form-error" tabIndex={-1} className="admin-error-banner" role="alert">{message}</p>}
      <div className="admin-card"><fieldset className="admin-form-section" disabled={disabled}><legend>Thông tin sản phẩm</legend>
        <AdminField name="name" label="Tên sản phẩm *" required maxLength={255} value={name} onChange={updateName} errors={errors} />
        <AdminField disabled={activeContent} name="slug" label="Slug *" required maxLength={255} value={slug} onChange={(event) => { setSlug(event.target.value); setManualSlug(true); }} errors={errors} hint="Slug duy nhất. Đổi tên sản phẩm đã lưu không tự đổi slug." />
        <div className="product-field-grid"><AdminField name="category_id" label="Danh mục *" disabled={activeContent} required value={category} onChange={(event) => setCategory(event.target.value)} errors={errors}><option value="">Chọn danh mục</option>{options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_active ? '' : ' — Đã ẩn'}</option>)}</AdminField><AdminField name="brand_id" label="Thương hiệu *" disabled={activeContent} required defaultValue={record.brand_id} errors={errors}><option value="">Chọn thương hiệu</option>{options.brands.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_active ? '' : ' — Đã ẩn'}</option>)}</AdminField></div>
        <CategorySpecificationPreview category={category} />
        <AdminField disabled={activeContent} name="warranty_months" label="Bảo hành (tháng) *" type="number" min="0" max="65535" step="1" required defaultValue={record.warranty_months} errors={errors} />
        <AdminField name="short_description" label="Mô tả ngắn" multiline rows={3} maxLength={5000} defaultValue={record.short_description || ''} errors={errors} />
        <AdminField name="description" label="Mô tả sản phẩm" multiline rows={6} maxLength={50000} defaultValue={record.description || ''} errors={errors} hint="Nhập văn bản thuần, không sử dụng mã HTML." />
      </fieldset></div>
      <div className="admin-card"><fieldset className="admin-form-section" disabled={disabled}><legend>Hình ảnh</legend>
        <p className="admin-help">Ảnh đầu tiên là đại diện. Bộ ảnh dùng chung cho sản phẩm, chưa gắn riêng từng SKU. JPG/PNG/WebP, tối đa 5 MB/ảnh, 10 ảnh.</p>
        <div className="product-upload"><label htmlFor="product-images"><Icon name="grid" />Thêm ảnh từ máy</label><input id="product-images" data-testid="product-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addImages} /></div>
        <div id="field-images" tabIndex={-1}>{errors.images && <p className="admin-field-error">{errors.images[0]}</p>}
          {images.length ? images.map((image, index) => <div className="product-image-row" key={image.key} data-image-index={index}>
            <img key={image.preview || image.url} src={image.preview || image.url} alt={image.alt_text || 'Ảnh sản phẩm ' + (index + 1)} onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} />
            <div className="product-image-fields"><strong>{index === 0 ? 'Ảnh đại diện' : 'Ảnh ' + (index + 1)}</strong><small>{image.file?.name || 'Ảnh đã lưu'}</small>
              <AdminField name={'images.' + index + '.alt_text'} label="Mô tả ảnh" maxLength={255} value={image.alt_text || ''} onChange={(event) => updateImage(image.key, { alt_text: event.target.value })} errors={errors} />
              <label className="product-replace-label" htmlFor={'replace-image-' + index}>Thay tệp ảnh<input id={'replace-image-' + index} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files[0]; if (file) updateImage(image.key, { file, preview: preview(file) }); event.target.value = ''; }} /></label>
              {errors['images.' + index + '.file'] && <p id={'field-images.' + index + '.file'} tabIndex={-1} className="admin-field-error">{errors['images.' + index + '.file'][0]}</p>}
              <div className="product-row-actions"><button type="button" disabled={disabled || index === 0} onClick={() => moveImage(index, -1)} aria-label={'Đưa ảnh ' + (index + 1) + ' lên'}>Lên</button><button type="button" disabled={disabled || index === images.length - 1} onClick={() => moveImage(index, 1)} aria-label={'Đưa ảnh ' + (index + 1) + ' xuống'}>Xuống</button><button type="button" onClick={() => setImages((rows) => rows.filter((row) => row.key !== image.key))} aria-label={'Bỏ ảnh ' + (index + 1)}>Bỏ ảnh</button></div>
            </div>
          </div>) : <p className="product-empty-note">Chưa chọn ảnh. Thêm ít nhất một ảnh trước khi lưu.</p>}
        </div>
      </fieldset></div>
      <div className="admin-card"><fieldset className="admin-form-section" disabled={disabled || activeContent}><legend>Phiên bản / SKU</legend>
        <p className="admin-help">Giá VND nguyên: 0 &lt; giá bán ≤ giá niêm yết, tối đa 999.999.999.999 VND. Tồn kho nguyên không âm. SKU đã lưu được giữ ID; bỏ Hoạt động để ngừng dùng.</p>
        <div id="field-variants" tabIndex={-1}>{errors.variants && <p className="admin-field-error">{errors.variants[0]}</p>}
          {variants.map((variant, index) => <div className="product-sku-row" key={variant.key} data-sku-index={index} role="group" aria-labelledby={'sku-title-' + index}>
            <div className="product-sku-heading"><h3 id={'sku-title-' + index}>Phiên bản {index + 1}{variant.id ? ' · SKU đã lưu' : ' · Mới'}</h3>{!variant.id && <button type="button" disabled={disabled || variants.length <= 1} onClick={() => setVariants((rows) => rows.filter((row) => row.key !== variant.key))} aria-label={'Bỏ SKU ' + (index + 1)}>Bỏ dòng</button>}</div>
            <div className="product-field-grid"><AdminField name={'variants.' + index + '.sku'} label="Mã SKU *" required maxLength={100} value={variant.sku} onChange={(event) => updateVariant(variant.key, 'sku', event.target.value)} errors={errors} /><AdminField name={'variants.' + index + '.name'} label="Tên phiên bản *" required maxLength={150} value={variant.name} onChange={(event) => updateVariant(variant.key, 'name', event.target.value)} errors={errors} /></div>
            <div className="product-price-grid">{[['list_price', 'Giá niêm yết (VND) *'], ['sale_price', 'Giá bán (VND) *'], ['stock_quantity', 'Tồn kho *']].map(([field, label]) => <AdminField key={field} name={'variants.' + index + '.' + field} label={label} type="number" required min={field === 'stock_quantity' ? 0 : 1} max={field === 'stock_quantity' ? 4294967295 : 999999999999} step="1" value={variant[field]} onChange={(event) => updateVariant(variant.key, field, event.target.value)} errors={errors} />)}</div>
            <AdminField name={'variant-color-' + index} label="Màu (nếu có)" maxLength={150} value={variant.color} onChange={(event) => updateVariant(variant.key, 'color', event.target.value)} />
            <label className="admin-checkbox"><input type="checkbox" checked={variant.is_active} onChange={(event) => updateVariant(variant.key, 'is_active', event.target.checked)} /><span>Hoạt động{variant.id && <small>Không xóa cứng SKU đã lưu.</small>}</span></label>
            {Object.keys(errors).filter((key) => key.startsWith('variants.' + index + '.') && !['sku', 'name', 'list_price', 'sale_price', 'stock_quantity'].includes(key.split('.').pop())).map((key) => <p className="admin-field-error" key={key}>{errors[key][0]}</p>)}
          </div>)}
        </div>
        <button className="product-add-sku" type="button" disabled={disabled || variants.length >= 50} onClick={() => setVariants((rows) => [...rows, freshVariant()])}><Icon name="grid" />Thêm SKU</button>
      </fieldset></div>
      <div className="admin-form-actions admin-actions"><Link to={returnTo} aria-disabled={busy || undefined} onClick={(event) => { if (busy) event.preventDefault(); }}>Hủy</Link>{!readOnly && <button className="admin-primary" type="submit" disabled={busy}><Icon name="check" />{busy ? 'Đang lưu…' : activeContent ? 'Lưu nội dung công khai' : id ? 'Lưu thay đổi bản nháp' : 'Lưu bản nháp'}</button>}</div>
    </form>
  </>;
}
