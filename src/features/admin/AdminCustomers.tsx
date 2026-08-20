import { useMemo, useState } from 'react';
import { TableSkeleton } from '../../components/LoadingStates';

interface AdminCustomersProps {
  crmCustomers: any[];
  loadingCRM: boolean;
}

export function AdminCustomers({ crmCustomers, loadingCRM }: AdminCustomersProps) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const filteredCustomers = useMemo(() => {
    return crmCustomers.filter(c => {
      const s = customerSearch.toLowerCase();
      return (segmentFilter === 'all' || c.segment === segmentFilter) && (
        c.name.toLowerCase().includes(s) ||
        (c.email || '').toLowerCase().includes(s) ||
        c.phone.toLowerCase().includes(s) ||
        (c.cpf && c.cpf.toLowerCase().includes(s))
      );
    });
  }, [crmCustomers, customerSearch, segmentFilter]);

  const segmentLabels: Record<string, string> = {
    vip: 'VIP', recurring: 'Recorrente', new_customer: 'Novo cliente', inactive: 'Inativo', lead: 'Lead',
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded shadow-sm border border-[#C06A35]/20">
        <div>
          <h2 className="text-xl font-serif text-[#1A332B]">CRM & Base de Clientes</h2>
          <p className="text-xs text-gray-500">Histórico de compras, cadastros e hábitos de consumo dos clientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List Column */}
        <div className="lg:col-span-2 bg-white rounded shadow-sm border border-[#C06A35]/20 overflow-hidden">
          <div className="flex flex-col gap-3 p-4 border-b border-[#C06A35]/20 bg-[#FDF6F0]/50 sm:flex-row">
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, telefone ou CPF..."
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              className="min-w-0 flex-1 pl-4 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#C06A35]"
            />
            <select value={segmentFilter} onChange={event => setSegmentFilter(event.target.value)} className="border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="all">Todos os segmentos</option>
              {Object.entries(segmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          {loadingCRM ? (
            <TableSkeleton rows={6} columns={5} label="Carregando clientes" />
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum cliente encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FDF6F0] border-b border-[#C06A35]/20 text-[#1A332B] font-medium text-xs uppercase tracking-wider">
                    <th className="p-3">Nome</th>
                    <th className="p-3">Contato</th>
                    <th className="p-3 text-center">Pedidos</th>
                    <th className="p-3 text-right">Total Gasto</th>
                    <th className="p-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(customer => (
                    <tr 
                      key={customer.id} 
                      className={`border-b border-[#C06A35]/10 hover:bg-[#FDF6F0]/50 transition-colors ${
                        selectedCustomer?.id === customer.id ? 'bg-[#FDF6F0]' : ''
                      }`}
                    >
                      <td className="p-3">
                        <span className="font-serif font-bold text-[#1A332B] block text-sm">{customer.name}</span>
                        <span className="text-[10px] uppercase font-semibold text-gray-400">
                          {customer.type === 'customer' ? 'Cadastrado' : 'Visitante'} · {segmentLabels[customer.segment] || customer.segment}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-[#423226]">
                        <div>{customer.phone}</div>
                        {customer.email && <div className="text-gray-400">{customer.email}</div>}
                        {customer.cpf && customer.cpf !== 'N/A' && <div className="text-gray-400">CPF: {customer.cpf}</div>}
                      </td>
                      <td className="p-3 text-center font-bold text-sm text-[#1A332B]">{customer.ordersCount}</td>
                      <td className="p-3 text-right font-bold text-sm text-[#C06A35]">
                        R$ {Number(customer.totalSpent).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="text-xs bg-[#1A332B] text-white px-3 py-1 rounded hover:bg-[#433E38] transition-colors"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Customer Detail Drawer / Card */}
        <div className="bg-white rounded shadow-sm border border-[#C06A35]/20 p-6 h-fit">
          {selectedCustomer ? (
            <div className="space-y-6">
              <div className="border-b border-[#C06A35]/20 pb-4">
                <span className="text-[10px] uppercase font-semibold tracking-widest text-[#C06A35] block mb-1">
                  Perfil de Cliente
                </span>
                <h3 className="text-xl font-serif text-[#1A332B]">{selectedCustomer.name}</h3>
                <span className="text-xs text-gray-500 block mt-1">
                  {selectedCustomer.type === 'customer' ? 'Usuário registrado' : 'Visitante'} · {segmentLabels[selectedCustomer.segment] || selectedCustomer.segment}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                {selectedCustomer.email && (
                  <div><span className="text-xs font-bold uppercase text-gray-400 block">E-mail</span><span className="font-medium text-[#1A332B]">{selectedCustomer.email}</span></div>
                )}
                <div>
                  <span className="text-xs font-bold uppercase text-gray-400 block">Telefone / WhatsApp</span>
                  <span className="font-medium text-[#1A332B]">{selectedCustomer.phone}</span>
                </div>

                {selectedCustomer.cpf && selectedCustomer.cpf !== 'N/A' && (
                  <div>
                    <span className="text-xs font-bold uppercase text-gray-400 block">CPF</span>
                    <span className="font-medium text-[#1A332B]">{selectedCustomer.cpf}</span>
                  </div>
                )}

                {selectedCustomer.birthDate && selectedCustomer.birthDate !== 'N/A' && (
                  <div>
                    <span className="text-xs font-bold uppercase text-gray-400 block">Data de Nascimento</span>
                    <span className="font-medium text-[#1A332B]">{selectedCustomer.birthDate}</span>
                  </div>
                )}

                <div>
                  <span className="text-xs font-bold uppercase text-gray-400 block">Total de Pedidos Realizados</span>
                  <span className="font-bold text-[#1A332B] text-lg">{selectedCustomer.ordersCount}</span>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase text-gray-400 block">Valor Acumulado de Compras</span>
                  <span className="font-bold text-[#C06A35] text-xl">
                    R$ {Number(selectedCustomer.totalSpent).toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase text-gray-400 block">Ticket médio</span>
                  <span className="font-medium text-[#1A332B]">R$ {Number(selectedCustomer.averageTicket).toFixed(2).replace('.', ',')}</span>
                </div>

                {selectedCustomer.lastPurchaseDate && (
                  <div>
                    <span className="text-xs font-bold uppercase text-gray-400 block">Última Compra em</span>
                    <span className="font-medium text-gray-700">
                      {new Date(selectedCustomer.lastPurchaseDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>

              {selectedCustomer.phone && selectedCustomer.phone !== 'N/A' && (
                <div className="pt-4 border-t border-gray-100">
                  <a
                    href={`https://wa.me/55${selectedCustomer.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex justify-center items-center gap-2 bg-emerald-700 text-white font-medium text-xs uppercase tracking-wider py-2.5 rounded hover:bg-emerald-800 transition-colors"
                  >
                    Falar no WhatsApp
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <p className="text-sm font-medium">Nenhum cliente selecionado.</p>
              <p className="text-xs">Clique em "Ver Detalhes" na tabela ao lado para visualizar os dados completos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
