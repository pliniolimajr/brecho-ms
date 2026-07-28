import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface ProfileOrdersProps {
  user: User | null;
}

export function ProfileOrders({ user }: ProfileOrdersProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(price, products(name, image_url, size))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar pedidos:', err.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  return (
    <div className="bg-white p-8 md:p-10 rounded border border-[#C06A35]/20 animate-fade-in-up min-h-[400px]">
      <h2 className="text-xl font-serif text-[#1A332B] mb-8 italic border-b border-[#C06A35]/20 pb-4">Meus pedidos</h2>
      
      {loadingOrders ? (
        <div className="text-center text-sm text-gray-500 py-10">Buscando pedidos...</div>
      ) : orders.length === 0 ? (
        <div className="text-center text-sm text-gray-500 py-10 border border-dashed border-gray-200 rounded p-6">
          <p className="text-[#423226] mb-4">Você ainda não realizou nenhum pedido conosco.</p>
          <a href="/catalogo" className="bg-[#1A332B] text-[#FDF6F0] px-6 py-2 uppercase tracking-widest text-xs hover:bg-[#433E38] inline-block">
            Começar a Comprar
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded shadow-sm border border-[#C06A35]/20 overflow-hidden">
              {/* Order Header */}
              <div 
                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                className="p-6 flex justify-between items-center flex-wrap gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div>
                  <span className="block text-xs text-[#A8A29E] uppercase tracking-widest mb-1">
                    Pedido em {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="font-mono text-sm text-[#423226]">{order.id.split('-')[0].toUpperCase()}</span>
                </div>
                <div>
                  <span className="block text-xs text-[#A8A29E] uppercase tracking-widest mb-1">Status</span>
                  <span className="text-sm font-medium text-[#1A332B]">
                    {order.status === 'pending' && 'Aguardando Pagamento'}
                    {order.status === 'paid' && 'Preparando Envio'}
                    {order.status === 'shipped' && 'Enviado'}
                    {order.status === 'delivered' && 'Entregue'}
                    {order.status === 'cancelled' && 'Cancelado'}
                  </span>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <span className="block text-xs text-[#A8A29E] uppercase tracking-widest mb-1">Total</span>
                    <span className="font-serif text-lg text-[#1A332B]">R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>

              {/* Order Items (Expanded) */}
              {expandedOrderId === order.id && (
                <div className="border-t border-[#C06A35]/10 bg-gray-50 p-6 space-y-4">
                  <h4 className="text-xs uppercase tracking-widest text-[#423226] font-bold mb-4">Produtos neste pedido</h4>
                  {order.order_items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-4 border-b border-[#C06A35]/10 pb-4 last:border-0 last:pb-0">
                      <img src={item.products?.image_url} alt={item.products?.name} className="w-16 h-16 object-cover rounded" />
                      <div className="flex-1">
                        <p className="font-serif text-[#1A332B]">{item.products?.name}</p>
                        <p className="text-xs text-[#A8A29E]">Tamanho: {item.products?.size}</p>
                      </div>
                      <div className="font-medium text-[#1A332B]">
                        R$ {Number(item.price).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 mt-4 border-t border-[#C06A35]/10 text-xs text-[#423226]">
                    Forma de Pagamento: <strong className="uppercase">
                      {order.payment_method === 'pix' ? 'PIX' : 
                        order.payment_method === 'credit_card' ? 'Cartão de Crédito' : 
                        order.payment_method === 'boleto' ? 'Boleto' : 
                        order.payment_method === 'mercado_pago' ? 'Mercado Pago' : 
                        order.payment_method}
                    </strong>
                    {order.shipping_address ? (
                      <span className="block mt-1">
                        Envio via: <strong>{order.shipping_address.shippingService || 'Correios'}</strong><br/>
                        Endereço: {order.shipping_address.street}, {order.shipping_address.number} - {order.shipping_address.city}/{order.shipping_address.state} (CEP: {order.shipping_address.postalCode})
                      </span>
                    ) : (
                      <span className="block mt-1">Envio pelos Correios.</span>
                    )}

                    {order.tracking_code && (
                      <div className="mt-3 p-3 bg-[#1A332B]/5 rounded border border-[#1A332B]/10 max-w-md">
                        <span className="text-[#1A332B] font-bold block mb-1">Rastreamento do Pedido:</span>
                        Código: <strong className="font-mono text-sm bg-white px-2 py-0.5 rounded border border-gray-200">{order.tracking_code}</strong>
                        <a 
                          href={`https://linkrastreio.com.br/?codigo=${order.tracking_code}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-3 text-xs text-[#C06A35] underline font-bold"
                        >
                          Acompanhar Envio ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
