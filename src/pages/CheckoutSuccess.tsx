import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { completeCheckoutJourney, trackEvent } from '../services/analytics';
import { captureOperationalError } from '../services/monitoring';
import { CheckoutStatusLayout } from '../components/CheckoutStatusLayout';

export function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('payment_id');
  const orderId = searchParams.get('external_reference');
  const [loading, setLoading] = useState(true);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);

  useEffect(() => {
    completeCheckoutJourney();
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
          const eventKey = `palmco_purchase_tracked_${orderId}`;
          if (!sessionStorage.getItem(eventKey)) {
            trackEvent('purchase_confirmed', { order_id: orderId, value: Number(data.total_amount) });
            sessionStorage.setItem(eventKey, 'true');
          }
        } else if (error) {
          void captureOperationalError(error, { stage: 'checkout_success', order_id: orderId });
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
    <CheckoutStatusLayout
      eyebrow="Compra confirmada"
      title="Pagamento Aprovado!"
      description="Sua compra foi confirmada. A Palm CO. agora confere a peça com cuidado e prepara o envio para o endereço informado."
      tone="success"
      note="Você receberá as próximas atualizações por e-mail e também poderá acompanhar o pedido pela sua conta."
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-11 w-11">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      actions={
        <button
          onClick={() => navigate('/minha-conta')}
          className="min-h-12 bg-[#1A332B] px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#8A4825]"
        >
          Ver Meus Pedidos
        </button>
      }
    >
      {orderId && (
        <div className="mt-8 w-full border-y border-[#C06A35]/20 py-5 text-left space-y-2">
          <div className="flex justify-between text-xs text-[#6B625C] uppercase tracking-wider font-bold">
            <span>Pedido</span>
            <span>Valor</span>
          </div>
          <div className="flex justify-between gap-4 text-sm font-medium text-[#1A332B]">
            <span className="truncate">{orderId.slice(0, 8).toUpperCase()}</span>
            <span>{orderTotal === null ? 'Confirmando valor' : `R$ ${orderTotal.toFixed(2).replace('.', ',')}`}</span>
          </div>
          {paymentId && (
            <p className="break-all border-t border-[#C06A35]/10 pt-2 text-[10px] text-[#6B625C]">
              ID da Transação: {paymentId}
            </p>
          )}
        </div>
      )}
    </CheckoutStatusLayout>
  );
}

export default CheckoutSuccess;
