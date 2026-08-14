import { useNavigate } from 'react-router-dom';
import { CheckoutStatusLayout } from '../components/CheckoutStatusLayout';

export function CheckoutFailure() {
  const navigate = useNavigate();

  return (
    <CheckoutStatusLayout
      eyebrow="Pagamento não concluído"
      title="Pagamento Recusado"
      description="O Mercado Pago não conseguiu aprovar esta tentativa. Seu pedido continua visível na sua conta enquanto a reserva estiver ativa."
      tone="error"
      note="Nenhuma nova tentativa é feita automaticamente. Confira o pedido antes de escolher outra forma de pagamento."
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-11 h-11">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      }
      actions={
        <>
        <button 
          onClick={() => navigate('/minha-conta')}
          className="min-h-12 bg-[#1A332B] px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#8A4825]"
        >
          Ver pedido e tentar novamente
        </button>
        <button 
          onClick={() => navigate('/catalogo')}
          className="min-h-12 border border-[#1A332B] px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[#1A332B] transition-colors hover:bg-[#1A332B]/5"
        >
          Voltar ao catálogo
        </button>
        </>
      }
    />
  );
}

export default CheckoutFailure;
