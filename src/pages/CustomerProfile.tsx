import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabaseClient';
import { Navigate, useNavigate } from 'react-router-dom';

export function CustomerProfile() {
  const { session, user, loading, supabase: sb } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(price, products(name, image_url, size))')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
      
    if (data) {
      setOrders(data);
    }
    setLoadingOrders(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#FDF6F0] flex items-center justify-center">Carregando...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await sb.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#FDF6F0] pt-24 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex justify-between items-end border-b border-[#C06A35]/30 pb-4">
          <div>
            <h1 className="text-4xl font-serif text-[#1A332B] mb-2">Minha Conta</h1>
            <p className="text-[#423226]">Olá, {user?.email}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm font-medium uppercase tracking-widest text-[#C06A35] hover:text-[#1A332B] underline underline-offset-4"
          >
            Sair
          </button>
        </header>

        <section>
          <h2 className="text-2xl font-serif text-[#1A332B] mb-6">Meus Pedidos</h2>
          
          {loadingOrders ? (
            <p className="text-[#A8A29E]">Buscando pedidos...</p>
          ) : orders.length === 0 ? (
            <div className="bg-white p-8 rounded shadow-sm border border-[#C06A35]/20 text-center">
              <p className="text-[#423226] mb-4">Você ainda não fez nenhum pedido no Brechó MS.</p>
              <button 
                onClick={() => navigate('/catalogo')}
                className="bg-[#1A332B] text-[#FDF6F0] px-6 py-2 uppercase tracking-widest text-sm hover:bg-[#433E38]"
              >
                Começar a Garimpar
              </button>
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
                        {order.status === 'paid' && 'Pronto para Retirada'}
                        {order.status === 'shipped' && 'Enviado'}
                        {order.status === 'delivered' && 'Entregue / Retirado'}
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
                      <h4 className="text-xs uppercase tracking-widest text-[#423226] font-bold mb-4">Peças neste pedido</h4>
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
                        Forma de Pagamento: <strong className="uppercase">{order.payment_method === 'pix' ? 'PIX' : 'Cartão de Crédito'}</strong><br/>
                        Retirada presencial combinada.
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
