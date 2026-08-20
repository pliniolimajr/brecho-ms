import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface OperationalHealth {
  checked_at: string;
  notifications: { failed: number; stale: number };
  payments: {
    expired_pending: number; processed_last_24h: number; chargebacks: number;
    partial_refunds: number; failed_refunds: number; stuck_refunds: number;
  };
  returns: { requested: number; approved_waiting: number; received_waiting: number };
  shipping: { failed: number; stuck: number };
}

interface FinancialRiskCase {
  type: 'chargeback' | 'refund_failed' | 'refund_stuck';
  order_id: string;
  amount: number;
  title: string;
  detail: string;
  occurred_at: string;
}

export function AdminOperationalHealth() {
  const [health, setHealth] = useState<OperationalHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [riskCases, setRiskCases] = useState<FinancialRiskCase[]>([]);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setError('');
    const [healthResult, risksResult] = await Promise.all([
      supabase.rpc('admin_operational_health'),
      supabase.rpc('admin_financial_risk_cases'),
    ]);
    if (healthResult.error || risksResult.error) setError('Não foi possível consultar a saúde operacional. Confirme se a migration 39 foi aplicada.');
    else {
      setHealth(healthResult.data as unknown as OperationalHealth);
      setRiskCases((risksResult.data || []) as unknown as FinancialRiskCase[]);
    }
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
    + health.payments.expired_pending + health.shipping.failed + health.shipping.stuck
    + health.payments.chargebacks + health.payments.failed_refunds + health.payments.stuck_refunds
    + health.returns.requested + health.returns.approved_waiting + health.returns.received_waiting;

  const cards = [
    { label: 'E-mails com falha', value: health.notifications.failed, detail: `${health.notifications.stale} aguardando há mais de 15 min` },
    { label: 'Pedidos vencidos ainda pendentes', value: health.payments.expired_pending, detail: `${health.payments.processed_last_24h} pagamentos processados nas últimas 24h` },
    { label: 'Etiquetas com falha', value: health.shipping.failed, detail: `${health.shipping.stuck} emissões travadas` },
    { label: 'Risco financeiro', value: health.payments.chargebacks + health.payments.failed_refunds + health.payments.stuck_refunds, detail: `${health.payments.chargebacks} contestações · ${health.payments.partial_refunds} reembolsos parciais` },
    { label: 'Devoluções em andamento', value: health.returns.requested + health.returns.approved_waiting + health.returns.received_waiting, detail: `${health.returns.requested} novas · ${health.returns.approved_waiting} aguardando recebimento` },
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map(card => (
          <article key={card.label} className="rounded border border-[#EAD8CC] bg-white p-6">
            <p className="text-sm uppercase tracking-wide text-[#6B625C]">{card.label}</p>
            <p className={`my-3 text-4xl font-semibold ${card.value ? 'text-red-700' : 'text-[#1A332B]'}`}>{card.value}</p>
            <p className="text-sm text-[#6B625C]">{card.detail}</p>
          </article>
        ))}
      </div>

      <div className="border border-[#EAD8CC] bg-white p-6">
        <div className="mb-4">
          <h3 className="font-serif text-xl text-[#1A332B]">Casos financeiros prioritários</h3>
          <p className="text-sm text-[#6B625C]">Contestações e reembolsos que exigem verificação manual.</p>
        </div>
        {riskCases.length === 0 ? (
          <p className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Nenhum caso financeiro crítico aberto.</p>
        ) : (
          <div className="space-y-2">
            {riskCases.map((risk, index) => (
              <article key={`${risk.type}-${risk.order_id}-${index}`} className="flex flex-col justify-between gap-3 border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-bold text-red-900">{risk.title} · Pedido #{risk.order_id.split('-')[0].toUpperCase()}</p>
                  <p className="mt-1 text-xs text-red-800">{risk.detail}</p>
                  <p className="mt-1 text-[10px] text-red-700">R$ {Number(risk.amount).toFixed(2).replace('.', ',')} · {new Date(risk.occurred_at).toLocaleString('pt-BR')}</p>
                </div>
                <a href={`/admin?section=orders&order=${risk.order_id}`} className="text-xs font-bold uppercase tracking-wider text-red-900 underline underline-offset-4">Abrir pedido →</a>
              </article>
            ))}
          </div>
        )}
      </div>

      <p className="text-right text-xs text-[#6B625C]">Verificado em {new Date(health.checked_at).toLocaleString('pt-BR')}</p>
    </section>
  );
}
