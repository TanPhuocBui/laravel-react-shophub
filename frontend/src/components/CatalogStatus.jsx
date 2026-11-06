export default function CatalogStatus({ loading, error, retry }) {
  if (loading) return <div className="state-panel" role="status"><span className="spinner" />Đang tải sản phẩm…</div>;
  if (error) return <div className="state-panel"><h1>Chưa thể tải catalog</h1><p role="alert">{error}</p><button className="btn-bz" onClick={retry}>Thử lại</button></div>;
  return null;
}
