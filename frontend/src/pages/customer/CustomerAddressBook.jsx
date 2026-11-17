import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AccountField from '../../components/account/AccountField';
import { trapDialogFocus } from '../../components/admin/dialogFocus';
import { addressError, listAddresses, writeAddress } from '../../services/customerAddressService';
import '../../styles/customer-addresses.css';

export default function CustomerAddressBook() {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsCheck, setNeedsCheck] = useState(null);
  const writing = useRef(false);
  const reader = useRef(null);
  const load = useCallback(async (page, signal) => {
    try {
      let result = await listAddresses(page, signal);
      if (!result.data.length && result.meta.total && page > result.meta.last_page) result = await listAddresses(result.meta.last_page, signal);
      if (signal.aborted) return false;
      setListing(result); setLoadError(null);
      return true;
    } catch (error) { if (!signal.aborted) setLoadError(error); return false; }
    finally { if (!signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController(); reader.current = controller;
    listAddresses(1, controller.signal).then((result) => { if (!controller.signal.aborted) { setListing(result); setLoadError(null); } })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => reader.current?.abort();
  }, []);

  function refresh(page = 1) {
    reader.current?.abort(); const controller = new AbortController(); reader.current = controller;
    setLoading(true); setLoadError(null);
    return load(page, controller.signal);
  }
  function openEditor(record) { setEditor(record); setErrors({}); setMessage(''); setNotice(''); requestAnimationFrame(() => document.getElementById('recipient_name')?.focus()); }
  async function perform(action, record, fields) {
    if (writing.current || needsCheck) return;
    writing.current = true; setBusy(true); setErrors({}); setMessage(''); setNotice('');
    const page = action === 'update' ? listing?.meta.current_page || 1 : 1;
    try {
      await writeAddress(action, record, fields);
      setDeleting(null);
      if (await refresh(page)) {
        setEditor(null);
        setNotice(action === 'delete' ? 'Đã xóa địa chỉ và cập nhật địa chỉ mặc định.' : action === 'default' ? 'Đã đặt địa chỉ mặc định.' : 'Đã lưu địa chỉ giao hàng.');
      } else {
        setNeedsCheck({ page });
        setMessage('Thao tác đã thành công, nhưng chưa tải lại được danh sách. Hãy kiểm tra danh sách trước khi thao tác tiếp.');
      }
    } catch (error) {
      if (error.writeOutcomeUnknown) {
        setDeleting(null); setNeedsCheck({ page });
        setMessage('Chưa rõ máy chủ đã lưu hay chưa. Chưa gửi lại thao tác ghi; hãy kiểm tra danh sách đã lưu trước.');
      } else {
        const fields = Object.fromEntries(Object.entries(error.response?.data?.errors || {}).map(([key, values]) => [key, values[0]]));
        setErrors(fields); setMessage(addressError(error));
        requestAnimationFrame(() => (document.getElementById(Object.keys(fields)[0]) || document.getElementById('address-feedback'))?.focus());
      }
    } finally { writing.current = false; setBusy(false); }
  }
  async function checkResult() {
    if (writing.current) return;
    writing.current = true; setBusy(true);
    try {
      if (await refresh(needsCheck.page)) { setNeedsCheck(null); setMessage(''); setNotice('Đã tải danh sách đã lưu. Hãy đối chiếu với dữ liệu đang nhập trước khi quyết định gửi lại.'); }
    } finally { writing.current = false; setBusy(false); }
  }
  const disabled = busy || loading || Boolean(needsCheck) || Boolean(loadError);
  return <section className="address-book" aria-labelledby="address-book-title">
    <div className="address-heading"><div><h2 id="address-book-title">Địa chỉ giao hàng</h2><p>Lưu thông tin người nhận cho những lần mua sắm sau.</p></div><button type="button" className="address-primary" disabled={disabled} onClick={() => openEditor({})}>Thêm địa chỉ</button></div>
    {notice && <p className="orbit-notice" role="status">{notice}</p>}
    {message && <p id="address-feedback" tabIndex={-1} className="orbit-notice orbit-error" role="alert">{message}</p>}
    {needsCheck && <button type="button" data-testid="address-check-result" disabled={busy || loading} onClick={checkResult}>Kiểm tra danh sách đã lưu</button>}
    {loading ? <p role="status">Đang tải địa chỉ…</p> : loadError ? <div className="address-load-error" role="alert"><p>{addressError(loadError)}</p>{loadError.response?.status === 401 ? <Link to="/login">Đăng nhập lại</Link> : <button disabled={busy} onClick={() => needsCheck ? checkResult() : refresh(listing?.meta.current_page || 1)}>Thử lại</button>}</div> : <>
      <p className="address-help" role="status">{listing?.meta.total || 0} địa chỉ · Địa chỉ đầu tiên tự động là mặc định.</p>
      {!listing?.data.length ? <p className="address-empty">Bạn chưa có địa chỉ giao hàng. Chọn Thêm địa chỉ để bắt đầu.</p> : <div className="address-list">{listing.data.map((record) => <article className="address-card" key={record.id} data-address-id={record.id}>
        <div className="address-card-heading"><h3>{record.recipient_name}</h3>{record.is_default && <span className="address-default">Mặc định</span>}</div><p className="address-phone">{record.phone}</p><p>{[record.address_line, record.ward, record.province].join(', ')}</p>
        <div className="address-actions"><button disabled={disabled} onClick={() => openEditor(record)} aria-label={'Sửa địa chỉ của ' + record.recipient_name}>Sửa</button>{!record.is_default && <button disabled={disabled} onClick={() => perform('default', record)}>Đặt mặc định</button>}<button className="address-delete" disabled={disabled} onClick={() => { setDeleting(record); setMessage(''); }} aria-label={'Xóa địa chỉ của ' + record.recipient_name}>Xóa</button></div>
      </article>)}</div>}
      {listing?.meta.last_page > 1 && <nav className="address-pagination" aria-label="Phân trang địa chỉ"><button disabled={disabled || listing.meta.current_page <= 1} onClick={() => refresh(listing.meta.current_page - 1)}>Trang trước</button><span>Trang {listing.meta.current_page} / {listing.meta.last_page}</span><button disabled={disabled || listing.meta.current_page >= listing.meta.last_page} onClick={() => refresh(listing.meta.current_page + 1)}>Trang sau</button></nav>}
    </>}
    {editor && <AddressForm key={editor.id || 'new'} record={editor} first={listing?.meta.total === 0} errors={errors} disabled={disabled} onSave={(fields) => perform(editor.id ? 'update' : 'create', editor, fields)} onCancel={() => { setEditor(null); setErrors({}); setMessage(''); }} />}
    {deleting && <DeleteAddressDialog record={deleting} busy={busy} error={message} cancel={() => { if (!busy) setDeleting(null); }} confirm={() => perform('delete', deleting)} />}
  </section>;
}

function AddressForm({ record, first, errors, disabled, onSave, onCancel }) {
  const [fields, setFields] = useState(() => ({ recipient_name: record.recipient_name || '', phone: record.phone || '', province: record.province || '', ward: record.ward || '', address_line: record.address_line || '', is_default: record.is_default || first || false }));
  const inputs = [['recipient_name', 'Tên người nhận', 255, 'name'], ['phone', 'Số điện thoại', 20, 'tel'], ['province', 'Tỉnh/Thành phố', 100, 'address-level1'], ['ward', 'Phường/Xã', 100, 'address-level2'], ['address_line', 'Số nhà, tên đường và thông tin bổ sung', 255, 'address-line1']];
  return <form className="address-form orbit-form" aria-label={record.id ? 'Sửa địa chỉ' : 'Thêm địa chỉ'} aria-busy={disabled} onSubmit={(event) => { event.preventDefault(); if (!disabled) onSave(fields); }}>
    <h3>{record.id ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}</h3><fieldset disabled={disabled}>
      {inputs.map(([name, label, max, autoComplete]) => <AccountField key={name} name={name} label={label} maxLength={max} autoComplete={autoComplete} type={name === 'phone' ? 'tel' : 'text'} value={fields[name]} onChange={(event) => setFields((current) => ({ ...current, [name]: event.target.value }))} error={errors[name]} hint={name === 'phone' ? '8–15 chữ số, có thể bắt đầu bằng +. Giữ số 0 đầu.' : undefined} />)}
      <label className="address-checkbox"><input type="checkbox" checked={fields.is_default} disabled={record.is_default || first} onChange={(event) => setFields((current) => ({ ...current, is_default: event.target.checked }))} />Đặt làm địa chỉ mặc định</label>
      {(record.is_default || first) && <p className="address-help">Sổ địa chỉ luôn có một mặc định khi còn địa chỉ. Chọn địa chỉ khác làm mặc định để thay đổi.</p>}{errors.is_default && <p className="orbit-field-error">{errors.is_default}</p>}
    </fieldset><div className="address-actions"><button type="button" disabled={disabled} onClick={onCancel}>Hủy</button><button type="submit" className="address-primary" disabled={disabled}>{disabled ? 'Đang xử lý…' : 'Lưu địa chỉ'}</button></div>
  </form>;
}

function DeleteAddressDialog({ record, busy, error, cancel, confirm }) {
  const dialog = useRef(null);
  useEffect(() => { const element = dialog.current; const previous = document.activeElement; element.showModal(); return () => { element.close(); previous?.focus(); }; }, []);
  return <dialog ref={dialog} className="address-confirm" aria-labelledby="address-delete-title" onKeyDown={trapDialogFocus} onCancel={(event) => { event.preventDefault(); if (!busy) cancel(); }}><h2 id="address-delete-title">Xóa địa chỉ giao hàng?</h2><p><strong>{record.recipient_name}</strong></p><p>{[record.address_line, record.ward, record.province].join(', ')}</p><p>{record.is_default ? 'Địa chỉ còn lại được tạo sớm nhất sẽ trở thành mặc định. Nếu không còn địa chỉ, sổ địa chỉ sẽ rỗng.' : 'Địa chỉ này sẽ được xóa khỏi sổ địa chỉ của bạn.'}</p>{error && <p className="orbit-notice orbit-error" role="alert">{error}</p>}<div className="address-actions"><button autoFocus type="button" disabled={busy} onClick={cancel}>Giữ lại</button><button type="button" className="address-danger" disabled={busy} onClick={confirm}>{busy ? 'Đang xóa…' : 'Xác nhận xóa'}</button></div></dialog>;
}
