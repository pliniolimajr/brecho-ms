import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('payment_id');
  const orderId = searchParams.get('external_reference');
  const [loading, setLoading] = useState(true);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);

  useEffect(() => {
    async function updateAndFetchOrder() {
      if (orderId) {
        // O status é definido exclusivamente pelo webhook do Mercado Pago.
        // O navegador apenas consulta os dados para montar o resumo.
        const { data, error } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('id', orderId)
          .single();

        if (!error && data) {
          setOrderTotal(data.total_amount);
        }
      }
      setLoading(false);
    }
    updateAndFetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6F0] flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-[#C06A35] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 bg-[#FDF6F0] flex flex-col items-center justify-center text-center animate-fade-in-up">
      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-green-800">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-4xl font-serif text-[#1A332B] mb-4">Pagamento Aprovado!</h1>
      <p className="text-[#423226] max-w-md mb-8">
        Obrigado pela sua compra! O seu pagamento foi confirmado com sucesso e já estamos preparando o seu envio.
      </p>

      {orderId && (
        <div className="bg-white/50 border border-[#C06A35]/20 p-6 rounded max-w-sm w-full mb-8 text-left space-y-2">
          <div className="flex justify-between text-xs text-[#A8A29E] uppercase tracking-wider font-bold">
            <span>Pedido</span>
            <span>Valor</span>
          </div>
          <div className="flex justify-between text-sm font-medium text-[#1A332B]">
            <span className="truncate max-w-[200px]">{orderId}</span>
            <span>R$ {orderTotal?.toFixed(2).replace('.', ',')}</span>
          </div>
          {paymentId && (
            <p className="text-[10px] text-[#A8A29E] pt-2 border-t border-[#C06A35]/10">
              ID da Transação: {paymentId}
            </p>
          )}
        </div>
      )}

      <button 
        onClick={() => navigate('/minha-conta')} 
        className="bg-[#1A332B] text-white px-8 py-3 rounded uppercase tracking-widest text-sm hover:bg-[#433E38] transition-colors"
      >
        Ver Meus Pedidos
      </button>
    </div>
  );
}

export default CheckoutSuccess;
