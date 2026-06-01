
import { useStore } from '../store/useStore';
import Checkout from '../components/Checkout';
import { useNavigate } from 'react-router-dom';

export function CheckoutPage() {
  const { cart } = useStore();
  const navigate = useNavigate();
  return <Checkout items={cart} onBack={() => navigate('/')} />;
}
