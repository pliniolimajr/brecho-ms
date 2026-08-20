import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface OverviewData {
  checked_at: string;
  orders: { pending_payment: number; to_process: number; ready_to_ship: number; shipped: number };
  sales: { last_7_days: number; paid_last_7_days: number };
  inventory: { available: number; out_of_stock: number; archived: number };
  alerts: {
    email_failures: number; shipping_failures: number; stale_payments: number;
    chargebacks: number; refund_failures: number; pending_returns: number;
  };
}

interface AdminOverviewProps {
  onNavigate: (section: 'inventory' | 'orders' | 'health' | 'metrics') => void;
}

export function AdminOverview({ onNavigate }: AdminOverviewProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: result, error: queryError } = await supabase.rpc('admin_overview');
    if (queryError) setError('Não foi possível carregar a visão geral. Confirme se a migration 35 foi aplicada.');
    else setData(result as unknown as OverviewData);
    setLoading(false);
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const alertCount = useMemo(() => data
    ? data.alerts.email_failures + data.alerts.shipping_failures + data.alerts.stale_payments
      + data.alerts.chargebacks + data.alerts.refund_failures + data.alerts.pending_returns
    : 0, [data]);

  if (loading && !data) return <div className="border border-[#EAD8CC] bg-white p-10 text-center text-sm">Montando seu resumo operacional...</div>;
  if (error) return (
    <div className="border border-red-200 bg-red-50 p-6 text-red-900">
      <p>{error}</p>
      <button type="button" onClick={() => void loadOverview()} className="mt-4 font-semibold underline">Tentar novamente</button>
    </div>
  );
  if (!data) return null;

  const tasks = [
    { label: 'Aguardando pagamento', value: data.orders.pending_payment, action: 'Ver pedidos', section: 'orders' as const },
    { label: 'Para separar', value: data.orders.to_process, action: 'Preparar pedidos', section: 'orders' as const },
    { label: 'Prontos para postagem', value: data.orders.ready_to_ship, action: 'Abrir expedição', section: 'orders' as const },
    { label: 'Produtos sem estoque', value: data.inventory.out_of_stock, action: 'Revisar estoque', section: 'inventory' as const },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border border-[#EAD8CC] bg-white p-6 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C06A35]">Hoje na Palm CO.</p>
          <h2 className="mt-2 font-serif text-3xl text-[#1A332B]">O que precisa da sua atenção</h2>
          <p className="mt-1 text-sm text-[#6B625C]">Prioridades de venda, separação e operação em um só lugar.</p>
        </div>
        <button type="button" onClick={() => void loadOverview()} disabled={loading} className="border border-[#1A332B] px-5 py-3 text-xs font-semibold uppercase tracking-wider disabled:opacity-50">
          {loading ? 'Atualizando...' : 'Atualizar resumo'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tasks.map(task => (
          <article key={task.label} className="flex min-h-40 flex-col justify-between border border-[#EAD8CC] bg-white p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B625C]">{task.label}</p>
              <p className={`mt-3 font-serif text-4xl ${task.value ? 'text-[#9A4D24]' : 'text-[#1A332B]'}`}>{task.value}</p>
            </div>
            <button type="button" onClick={() => onNavigate(task.section)} className="mt-5 text-left text-xs font-bold uppercase tracking-wider text-[#1A332B] underline underline-offset-4">
              {task.action} →
            </button>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="border border-[#EAD8CC] bg-[#1A332B] p-6 text-[#FDF6F0] lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Desempenho dos últimos 7 dias</p>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-serif text-4xl">R$ {Number(data.sales.last_7_days).toFixed(2).replace('.', ',')}</p>
              <p className="mt-1 text-sm opacity-70">Receita confirmada</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-3xl">{data.sales.paid_last_7_days}</p>
              <p className="text-sm opacity-70">pedidos pagos</p>
            </div>
          </div>
          <button type="button" onClick={() => onNavigate('metrics')} className="mt-6 text-xs font-bold uppercase tracking-wider underline underline-offset-4">Abrir relatórios →</button>
        </article>

        <article className={`border p-6 ${alertCount ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <p className="text-xs font-semibold uppercase tracking-wider">Saúde operacional</p>
          <p className="my-3 font-serif text-4xl">{alertCount}</p>
          <p className="text-sm">{alertCount ? 'alertas precisam ser verificados' : 'nenhum alerta no momento'}</p>
          <button type="button" onClick={() => onNavigate('health')} className="mt-6 text-xs font-bold uppercase tracking-wider underline underline-offset-4">Ver operações →</button>
        </article>
      </div>

      <div className="grid gap-3 border border-[#EAD8CC] bg-white p-5 text-sm sm:grid-cols-3">
        <p><strong>{data.inventory.available}</strong> produtos disponíveis</p>
        <p><strong>{data.orders.shipped}</strong> pedidos em transporte</p>
        <p><strong>{data.inventory.archived}</strong> produtos arquivados</p>
      </div>
    </section>
  );
}
