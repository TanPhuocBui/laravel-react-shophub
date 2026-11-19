export default function CatalogStatus({ loading, error, retry, title = 'Chưa thể tải catalog' }) {
  if (loading) return <div className="state-panel" role="status"><span className="spinner" />Đang tải sản phẩm…</div>;
  if (error) return <div className="state-panel"><h2>{title}</h2><p role="alert">{error}</p><button className="btn-bz" type="button" onClick={retry}>Thử lại</button></div>;
  return null;
}
