export default function AdminStatusBadge({ active }) {
  return <span className={`admin-badge ${active ? 'active' : ''}`}><span aria-hidden="true" />{active ? 'Hoạt động' : 'Đã ẩn'}</span>;
}
