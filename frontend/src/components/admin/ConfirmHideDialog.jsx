import { useEffect, useRef } from 'react';
import Icon from '../Icon';
import { trapDialogFocus } from './dialogFocus';

export default function ConfirmHideDialog({ record, kind, busy, error, onCancel, onConfirm }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog className="admin-confirm" ref={dialog} aria-labelledby="hide-title" aria-describedby="hide-impact" aria-busy={busy} onKeyDown={trapDialogFocus} onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
    <span className="admin-dialog-icon"><Icon name="shield" /></span>
    <h2 id="hide-title">Ẩn {kind === 'categories' ? 'danh mục' : 'thương hiệu'}?</h2>
    <p className="admin-confirm-name">{record.name}</p>
    {Number.isInteger(record.products_count) && <p className="admin-linked-count">{record.products_count} sản phẩm liên kết</p>}
    <div id="hide-impact"><p>{kind === 'categories' ? 'Sản phẩm thuộc trực tiếp danh mục này sẽ không còn công khai. Ẩn cha không tự ẩn danh mục con; con vẫn có thể được truy cập riêng nếu đang hoạt động.' : 'Sản phẩm thuộc thương hiệu này sẽ không còn công khai.'}</p><p>Dữ liệu và liên kết được giữ nguyên. Bạn có thể mở lại trong form sửa.</p></div>
    {error && <p className="admin-field-error" role="alert">{error}</p>}
    <div className="admin-actions"><button autoFocus type="button" disabled={busy} onClick={onCancel}>Giữ lại</button><button className="admin-danger" type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Đang ẩn…' : 'Xác nhận ẩn'}</button></div>
  </dialog>;
}
