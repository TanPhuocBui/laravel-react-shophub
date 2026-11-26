export default function CatalogLoadNotice({ loading, errors, retry }) {
  if (!loading && !errors.length) return null;
  return (
    <div className="wrap catalog-load-status" aria-live="polite">
      {errors.length ? <>
        <div><h2>Chưa tải đầy đủ dữ liệu</h2><p role="alert">{errors[0]}</p></div>
        <button className="btn-bz" type="button" disabled={loading} onClick={retry}>{loading ? 'Đang tải…' : 'Tải lại'}</button>
      </> : <p role="status"><span className="spinner" />Đang tải dữ liệu…</p>}
    </div>
  );
}
