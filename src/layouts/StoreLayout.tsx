import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
// import Assistant from '../components/Assistant';
import { useStore } from '../store/useStore';
import { useEffect } from 'react';

export function StoreLayout() {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, fetchProducts } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    if (targetId === 'products') {
      navigate('/catalogo');
      return;
    }
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => scrollToSection(targetId), 100);
    } else {
      scrollToSection(targetId);
    }
  };

  const scrollToSection = (targetId: string) => {
    if (!targetId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(targetId);
    if (element) {
      const headerOffset = 85;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF6F0] font-sans text-[#1A332B] selection:bg-[#C06A35] selection:text-[#1A332B]">
      <Navbar 
        onNavClick={handleNavClick} 
        cartCount={cart.length}
        onOpenCart={() => setIsCartOpen(true)}
      />
      <main className="flex-grow pt-0">
        <Outlet />
      </main>
      <Footer onLinkClick={handleNavClick} />
      {/* <Assistant /> Stand-by */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onRemoveItem={(id) => removeFromCart(id)}
        onCheckout={() => {
            setIsCartOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            navigate('/checkout');
        }}
      />
    </div>
  );
}