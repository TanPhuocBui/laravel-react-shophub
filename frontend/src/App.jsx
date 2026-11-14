import { Route, Routes } from 'react-router-dom';
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
