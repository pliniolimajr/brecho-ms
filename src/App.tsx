import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreLayout } from './layouts/StoreLayout';
import { AdminLayout } from './layouts/AdminLayout';

const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Catalog = lazy(() => import('./pages/Catalog').then(module => ({ default: module.Catalog })));
const ProductPage = lazy(() => import('./pages/ProductPage').then(module => ({ default: module.ProductPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(module => ({ default: module.CheckoutPage })));
const CustomerProfile = lazy(() => import('./pages/CustomerProfile').then(module => ({ default: module.CustomerProfile })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const Login = lazy(() => import('./features/auth/Login').then(module => ({ default: module.Login })));
const About = lazy(() => import('./pages/About').then(module => ({ default: module.About })));
const Policies = lazy(() => import('./pages/Policies').then(module => ({ default: module.Policies })));
const FAQ = lazy(() => import('./pages/FAQ').then(module => ({ default: module.FAQ })));
const Contact = lazy(() => import('./pages/Contact').then(module => ({ default: module.Contact })));
const Terms = lazy(() => import('./pages/Terms').then(module => ({ default: module.Terms })));
const Privacy = lazy(() => import('./pages/Privacy').then(module => ({ default: module.Privacy })));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="min-h-screen bg-[#FDF6F0] flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-[#C06A35] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
          {/* Store Routes */}
          <Route path="/" element={<StoreLayout />}>
            <Route index element={<Home />} />
            <Route path="catalogo" element={<Catalog />} />
            <Route path="produto/:id" element={<ProductPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="minha-conta" element={<CustomerProfile />} />
            <Route path="sobre" element={<About />} />
            <Route path="politicas" element={<Policies />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="contato" element={<Contact />} />
            <Route path="termos" element={<Terms />} />
            <Route path="privacidade" element={<Privacy />} />
          </Route>

          {/* Auth Route */}
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            {/* Outras rotas do admin: /admin/orders, /admin/customers */}
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;