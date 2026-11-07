import { useCallback, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import CatalogStatus from '../../components/CatalogStatus';
import ProductCard from '../../components/ProductCard';
import Icon from '../../components/Icon';
import useCatalog from '../../hooks/useCatalog';
import { getProducts } from '../../services/catalogService';

export default function ProductsPage() {
  const catalog = useOutletContext();
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const loader = useCallback((options) => getProducts(new URLSearchParams(query), options), [query]);
  const listing = useCatalog(catalog.data ? loader : null);
  const [error, setError] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(() => window.matchMedia('(min-width: 641px)').matches);
  const formError = error?.query === params.toString() ? error.message : '';
  if (!catalog.data) return <CatalogStatus {...catalog} />;
  if (!listing.data) return <CatalogStatus {...listing} />;
  const { categories, brands } = catalog.data;
  const category = categories.find((item) => item.slug === params.get('category'));
  const { products: visible, meta } = listing.data;
  const pages = meta.last_page;
  const page = meta.current_page;
  function applyFilters(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get('min_price') && form.get('max_price') && Number(form.get('min_price')) > Number(form.get('max_price'))) {
      setError({ query: params.toString(), message: 'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.' });
      return;
    }
    setError(null);
    const next = new URLSearchParams();
    for (const [key, value] of form) {
      if (String(value).trim()) next.set(key, String(value).trim());
    }
    setParams(next);
  }
  function goToPage(nextPage) {
    const next = new URLSearchParams(params);
    next.set('page', nextPage);
    setParams(next);
  }
  return (
    <div className="wrap listing-page">
      <nav className="breadcrumb-bz" aria-label="Đường dẫn">
        <Link to="/">Trang chủ</Link><Icon name="chevron" />
        <span aria-current="page">{category?.name || 'Tất cả sản phẩm'}</span>
      </nav>
      <div className="page-heading">
        <div>
          <span className="eyebrow">KHÁM PHÁ SHOPHUB</span>
          <h1>{category?.name || 'Tất cả sản phẩm'}</h1>
          <p>Tìm lựa chọn phù hợp với bạn.</p>
        </div>
        <span className="result-total">{meta.total} sản phẩm</span>
      </div>
      <div className="catalog-layout">
        <aside className="filter-sidebar">
          <details className="filter-details" open={filtersOpen} onToggle={(event) => setFiltersOpen(event.currentTarget.open)}>
            <summary><Icon name="filter" />Bộ lọc sản phẩm<Icon name="chevron" /></summary>
            <form id="catalog-filters" key={params.toString()} onSubmit={applyFilters}>
              <label htmlFor="filter-category">Danh mục</label>
              <select id="filter-category" name="category" defaultValue={params.get('category') || ''}>
                <option value="">Tất cả danh mục</option>
                {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </select>
              <label htmlFor="filter-brand">Thương hiệu</label>
              <select id="filter-brand" name="brand" defaultValue={params.get('brand') || ''}>
                <option value="">Tất cả thương hiệu</option>
                {brands.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </select>
              <fieldset>
                <legend>Khoảng giá (VND)</legend>
                <label className="visually-hidden" htmlFor="filter-min">Giá tối thiểu</label>
                <input
                  id="filter-min" type="number" name="min_price" min="0" step="1"
                  max="999999999999" placeholder="Giá từ"
                  defaultValue={params.get('min_price') || ''}
                  aria-describedby="price-note price-error" aria-invalid={!!formError}
                />
                <span className="price-separator">đến</span>
                <label className="visually-hidden" htmlFor="filter-max">Giá tối đa</label>
                <input
                  id="filter-max" type="number" name="max_price" min="0" step="1"
                  max="999999999999" placeholder="Giá đến"
                  defaultValue={params.get('max_price') || ''}
                  aria-describedby="price-note price-error" aria-invalid={!!formError}
                />
                <small id="price-note">Theo giá thấp nhất của các phiên bản hiển thị, kể cả phiên bản hết hàng.</small>
                <p id="price-error" className="field-error" role="alert">{formError}</p>
              </fieldset>
              <label className="check-label">
                <input type="checkbox" name="in_stock" value="1" defaultChecked={params.get('in_stock') === '1'} />
                Chỉ sản phẩm còn hàng
              </label>
              <label className="check-label">
                <input type="checkbox" name="promotion" value="1" defaultChecked={params.get('promotion') === '1'} />
                Đang khuyến mãi
              </label>
              <button className="btn-bz" type="submit">Áp dụng bộ lọc<Icon name="arrow" /></button>
              <Link className="reset-filters" to="/products" onClick={() => setError(null)}>Xóa bộ lọc</Link>
            </form>
          </details>
        </aside>
        <section className="catalog-results" aria-label="Danh sách sản phẩm">
          <div className="catalog-toolbar">
            <div className="list-search">
              <label className="visually-hidden" htmlFor="list-search">Tìm trong sản phẩm</label>
              <Icon name="search" />
              <input
                key={`q-${params.toString()}`} id="list-search" form="catalog-filters"
                name="q" type="search" maxLength={200}
                placeholder="Tìm tên sản phẩm, thương hiệu, SKU…" defaultValue={params.get('q') || ''}
              />
              <button form="catalog-filters" type="submit">Tìm</button>
            </div>
            <div className="sort-control">
              <label htmlFor="sort">Sắp xếp</label>
              <select
                key={`sort-${params.toString()}`} id="sort" form="catalog-filters" name="sort"
                defaultValue={params.get('sort') || 'newest'}
                onChange={(event) => event.currentTarget.form.requestSubmit()}
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
                <option value="name">Tên A–Z</option>
              </select>
            </div>
          </div>
          <p className="results-summary" role="status">
            {params.get('q') && <>Kết quả cho “{params.get('q')}” · </>}
            {visible.length
              ? `Hiển thị ${meta.from}–${meta.to} / ${meta.total} sản phẩm`
              : 'Không tìm thấy sản phẩm phù hợp'}
          </p>
          {visible.length ? (
            <div className="product-grid listing-grid">
              {visible.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <div className="state-panel empty-state">
              <Icon name="search" /><h2>Chưa tìm thấy sản phẩm</h2>
              <p>Thử từ khóa khác hoặc điều chỉnh bộ lọc.</p>
              {meta.total > 0 && <p>Trang này không có sản phẩm. Hãy chọn lại trang đầu.</p>}
              <Link className="btn-bz" to="/products">Xem tất cả sản phẩm</Link>
            </div>
          )}
          {pages > 1 && (
            <nav className="pagination" aria-label="Phân trang sản phẩm">
              <button disabled={page === 1} onClick={() => goToPage(page - 1)} aria-label="Trang trước">
                <Icon name="chevron" className="reverse" />
              </button>
              {Array.from({ length: pages }, (_, index) => (
                <button
                  key={index} onClick={() => goToPage(index + 1)}
                  aria-current={page === index + 1 ? 'page' : undefined} aria-label={`Trang ${index + 1}`}
                >{index + 1}</button>
              ))}
              <button disabled={page >= pages} onClick={() => goToPage(page + 1)} aria-label="Trang tiếp theo">
                <Icon name="chevron" />
              </button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
