import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import { AdminCatalogForm, AdminCatalogList } from './pages/admin/AdminCatalogPage';
import PublicLayout from './layouts/PublicLayout';
import HomePage from './pages/public/HomePage';
import ProductsPage from './pages/public/ProductsPage';
import ProductDetailPage from './pages/public/ProductDetailPage';
import ConnectionPage from './pages/public/ConnectionPage';
import NotFoundPage from './pages/public/NotFoundPage';
import { AccountProvider } from './contexts/AccountContext';
import { AccountAuthPage, AccountProfilePage } from './pages/public/AccountPage';
import './styles/bazaar.scoped.css';
import './App.css';

export default function App() {
  return (
    <AccountProvider>
      <Routes>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="categories" replace />} />
          {['categories', 'brands'].map((kind) => <Route key={kind} path={kind}>
            <Route index element={<AdminCatalogList key={kind} kind={kind} />} />
            <Route path="create" element={<AdminCatalogForm key={`${kind}-create`} kind={kind} />} />
            <Route path=":id/edit" element={<AdminCatalogForm key={`${kind}-edit`} kind={kind} />} />
          </Route>)}
          <Route path="*" element={<Navigate to="/admin/categories" replace />} />
        </Route>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:slug" element={<ProductDetailPage />} />
          <Route path="login" element={<AccountAuthPage key="login" />} />
          <Route path="register" element={<AccountAuthPage key="register" register />} />
          <Route path="account" element={<AccountProfilePage />} />
          <Route path="connection" element={<ConnectionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AccountProvider>
  );
}
