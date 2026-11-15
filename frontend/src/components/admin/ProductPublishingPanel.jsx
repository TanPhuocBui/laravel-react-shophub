import { useCallback, useState } from 'react';
import { AdminFeedback } from './AdminFeedback';
import ProductPublishingEditor from './ProductPublishingEditor';
import useCatalog from '../../hooks/useCatalog';
import { adminError } from '../../services/adminCatalogService';
import { loadPublishing } from '../../services/adminPublishingService';

export function CategorySpecificationPreview({ category }) {
  const loader = useCallback(async ({ signal }) => category ? loadPublishing('categories/' + category + '/specifications', signal) : { fields: [] }, [category]);
  const request = useCatalog(loader);
  return <div className="admin-help">{request.loading ? 'Đang tải cấu hình thông số…' : request.error ? <span role="alert">Không tải được cấu hình. <button type="button" onClick={request.retry}>Thử lại</button></span> : request.data?.fields.length ? <><strong>Thông số của danh mục: </strong>{request.data.fields.map((f) => f.name + (f.unit ? ' (' + f.unit + ')' : '') + (f.is_required ? ' *' : '')).join(', ')}. Lưu bản nháp rồi nhập giá trị ở vùng Thông số kỹ thuật.</> : 'Danh mục chưa cấu hình thông số.'}</div>;
}

export default function ProductPublishingPanel({ id, name, onStatusChange }) {
  const [notice, setNotice] = useState('');
  const [change, setChange] = useState(null);
  const [revision, setRevision] = useState(0);
  const loader = useCallback(async ({ signal }) => { try { return await loadPublishing('products/' + id + '/specifications', signal); } catch (error) { throw Object.assign(new Error(adminError(error)), { status: error.response?.status }); } }, [id]);
  const request = useCatalog(loader);
  const schema = change?.source === request.data ? change.schema : request.data;
  function updated(next, message, reset = false) {
    setChange({ source: request.data, schema: next });
    setNotice(message);
    if (reset) setRevision((value) => value + 1);
    onStatusChange(next.status);
  }
  return <section className="admin-card admin-form-section product-publishing" aria-label="Thông số và công bố"><h2>Thông số kỹ thuật và công bố</h2>{notice && <p role="status" className="admin-notice">{notice}</p>}<AdminFeedback loading={request.loading} error={request.error ? { message: request.error, status: request.status } : null} retry={request.retry}>{schema && <ProductPublishingEditor key={id + '-' + schema.status + '-' + revision} id={id} name={name} schema={schema} updated={updated} onStart={() => setNotice('')} />}</AdminFeedback></section>;
}
