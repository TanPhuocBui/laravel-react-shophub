import { useRef, useState } from 'react';
import { AdminField } from './AdminFeedback';
import ConfirmHideDialog from './ConfirmHideDialog';
import { adminError } from '../../services/adminCatalogService';
import { loadPublishing, changePublishing } from '../../services/adminPublishingService';

export default function ProductPublishingEditor({ id, name, schema, updated, onStart }) {
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const submitting = useRef(false);
  const disabled = busy || unconfirmed;

  async function mutate(path, data, method = 'put') {
    if (submitting.current || unconfirmed) return;
    submitting.current = true; setBusy(true); setErrors({}); setMessage(''); onStart();
    try {
      const response = await changePublishing('products/' + id + '/' + path, data, method);
      // A 200 transition confirms the committed state. A values response already
      // contains the refreshed schema; neither operation needs to reload the form.
      const next = response.data || { ...schema, status: path === 'publish' ? 'active' : 'inactive',
        publication: path === 'publish' ? { can_publish: true, issues: [] } : schema.publication };
      const notice = path === 'specifications' ? 'Đã lưu thông số kỹ thuật.' : path === 'publish' ? 'Đã công bố sản phẩm.' : 'Đã ẩn sản phẩm.';
      setConfirm(false); updated(next, notice);
    } catch (error) {
      const fields = error.response?.data?.errors || {};
      setErrors(fields);
      if (error.writeOutcomeUnknown) {
        setUnconfirmed(true); setConfirm(false);
        setMessage('Chưa xác định được kết quả thao tác. Không gửi lại ngay. Hãy kiểm tra dữ liệu đã lưu trước khi tiếp tục.');
      } else setMessage(adminError(error));
      requestAnimationFrame(() => (document.getElementById('field-' + Object.keys(fields)[0]) || document.getElementById('publishing-message'))?.focus());
    } finally { submitting.current = false; setBusy(false); }
  }

  async function checkResult() {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setMessage(''); onStart();
    try {
      const next = await loadPublishing('products/' + id + '/specifications');
      updated(next, 'Đã đọc lại dữ liệu đã lưu. Hãy đối chiếu trước khi thao tác tiếp.', true);
    } catch {
      setMessage('Chưa kiểm tra được kết quả. Giữ nguyên dữ liệu nhập và chưa gửi lại thao tác ghi. Bạn có thể thử kiểm tra lại kết nối.');
    } finally { submitting.current = false; setBusy(false); }
  }

  function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutate('specifications', { values: schema.fields.map((field, index) => ({ specification_id: field.id, value: form.get('values.' + index + '.value') })) });
  }

  return <>
    <p className="admin-help">Giá trị văn bản. Đơn vị được hiển thị một lần; thứ tự theo cấu hình danh mục. Dấu * là bắt buộc khi công bố. Khi lưu lỗi, dữ liệu nhập được giữ lại.</p>
    {message && <p id="publishing-message" tabIndex={-1} role="alert" className="admin-error-banner">{message}</p>}
    {Object.entries(errors).filter(([key]) => !/^values\.\d+\.value$/.test(key)).map(([key, value]) => <p className="admin-field-error" key={key}>{value.join(' ')}</p>)}
    {unconfirmed && <p><button type="button" data-testid="check-publication-result" disabled={busy} onClick={checkResult}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra kết quả đã lưu'}</button></p>}
    <form onSubmit={save} aria-busy={busy}><fieldset disabled={disabled} className="spec-value-grid">{schema.fields.map((field, index) => <AdminField key={field.id} name={'values.' + index + '.value'} label={field.name + (field.unit ? ' (' + field.unit + ')' : '') + (field.is_required ? ' *' : '')} defaultValue={field.value} maxLength={5000} errors={errors} />)}</fieldset>{schema.fields.length ? <button className="admin-primary" disabled={disabled}>{busy ? 'Đang lưu…' : 'Lưu thông số sản phẩm'}</button> : <p>Danh mục chưa có thông số áp dụng.</p>}</form>
    <div className="publication-context"><h3>{schema.status === 'active' ? 'Đang công khai' : schema.status === 'inactive' ? 'Đã ẩn' : 'Bản nháp'}</h3>
      {schema.publication.issues.length ? <><p>Điều kiện chưa đạt trên dữ liệu đã lưu:</p><ul>{schema.publication.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></> : <p>Dữ liệu đã lưu đủ điều kiện công bố. SKU hết hàng vẫn được xem, không được đặt mua.</p>}
      <p className="admin-help">Công bố theo dữ liệu đã lưu; lưu thay đổi trong form trước khi công bố. Ẩn sản phẩm sẽ gỡ khỏi catalog công khai, giữ nguyên ảnh, SKU và liên kết. Có thể công bố lại khi đủ điều kiện.</p>
      <div className="admin-actions">{schema.status !== 'active' && <button className="admin-primary" data-testid="publish-product" disabled={disabled} onClick={() => mutate('publish', {}, 'post')}>{schema.status === 'inactive' ? 'Công bố lại' : 'Công bố sản phẩm'}</button>}{schema.status === 'active' && <button className="admin-danger" disabled={disabled} onClick={() => setConfirm(true)}>Ẩn sản phẩm</button>}</div>
    </div>
    {confirm && <ConfirmHideDialog kind="products" record={{ name }} busy={busy} error={message} onCancel={() => { if (!busy) setConfirm(false); }} onConfirm={() => mutate('hide', {}, 'post')} />}
  </>;
}
