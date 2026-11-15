import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon';

function FilterSelect({ filter }) {
  const [value, setValue] = useState(filter.value);
  return <select id={filter.id} name={filter.name} value={value} onChange={(event) => setValue(event.target.value)}>
    {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>;
}

export default function AdminFilterToolbar({ query, onSubmit, search, filters, resetTo }) {
  return <form className="admin-filters" key={query} onSubmit={onSubmit}>
    <label className="admin-search-field" htmlFor={search.id}>
      <span className="admin-label">Tìm kiếm</span>
      <span className="admin-search-input"><Icon name="search" /><input id={search.id} name="q" maxLength={search.maxLength} defaultValue={search.value || ''} placeholder={search.placeholder} /></span>
    </label>
    {filters.map((filter) => <label key={filter.name} htmlFor={filter.id}>
      <span className="admin-label">{filter.label}</span>
      <FilterSelect filter={filter} />
    </label>)}
    <button type="submit"><Icon name="filter" />Lọc kết quả</button>
    <Link className="admin-reset" to={resetTo}><Icon name="close" />Xóa bộ lọc</Link>
  </form>;
}
