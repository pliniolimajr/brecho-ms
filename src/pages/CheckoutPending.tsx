import { useNavigate } from 'react-router-dom';
import { CheckoutStatusLayout } from '../components/CheckoutStatusLayout';

export function CheckoutPending() {
  const navigate = useNavigate();

  return (
    <CheckoutStatusLayout
      eyebrow="Confirmação em andamento"
      title="Pagamento Pendente"
      description="O Mercado Pago ainda está processando a transação. Sua peça permanece reservada durante o prazo informado no pedido."
      tone="warning"
      note="Não é necessário pagar novamente agora. O status será atualizado automaticamente assim que recebermos a confirmação."
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-11 h-11">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      actions={
        <button
          onClick={() => navigate('/minha-conta')}
          className="min-h-12 bg-[#1A332B] px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#8A4825]"
        >
          Acompanhar Pedido
        </button>
      }
    />
  );
}

export default CheckoutPending;
