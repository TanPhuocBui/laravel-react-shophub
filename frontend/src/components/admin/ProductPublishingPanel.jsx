import { useCallback, useRef, useState } from 'react';
import { AdminFeedback, AdminField } from './AdminFeedback';
import ConfirmHideDialog from './ConfirmHideDialog';
import useCatalog from '../../hooks/useCatalog';
import { adminError } from '../../services/adminCatalogService';
import { loadPublishing, changePublishing } from '../../services/adminPublishingService';

export function CategorySpecificationPreview({ category }) {
  const loader = useCallback(async ({ signal }) => category ? loadPublishing('categories/' + category + '/specifications', signal) : { fields: [] }, [category]);
  const request = useCatalog(loader);
  return <div className="admin-help">{request.loading ? 'Đang tải cấu hình thông số…' : request.error ? <span role="alert">Không tải được cấu hình. <button type="button" onClick={request.retry}>Thử lại</button></span> : request.data?.fields.length ? <><strong>Thông số của danh mục: </strong>{request.data.fields.map((f) => f.name + (f.unit ? ' (' + f.unit + ')' : '') + (f.is_required ? ' *' : '')).join(', ')}. Lưu bản nháp rồi nhập giá trị ở vùng Thông số kỹ thuật.</> : 'Danh mục chưa cấu hình thông số.'}</div>;
}

export default function ProductPublishingPanel({ id, name, refresh }) {
  const [notice, setNotice] = useState('');
  const loader = useCallback(async ({ signal }) => { try { return await loadPublishing('products/' + id + '/specifications', signal); } catch (error) { throw Object.assign(new Error(adminError(error)), { status: error.response?.status }); } }, [id]);
  const request = useCatalog(loader);
  return <section className="admin-card admin-form-section product-publishing" aria-label="Thông số và công bố"><h2>Thông số kỹ thuật và công bố</h2>{notice && <p role="status" className="admin-notice">{notice}</p>}<AdminFeedback loading={request.loading} error={request.error ? { message: request.error, status: request.status } : null} retry={request.retry}>{request.data && <PublishingEditor key={id + '-' + request.data.status} id={id} name={name} schema={request.data} updated={(path, message) => { setNotice(message); request.retry(); if (path !== 'specifications') refresh(); }} />}</AdminFeedback></section>;
}

function PublishingEditor({ id, name, schema, updated }) {
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const submitting = useRef(false);
  async function mutate(path, data, method = 'put') {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setErrors({}); setMessage('');
    try { await changePublishing('products/' + id + '/' + path, data, method); const notice = path === 'specifications' ? 'Đã lưu thông số kỹ thuật.' : path === 'publish' ? 'Đã công bố sản phẩm.' : 'Đã ẩn sản phẩm.'; setConfirm(false); updated(path, notice); }
    catch (error) {
      const fields = error.response?.data?.errors || {}; setErrors(fields); setMessage(adminError(error));
      requestAnimationFrame(() => { const element = document.getElementById('field-' + Object.keys(fields)[0]) || document.getElementById('publishing-message'); element?.focus(); });
    } finally { submitting.current = false; setBusy(false); }
  }
  function save(event) { event.preventDefault(); const form = new FormData(event.currentTarget); mutate('specifications', { values: schema.fields.map((field, index) => ({ specification_id: field.id, value: form.get('values.' + index + '.value') })) }); }
  return <>
    <p className="admin-help">Giá trị văn bản. Đơn vị được hiển thị một lần; thứ tự theo cấu hình danh mục. Dấu * là bắt buộc khi công bố. Khi lưu lỗi, dữ liệu nhập được giữ lại.</p>
    {message && <p id="publishing-message" tabIndex={-1} role={Object.keys(errors).length ? 'alert' : 'status'} className={Object.keys(errors).length ? 'admin-error-banner' : 'admin-notice'}>{message}</p>}
    {Object.entries(errors).filter(([key]) => !/^values\.\d+\.value$/.test(key)).map(([key, value]) => <p className="admin-field-error" key={key}>{value.join(' ')}</p>)}
    <form onSubmit={save}><fieldset disabled={busy} className="spec-value-grid">{schema.fields.map((field, index) => <AdminField key={field.id} name={'values.' + index + '.value'} label={field.name + (field.unit ? ' (' + field.unit + ')' : '') + (field.is_required ? ' *' : '')} defaultValue={field.value} maxLength={5000} errors={errors} />)}</fieldset>{schema.fields.length ? <button className="admin-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thông số sản phẩm'}</button> : <p>Danh mục chưa có thông số áp dụng.</p>}</form>
    <div className="publication-context"><h3>{schema.status === 'active' ? 'Đang công khai' : schema.status === 'inactive' ? 'Đã ẩn' : 'Bản nháp'}</h3>
      {schema.publication.issues.length ? <><p>Điều kiện chưa đạt trên dữ liệu đã lưu:</p><ul>{schema.publication.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></> : <p>Dữ liệu đã lưu đủ điều kiện công bố. SKU hết hàng vẫn được xem, không được đặt mua.</p>}
      <p className="admin-help">Ẩn sản phẩm sẽ gỡ khỏi catalog công khai, giữ nguyên ảnh, SKU và liên kết. Có thể công bố lại khi đủ điều kiện.</p>
      <div className="admin-actions">{schema.status !== 'active' && <button className="admin-primary" data-testid="publish-product" disabled={busy} onClick={() => mutate('publish', {}, 'post')}>{schema.status === 'inactive' ? 'Công bố lại' : 'Công bố sản phẩm'}</button>}{schema.status === 'active' && <button className="admin-danger" disabled={busy} onClick={() => setConfirm(true)}>Ẩn sản phẩm</button>}</div>
    </div>
    {confirm && <ConfirmHideDialog kind="products" record={{ name }} busy={busy} error={message} onCancel={() => { if (!busy) setConfirm(false); }} onConfirm={() => mutate('hide', {}, 'post')} />}
  </>;
}
