import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreLayout } from './layouts/StoreLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductPage } from './pages/ProductPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CustomerProfile } from './pages/CustomerProfile';
import { AdminDashboard } from './pages/AdminDashboard';
import { Login } from './features/auth/Login';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Store Routes */}
        <Route path="/" element={<StoreLayout />}>
          <Route index element={<Home />} />
          <Route path="catalogo" element={<Catalog />} />
          <Route path="produto/:id" element={<ProductPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="minha-conta" element={<CustomerProfile />} />
        </Route>

        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          {/* Outras rotas do admin: /admin/orders, /admin/customers */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;