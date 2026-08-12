
import { useStore } from '../store/useStore';
import Checkout from '../components/Checkout';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';
import { beginCheckoutJourney, trackCheckoutAbandonment } from '../services/analytics';

export function CheckoutPage() {
  const { cart } = useStore();
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session && cart.length > 0) {
      beginCheckoutJourney({ items_count: cart.length, value: cart.reduce((sum, item) => sum + item.price, 0) });
    }
  }, [cart, session]);

  useEffect(() => {
    const handlePageExit = () => { trackCheckoutAbandonment(); };
    window.addEventListener('pagehide', handlePageExit);
    return () => window.removeEventListener('pagehide', handlePageExit);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6F0] flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-[#C06A35] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login?redirect=/checkout" replace />;
  }

  return <Checkout items={cart} onBack={() => { trackCheckoutAbandonment(); navigate('/'); }} />;
}
