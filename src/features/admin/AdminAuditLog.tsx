import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface AuditEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  actor_email: string;
  details: Record<string, unknown>;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  team_member_added: 'Membro adicionado', team_member_updated: 'Acesso atualizado',
  inventory_adjusted: 'Estoque ajustado', order_status_changed: 'Status do pedido alterado',
  bulk_order_status_changed: 'Pedidos alterados em lote', order_event_added: 'Evento adicionado ao pedido',
  order_tracking_updated: 'Rastreio atualizado', return_created: 'Devolução criada',
  return_status_changed: 'Devolução atualizada', cart_contacted: 'Cliente contatado',
  cart_closed: 'Carrinho encerrado', operational_alert_snoozed: 'Pendência adiada',
  operational_alert_restored: 'Pendência reativada',
};

export function AdminAuditLog() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageSize = 20;

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase.rpc('admin_list_audit', {
      p_page: page, p_page_size: pageSize, p_action: action || null, p_search: search.trim() || null,
      p_start_date: startDate || null, p_end_date: endDate || null,
    });
    if (queryError) setError(queryError.message || 'Não foi possível consultar a auditoria.');
    else {
      const result = data as unknown as { items?: AuditEntry[]; total?: number };
      setItems(result?.items || []);
      setTotal(Number(result?.total || 0));
    }
    setLoading(false);
  }, [action, endDate, page, search, startDate]);

  useEffect(() => { void loadAudit(); }, [loadAudit]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="border border-[#EAD8CC] bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl text-[#1A332B]">Auditoria administrativa</h3>
          <p className="mt-1 text-xs text-[#6B625C]">Histórico de alterações sensíveis realizadas pela equipe.</p>
        </div>
        <span className="text-xs font-semibold text-[#6B625C]">{total} registro(s)</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Responsável, pedido ou recurso" className="border border-gray-300 px-3 py-2 text-xs" />
        <select value={action} onChange={event => { setAction(event.target.value); setPage(1); }} className="border border-gray-300 bg-white px-3 py-2 text-xs">
          <option value="">Todas as ações</option>
          {Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input aria-label="Data inicial da auditoria" type="date" value={startDate} onChange={event => { setStartDate(event.target.value); setPage(1); }} className="border border-gray-300 px-3 py-2 text-xs" />
        <input aria-label="Data final da auditoria" type="date" value={endDate} onChange={event => { setEndDate(event.target.value); setPage(1); }} className="border border-gray-300 px-3 py-2 text-xs" />
      </div>

      {error ? <p className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p> : loading ? (
        <p className="mt-5 p-6 text-center text-sm text-gray-500">Carregando auditoria...</p>
      ) : items.length === 0 ? (
        <p className="mt-5 p-6 text-center text-sm text-gray-500">Nenhum registro encontrado.</p>
      ) : (
        <div className="mt-5 divide-y divide-gray-100">
          {items.map(item => (
            <article key={item.id} className="grid gap-2 py-3 text-xs md:grid-cols-[1fr_1fr_auto] md:items-center">
              <div><strong className="text-[#1A332B]">{actionLabels[item.action] || item.action}</strong><p className="mt-1 text-gray-500">{item.resource_type}{item.resource_id ? ` · ${item.resource_id}` : ''}</p></div>
              <div><span className="font-medium text-[#1A332B]">{item.actor_email}</span><p className="mt-1 max-w-xl truncate text-gray-500" title={JSON.stringify(item.details)}>{Object.keys(item.details || {}).length ? JSON.stringify(item.details) : 'Sem detalhes adicionais'}</p></div>
              <time className="text-gray-500">{new Date(item.created_at).toLocaleString('pt-BR')}</time>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && <nav className="mt-5 flex items-center justify-end gap-3 text-xs"><button disabled={page === 1} onClick={() => setPage(value => value - 1)} className="border px-3 py-2 disabled:opacity-30">Anterior</button><span>{page} de {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage(value => value + 1)} className="border px-3 py-2 disabled:opacity-30">Próxima</button></nav>}
    </section>
  );
}
