import { useCallback, useRef, useState } from 'react';
import { AdminFeedback, AdminField } from '../../components/admin/AdminFeedback';
import useCatalog from '../../hooks/useCatalog';
import { getProductOptions } from '../../services/adminProductService';
import { adminError } from '../../services/adminCatalogService';
import { loadPublishing, changePublishing } from '../../services/adminPublishingService';

export default function AdminSpecificationsPage() {
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');
  const loader = useCallback(async ({ signal }) => {
    try {
      const [definitions, options] = await Promise.all([loadPublishing('specifications', signal), getProductOptions(signal)]);
      return { definitions, options };
    }
    catch (error) { throw Object.assign(new Error(adminError(error)), { status: error.response?.status }); }
  }, []);
  const request = useCatalog(loader);
  return <>
    <div className="admin-heading"><div><h1>Thông số kỹ thuật</h1><p>Khai báo thông số văn bản, sau đó áp dụng cho từng danh mục trực tiếp.</p></div></div>
    {notice && <p role="status" className="admin-notice">{notice}</p>}
    <AdminFeedback loading={request.loading} error={request.error ? { message: request.error, status: request.status } : null} retry={request.retry}>
      {request.data && <>
        <div className="spec-definition-layout">
          <section className="admin-card admin-form-section"><h2>Danh sách thông số</h2><p className="admin-help">Mã và đơn vị đã có giá trị không thể đổi. Thông số đang sử dụng không thể ngừng hoạt động.</p>
            {request.data.definitions.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tên / Mã</th><th>Đơn vị</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{request.data.definitions.map((spec) => <tr key={spec.id}><td><strong>{spec.name}</strong><small className="admin-slug">{spec.code}</small></td><td>{spec.unit || '—'}</td><td>{spec.is_active ? 'Hoạt động' : 'Ngừng hoạt động'}</td><td><button onClick={() => setEditing(spec)} aria-label={'Sửa thông số ' + spec.name}>Sửa</button></td></tr>)}</tbody></table></div> : <p>Chưa có thông số. Thêm thông số đầu tiên ở biểu mẫu bên cạnh.</p>}
          </section>
          <DefinitionForm key={editing?.id || 'new'} record={editing} done={() => { setNotice('Đã lưu định nghĩa thông số.'); setEditing(null); request.retry(); }} cancel={() => setEditing(null)} />
        </div>
        <section className="admin-card admin-form-section"><h2>Cấu hình theo danh mục</h2><p className="admin-help">Không kế thừa từ danh mục cha. Thứ tự nhỏ hiển thị trước. Không gỡ thông số đã có giá trị hoặc đặt bắt buộc khi sản phẩm công khai còn thiếu giá trị.</p>
          <AdminField name="config-category" label="Danh mục" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Chọn danh mục</option>{request.data.options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}{!item.is_active && ' — Đã ẩn'}</option>)}</AdminField>
          {category && <CategoryConfiguration key={category + '-' + request.data.definitions.map((s) => s.id + s.is_active).join(',')} category={category} definitions={request.data.definitions} />}
        </section>
      </>}
    </AdminFeedback>
  </>;
}

function DefinitionForm({ record, done, cancel }) {
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function submit(event) {
    event.preventDefault(); if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    submitting.current = true; setBusy(true); setMessage(''); setErrors({});
    try {
      await changePublishing('specifications' + (record ? '/' + record.id : ''), { name: data.get('spec-name'), code: data.get('code'), unit: data.get('unit'), is_active: data.has('is_active') }, record ? 'put' : 'post');
      done();
    } catch (error) {
      const fields = error.response?.data?.errors || {}; setErrors({ ...fields, 'spec-name': fields.name }); setMessage(adminError(error));
      requestAnimationFrame(() => document.getElementById('field-' + (Object.keys(fields)[0] === 'name' ? 'spec-name' : Object.keys(fields)[0]))?.focus());
    } finally { submitting.current = false; setBusy(false); }
  }
  return <form className="admin-card admin-form-section" onSubmit={submit} aria-busy={busy}><h2>{record ? 'Sửa thông số' : 'Thêm thông số'}</h2>{message && <p className="admin-error-banner" role="alert">{message}</p>}
    <fieldset disabled={busy}><AdminField name="spec-name" label="Tên thông số *" required maxLength={100} defaultValue={record?.name || ''} errors={errors} /><AdminField name="code" label="Mã *" required maxLength={100} defaultValue={record?.code || ''} errors={errors} hint="Chữ thường không dấu, số, dấu gạch ngang hoặc gạch dưới; bắt đầu bằng chữ." /><AdminField name="unit" label="Đơn vị" maxLength={30} defaultValue={record?.unit || ''} errors={errors} /><label className="admin-checkbox"><input name="is_active" type="checkbox" defaultChecked={record?.is_active ?? true} />Hoạt động</label>{errors.is_active && <p className="admin-field-error">{errors.is_active[0]}</p>}</fieldset>
    <div className="admin-actions">{record && <button type="button" disabled={busy} onClick={cancel}>Hủy</button>}<button className="admin-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thông số'}</button></div>
  </form>;
}

function CategoryConfiguration({ category, definitions }) {
  const loader = useCallback(async ({ signal }) => { try { return await loadPublishing('categories/' + category + '/specifications', signal); } catch (error) { throw Object.assign(new Error(adminError(error)), { status: error.response?.status }); } }, [category]);
  const request = useCatalog(loader);
  return <AdminFeedback loading={request.loading} error={request.error ? { message: request.error, status: request.status } : null} retry={request.retry}>{request.data && <ConfigurationForm key={category} category={category} schema={request.data} definitions={definitions} />}</AdminFeedback>;
}

function ConfigurationForm({ category, schema, definitions }) {
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function submit(event) {
    event.preventDefault(); if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    const items = definitions.filter((s) => s.is_active && form.has('use-' + s.id)).map((s) => ({ specification_id: s.id, is_required: form.has('required-' + s.id), sort_order: form.get('order-' + s.id) }));
    submitting.current = true; setBusy(true); setErrors({}); setMessage('');
    try { await changePublishing('categories/' + category + '/specifications', { items }); setMessage('Đã lưu cấu hình danh mục.'); }
    catch (error) { setErrors(error.response?.data?.errors || {}); setMessage(adminError(error)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <form onSubmit={submit} aria-busy={busy}>
    {message && <p className={Object.keys(errors).length ? 'admin-error-banner' : 'admin-notice'} role={Object.keys(errors).length ? 'alert' : 'status'}>{message}</p>}
    {Object.entries(errors).map(([key, value]) => <p className="admin-field-error" key={key}>{value.join(' ')}</p>)}
    <fieldset disabled={busy}><div className="spec-config-rows">{definitions.filter((spec) => spec.is_active).map((spec) => { const field = schema.fields.find((f) => f.id === spec.id); return <div className="spec-config-row" key={spec.id}>
      <label className="admin-checkbox"><input name={'use-' + spec.id} type="checkbox" defaultChecked={!!field} /><span>{spec.name}<small>{spec.code}{spec.unit ? ' · ' + spec.unit : ''}</small></span></label>
      <label className="admin-checkbox"><input name={'required-' + spec.id} type="checkbox" defaultChecked={field?.is_required || false} />Bắt buộc khi công bố</label>
      <AdminField name={'order-' + spec.id} label={'Thứ tự ' + spec.name} type="number" min="0" max="4294967295" required defaultValue={field?.sort_order ?? 0} />
    </div>; })}</div></fieldset><button className="admin-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu cấu hình'}</button>
  </form>;
}
