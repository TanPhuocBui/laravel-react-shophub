import { useCallback, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import { AdminFeedback, AdminField } from '../../components/admin/AdminFeedback';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import ConfirmHideDialog from '../../components/admin/ConfirmHideDialog';
import useCatalog from '../../hooks/useCatalog';
import { adminError, getAdminCatalog, getCategoryOptions, hideAdminCatalog, listAdminCatalog, saveAdminCatalog } from '../../services/adminCatalogService';
import { adminCatalogTitle, catalogReturnTo, categoryParentLabel, suggestCatalogSlug } from '../../utils/adminCatalog';

const failure = (error) => Object.assign(new Error(adminError(error)), { status: error.response?.status });

export function AdminCatalogList({ kind }) {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const location = useLocation();
  const [selected, setSelected] = useState(null);
  const [hiding, setHiding] = useState(false);
  const [hideError, setHideError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const hidingRef = useRef(false);
  const title = adminCatalogTitle(kind);
  const base = '/admin/' + kind;
  const returnTo = location.pathname + location.search;
  const hasFilters = Boolean(params.get('q')?.trim()) || ['active', 'inactive'].includes(params.get('status'));
  const loader = useCallback(async ({ signal }) => {
    try {
      const [listing, parents] = await Promise.all([
        listAdminCatalog(kind, Object.fromEntries(new URLSearchParams(query)), signal),
        kind === 'categories' ? getCategoryOptions(signal) : Promise.resolve([]),
      ]);
      return { ...listing, parents };
    } catch (error) { throw failure(error); }
  }, [kind, query]);
  const request = useCatalog(loader);
  const { data, loading } = request;
  const error = request.error ? { message: request.error, status: request.status } : null;
  const firstPage = new URLSearchParams(params);
  firstPage.delete('page');
  const firstPageUrl = base + (firstPage.size ? '?' + firstPage : '');
  function search(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      const trimmed = String(value).trim();
      if (trimmed && trimmed !== 'all') next.set(key, trimmed);
    }
    if (params.has('per_page')) next.set('per_page', params.get('per_page'));
    setParams(next);
  }
  function goToPage(page) {
    const next = new URLSearchParams(params);
    next.set('page', page);
    setParams(next);
  }
  async function confirmHide() {
    if (hidingRef.current) return;
    hidingRef.current = true; setHiding(true); setHideError('');
    try {
      await hideAdminCatalog(kind, selected.id);
      setNotice('Đã ẩn ' + selected.name + '.'); setSelected(null);
      request.retry();
    } catch (error) { setHideError(adminError(error)); }
    finally { hidingRef.current = false; setHiding(false); }
  }
  return <>
    <div className="admin-heading">
      <div><h1>{title}</h1><p>{kind === 'categories' ? 'Sắp xếp danh mục và quản lý phân cấp sản phẩm.' : 'Quản lý thương hiệu xuất hiện trên cửa hàng.'}</p></div>
      <Link className="admin-primary" to={base + '/create'} state={{ returnTo }}><Icon name="grid" />Thêm {title.toLowerCase()}</Link>
    </div>
    {notice && <div className="admin-notice" role="status"><Icon name="check" /><span>{notice}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}><Icon name="close" /></button></div>}
    <section className="admin-card" aria-label={'Danh sách ' + title.toLowerCase()}>
      <form className="admin-filters" key={query} onSubmit={search}>
        <label className="admin-search-field" htmlFor="admin-search"><span className="admin-label">Tìm kiếm</span><span className="admin-search-input"><Icon name="search" /><input id="admin-search" name="q" maxLength={150} defaultValue={params.get('q') || ''} placeholder={'Tìm tên hoặc slug ' + title.toLowerCase() + '…'} /></span></label>
        <label htmlFor="admin-status"><span className="admin-label">Trạng thái</span><select id="admin-status" name="status" defaultValue={params.get('status') || 'all'}><option value="all">Tất cả trạng thái</option><option value="active">Hoạt động</option><option value="inactive">Đã ẩn</option></select></label>
        <button type="submit"><Icon name="filter" />Lọc kết quả</button>
        <Link className="admin-reset" to={base}><Icon name="close" />Xóa bộ lọc</Link>
      </form>
      <AdminFeedback loading={loading} error={error} retry={request.retry}>
        {data && <>
          <div className="admin-results-bar"><p className="admin-result" role="status">{data.meta.total.toLocaleString('vi-VN')} {title.toLowerCase()}{data.data.length > 0 && <span> · Hiển thị {data.meta.from}–{data.meta.to}</span>}</p>{kind === 'categories' && <p className="admin-table-note">Danh sách theo bộ lọc và trang hiện tại, không phải toàn bộ cây.</p>}</div>
          {data.data.length ? <div className="admin-table-wrap" role="region" aria-label={'Bảng ' + title.toLowerCase()} tabIndex={0}>
            <table className="admin-table">
              <thead><tr><th scope="col">{title}</th>{kind === 'categories' && <><th scope="col">Danh mục cha</th><th scope="col" className="admin-number">Thứ tự</th></>}<th scope="col" className="admin-number">Sản phẩm liên kết</th><th scope="col">Trạng thái</th><th scope="col" className="admin-action-heading">Thao tác</th></tr></thead>
              <tbody>{data.data.map((record) => <tr key={record.id} data-record-id={record.id}>
                <td className="admin-name-cell"><Link className="admin-record-name" to={base + '/' + record.id + '/edit'} state={{ returnTo }}>{record.name}</Link><small className="admin-slug">{record.slug}</small></td>
                {kind === 'categories' && <><td className="admin-parent-cell">{categoryParentLabel(record, data.parents)}</td><td className="admin-number">{record.sort_order}</td></>}
                <td className="admin-number">{record.products_count.toLocaleString('vi-VN')}</td>
                <td><AdminStatusBadge active={record.is_active} /></td>
                <td><div className="admin-row-actions"><Link to={base + '/' + record.id + '/edit'} state={{ returnTo }} aria-label={'Sửa ' + record.name}>Sửa</Link><button type="button" disabled={!record.is_active} aria-label={'Ẩn ' + record.name} onClick={() => { setHideError(''); setSelected(record); }}>Ẩn</button></div></td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="admin-state">
            <Icon name={hasFilters ? 'search' : 'grid'} />
            <h2>{data.meta.total > 0 ? 'Trang này chưa có kết quả' : hasFilters ? 'Không tìm thấy kết quả' : 'Chưa có ' + title.toLowerCase()}</h2>
            <p>{data.meta.total > 0 ? 'Dữ liệu đã thay đổi. Quay về trang đầu để xem danh sách.' : hasFilters ? 'Thử từ khóa khác hoặc xóa bộ lọc đang áp dụng.' : 'Bắt đầu bằng cách thêm ' + title.toLowerCase() + ' đầu tiên.'}</p>
            <Link className="admin-primary" to={data.meta.total > 0 ? firstPageUrl : hasFilters ? base : base + '/create'} state={{ returnTo }}>{data.meta.total > 0 ? 'Về trang đầu' : hasFilters ? 'Xóa bộ lọc' : 'Thêm ' + title.toLowerCase()}</Link>
          </div>}
          {(data.meta.last_page > 1 || data.meta.current_page > 1) && <nav className="admin-pagination" aria-label="Phân trang"><span>Trang {data.meta.current_page} / {data.meta.last_page}</span><div><button type="button" disabled={data.meta.current_page <= 1} onClick={() => goToPage(data.meta.current_page - 1)}><Icon name="chevron" className="admin-rotate" />Trang trước</button><button type="button" disabled={data.meta.current_page >= data.meta.last_page} onClick={() => goToPage(data.meta.current_page + 1)}>Trang sau<Icon name="chevron" /></button></div></nav>}
        </>}
      </AdminFeedback>
    </section>
    {selected && <ConfirmHideDialog record={selected} kind={kind} busy={hiding} error={hideError} onCancel={() => setSelected(null)} onConfirm={confirmHide} />}
  </>;
}

export function AdminCatalogForm({ kind }) {
  const { id } = useParams();
  const location = useLocation();
  const returnTo = catalogReturnTo(kind, location.state);
  const loader = useCallback(async ({ signal }) => {
    try {
      const [record, options] = await Promise.all([
        id ? getAdminCatalog(kind, id, signal) : Promise.resolve({ name: '', slug: '', parent_id: null, sort_order: 0, is_active: true }),
        kind === 'categories' ? getCategoryOptions(signal) : Promise.resolve([]),
      ]);
      if (id) {
        const listing = await listAdminCatalog(kind, { q: record.slug.slice(0, 150), per_page: 50 }, signal);
        const summary = listing.data.find((item) => item.id === record.id);
        if (summary) record.products_count = summary.products_count;
      }
      return { record, options };
    } catch (error) { throw failure(error); }
  }, [kind, id]);
  const request = useCatalog(loader);
  const loadError = request.error ? { message: request.error, status: request.status } : null;
  return <>
    <Link className="admin-back" to={returnTo}><Icon name="arrow" />Quay lại danh sách</Link>
    <div className="admin-heading"><h1>{id ? 'Sửa' : 'Thêm'} {adminCatalogTitle(kind).toLowerCase()}</h1></div>
    <AdminFeedback loading={request.loading} error={loadError} retry={request.retry}>
      {request.data && <CatalogEditor key={kind + '-' + (id || 'new')} kind={kind} id={id} returnTo={returnTo} {...request.data} />}
    </AdminFeedback>
  </>;
}

function CatalogEditor({ kind, id, returnTo, record, options }) {
  const navigate = useNavigate();
  const [name, setName] = useState(record.name);
  const [slug, setSlug] = useState(record.slug);
  const [slugEdited, setSlugEdited] = useState(false);
  const [parentId, setParentId] = useState(record.parent_id ?? '');
  const [active, setActive] = useState(record.is_active);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingFields, setPendingFields] = useState(null);
  const submitting = useRef(false);
  const forbidden = new Set(id ? [Number(id)] : []);
  for (let changed = true; changed;) {
    changed = false;
    for (const option of options) if (forbidden.has(option.parent_id) && !forbidden.has(option.id)) { forbidden.add(option.id); changed = true; }
  }
  const selectedParent = options.find((option) => option.id === Number(parentId));
  function updateName(event) {
    const value = event.target.value;
    setName(value);
    if (!id && !slugEdited) setSlug(suggestCatalogSlug(value));
  }
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    fields.is_active = active;
    if (kind === 'categories') { fields.parent_id = parentId ? Number(parentId) : null; fields.sort_order = Number(fields.sort_order); }
    if (id && record.is_active && !fields.is_active) { setPendingFields(fields); return; }
    await save(fields);
  }
  async function save(fields) {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setErrors({}); setMessage('');
    try {
      await saveAdminCatalog(kind, id, fields);
      navigate(returnTo, { state: { notice: 'Đã ' + (id ? 'cập nhật ' : 'thêm ') + fields.name + '.' } });
    } catch (error) {
      setPendingFields(null); setMessage(adminError(error)); setErrors(error.response?.data?.errors || {});
      const first = Object.keys(error.response?.data?.errors || {})[0];
      if (first) requestAnimationFrame(() => document.getElementById('field-' + first)?.focus());
    } finally { submitting.current = false; setBusy(false); }
  }
  return <div className="admin-editor-grid">
    <form className="admin-editor" onSubmit={submit} aria-busy={busy}>
      {message && <p role="alert" className="admin-error-banner"><Icon name="shield" />{message} {message.includes('đăng nhập lại') && <Link to="/login">Đăng nhập</Link>}</p>}
      <div className="admin-card admin-form-card">
        <fieldset className="admin-form-section" disabled={busy}><legend>Thông tin cơ bản</legend>
          <AdminField name="name" label="Tên *" required maxLength={150} value={name} onChange={updateName} errors={errors} autoComplete="off" placeholder={kind === 'categories' ? 'Ví dụ: Linh kiện và phụ kiện' : 'Ví dụ: ASUS'} />
          <AdminField name="slug" label="Slug *" required maxLength={180} value={slug} onChange={(event) => { setSlug(event.target.value); setSlugEdited(true); }} errors={errors} autoComplete="off" spellCheck={false} hint={id ? 'Slug được giữ nguyên khi đổi tên. Chỉ sửa khi bạn muốn đổi đường dẫn.' : 'Tự gợi ý từ tên. Dùng chữ thường không dấu, số và dấu gạch ngang.'} />
          {!id && slugEdited && <button className="admin-text-button" type="button" onClick={() => { setSlug(suggestCatalogSlug(name)); setSlugEdited(false); }}>Dùng lại slug gợi ý</button>}
        </fieldset>
        {kind === 'categories' && <fieldset className="admin-form-section" disabled={busy}><legend>Phân cấp</legend>
          <AdminField name="parent_id" label="Danh mục cha" value={parentId} onChange={(event) => setParentId(event.target.value)} errors={errors} hint="Chỉ chọn cha trực tiếp. Chính danh mục này và các danh mục con đã được loại khỏi lựa chọn.">
            <option value="">Danh mục gốc — không có cha</option>
            {options.filter((option) => !forbidden.has(option.id)).map((option) => <option key={option.id} value={option.id}>{option.name}{option.is_active ? '' : ' — Đã ẩn'}</option>)}
          </AdminField>
          {selectedParent && !selectedParent.is_active && <p className="admin-parent-warning"><Icon name="shield" />Cha “{selectedParent.name}” đang ẩn. Danh mục con vẫn giữ trạng thái riêng.</p>}
          <AdminField name="sort_order" label="Thứ tự hiển thị *" type="number" min="0" max="4294967295" step="1" required defaultValue={record.sort_order} errors={errors} hint="Số nhỏ hơn được xếp trước." />
        </fieldset>}
        <fieldset className="admin-form-section admin-status-section" disabled={busy}><legend>Trạng thái hiển thị</legend>
          <label className="admin-checkbox" htmlFor="field-is_active"><input id="field-is_active" name="is_active" type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} aria-invalid={Boolean(errors.is_active)} aria-describedby="hint-is_active error-is_active" /><span><strong>Hoạt động</strong><small>{active ? 'Cho phép xuất hiện trên cửa hàng theo quy tắc catalog.' : 'Đã chọn ẩn. Dữ liệu và liên kết vẫn được giữ.'}</small></span></label>
          <p id="hint-is_active" className="admin-help">Có thể mở lại bất cứ lúc nào bằng cách chọn Hoạt động.</p>
          <p id="error-is_active" className="admin-field-error">{errors.is_active?.[0]}</p>
        </fieldset>
      </div>
      <div className="admin-form-actions admin-actions"><Link to={returnTo} aria-disabled={busy || undefined} onClick={(event) => { if (busy) event.preventDefault(); }}>Hủy</Link><button className="admin-primary" disabled={busy} type="submit"><Icon name="check" />{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div>
    </form>
    <aside className="admin-context" aria-label="Thông tin ngữ cảnh">
      <div className="admin-card admin-context-card"><h2>{id ? 'Thông tin hiện tại' : 'Trước khi tạo mới'}</h2>
        {id ? <><span className="admin-context-label">Trạng thái hiện tại</span><AdminStatusBadge active={record.is_active} /></> : <p>Tạo {adminCatalogTitle(kind).toLowerCase()} với tên dễ nhận biết và slug duy nhất.</p>}
        {id && active !== record.is_active && <p className="admin-pending-status">Sau khi lưu: <strong>{active ? 'Hoạt động' : 'Đã ẩn'}</strong></p>}
        {Number.isInteger(record.products_count) && <div className="admin-context-fact"><strong>{record.products_count.toLocaleString('vi-VN')}</strong><span>sản phẩm liên kết</span></div>}
        {kind === 'categories' && <div className="admin-context-parent"><span className="admin-context-label">Cha được chọn</span><strong>{selectedParent?.name || 'Danh mục gốc'}</strong>{selectedParent && <small>{selectedParent.is_active ? 'Hoạt động' : 'Đã ẩn'}</small>}</div>}
      </div>
      <div className="admin-context-help"><Icon name="shield" /><h2>Khi ẩn {adminCatalogTitle(kind).toLowerCase()}</h2><p>{kind === 'categories' ? 'Sản phẩm thuộc trực tiếp danh mục sẽ không còn công khai. Ẩn cha không tự ẩn con; con đang hoạt động vẫn có thể truy cập riêng.' : 'Sản phẩm thuộc thương hiệu sẽ không còn công khai.'}</p><p>Dữ liệu và các liên kết được giữ nguyên để bạn có thể mở lại sau.</p></div>
    </aside>
    {pendingFields && <ConfirmHideDialog record={record} kind={kind} busy={busy} error="" onCancel={() => setPendingFields(null)} onConfirm={() => save(pendingFields)} />}
  </div>;
}
