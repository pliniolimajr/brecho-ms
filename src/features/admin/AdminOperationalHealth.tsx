import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface OperationalHealth {
  checked_at: string;
  notifications: { failed: number; stale: number };
  payments: { expired_pending: number; processed_last_24h: number };
  shipping: { failed: number; stuck: number };
}

export function AdminOperationalHealth() {
  const [health, setHealth] = useState<OperationalHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase.rpc('admin_operational_health');
    if (queryError) setError('Não foi possível consultar a saúde operacional. Confirme se a migration 30 foi aplicada.');
    else setHealth(data as unknown as OperationalHealth);
    setLoading(false);
  }, []);

  useEffect(() => { void loadHealth(); }, [loadHealth]);

  if (loading && !health) return <div className="p-8 text-center">Verificando operações...</div>;

  if (error) return (
    <div className="rounded border border-red-200 bg-red-50 p-6 text-red-900">
      <p>{error}</p>
      <button type="button" onClick={() => void loadHealth()} className="mt-4 font-semibold underline">Tentar novamente</button>
    </div>
  );

  if (!health) return null;
  const alertCount = health.notifications.failed + health.notifications.stale
    + health.payments.expired_pending + health.shipping.failed + health.shipping.stuck;

  const cards = [
    { label: 'E-mails com falha', value: health.notifications.failed, detail: `${health.notifications.stale} aguardando há mais de 15 min` },
    { label: 'Pedidos vencidos ainda pendentes', value: health.payments.expired_pending, detail: `${health.payments.processed_last_24h} pagamentos processados nas últimas 24h` },
    { label: 'Etiquetas com falha', value: health.shipping.failed, detail: `${health.shipping.stuck} emissões travadas` },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded border border-[#EAD8CC] bg-white p-6">
        <div>
          <h2 className="font-serif text-2xl text-[#1A332B]">Saúde operacional</h2>
          <p className="text-sm text-[#6B625C]">Alertas internos, sem exibir dados pessoais dos clientes.</p>
        </div>
        <button type="button" onClick={() => void loadHealth()} disabled={loading} className="border border-[#1A332B] px-5 py-3 text-sm font-semibold uppercase tracking-wider disabled:opacity-50">
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <div className={`rounded border p-4 ${alertCount ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
        {alertCount ? `${alertCount} item(ns) precisam de atenção.` : 'Nenhum alerta operacional no momento.'}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(card => (
          <article key={card.label} className="rounded border border-[#EAD8CC] bg-white p-6">
            <p className="text-sm uppercase tracking-wide text-[#6B625C]">{card.label}</p>
            <p className={`my-3 text-4xl font-semibold ${card.value ? 'text-red-700' : 'text-[#1A332B]'}`}>{card.value}</p>
            <p className="text-sm text-[#6B625C]">{card.detail}</p>
          </article>
        ))}
      </div>

      <p className="text-right text-xs text-[#6B625C]">Verificado em {new Date(health.checked_at).toLocaleString('pt-BR')}</p>
    </section>
  );
}
