import { useMemo, useState } from 'react';

interface AdminAbandonedCartsProps {
  abandonedCarts: any[];
  loadingAbandoned: boolean;
}

export function AdminAbandonedCarts({ abandonedCarts, loadingAbandoned }: AdminAbandonedCartsProps) {
  const [abandonedSearch, setAbandonedSearch] = useState('');

  const filteredAbandonedCarts = useMemo(() => {
    return abandonedCarts.filter(c => {
      const s = abandonedSearch.toLowerCase();
      const name = `${c.customer_info?.firstName || ''} ${c.customer_info?.lastName || ''}`.trim();
      const email = c.customer_info?.email || '';
      const phone = c.customer_info?.phone || '';
      return (
        name.toLowerCase().includes(s) ||
        email.toLowerCase().includes(s) ||
        phone.toLowerCase().includes(s)
      );
    });
  }, [abandonedCarts, abandonedSearch]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded shadow-sm border border-[#C06A35]/20">
        <div>
          <h2 className="text-xl font-serif text-[#1A332B]">Carrinhos Abandonados</h2>
          <p className="text-xs text-gray-500">Recupere vendas ativas enviando lembretes diretos para os clientes</p>
        </div>
      </div>

      <div className="bg-white rounded shadow-sm border border-[#C06A35]/20 overflow-hidden">
        <div className="p-4 border-b border-[#C06A35]/20 bg-[#FDF6F0]/50">
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={abandonedSearch}
            onChange={e => setAbandonedSearch(e.target.value)}
            className="w-full md:w-96 pl-4 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#C06A35]"
          />
        </div>

        {loadingAbandoned ? (
          <div className="p-8 text-center text-gray-500">Carregando carrinhos abandonados...</div>
        ) : filteredAbandonedCarts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum carrinho abandonado registrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FDF6F0] border-b border-[#C06A35]/20 text-[#1A332B] font-medium text-xs uppercase tracking-wider">
                  <th className="p-4">Cliente / Contato</th>
                  <th className="p-4">Itens Abandondos</th>
                  <th className="p-4 text-right">Valor Total</th>
                  <th className="p-4 text-center">Última Atualização</th>
                  <th className="p-4 text-center">Ações de Recuperação</th>
                </tr>
              </thead>
              <tbody>
                {filteredAbandonedCarts.map(cart => {
                  const info = cart.customer_info || {};
                  const clientName = `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Visitante Sem Nome';
                  const items = cart.cart_items || [];
                  const total = items.reduce((sum: number, i: any) => sum + (Number(i.price) || 0), 0);
                  const phoneClean = info.phone ? info.phone.replace(/\D/g, '') : '';

                  const whatsappMessage = encodeURIComponent(
                    `Olá ${info.firstName || ''}! Notei que você deixou alguns itens incríveis no seu carrinho na Palm Co. Precisa de alguma ajuda para finalizar seu pedido? 😊`
                  );

                  return (
                    <tr key={cart.id} className="border-b border-[#C06A35]/10 hover:bg-[#FDF6F0]/50 transition-colors">
                      <td className="p-4">
                        <span className="font-serif font-bold text-[#1A332B] block text-sm">{clientName}</span>
                        <div className="text-xs text-gray-500">{info.email || 'Sem e-mail'}</div>
                        <div className="text-xs text-gray-500">{info.phone || 'Sem telefone'}</div>
                      </td>
                      <td className="p-4 text-xs text-[#423226]">
                        {items.map((item: any, idx: number) => (
                          <div key={idx} className="line-clamp-1">
                            • {item.name || 'Produto'} ({item.size || 'U'}) - R$ {Number(item.price).toFixed(2).replace('.', ',')}
                          </div>
                        ))}
                      </td>
                      <td className="p-4 text-right font-bold text-sm text-[#C06A35]">
                        R$ {total.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="p-4 text-center text-xs text-gray-500">
                        {new Date(cart.updated_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-4 text-center">
                        {phoneClean ? (
                          <a
                            href={`https://wa.me/55${phoneClean}?text=${whatsappMessage}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-emerald-800 transition-colors"
                          >
                            Recuperar via WhatsApp
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Sem telefone</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
