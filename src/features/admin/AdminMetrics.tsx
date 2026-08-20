import React, { useCallback, useEffect, useState } from 'react';
import { TableSkeleton } from '../../components/LoadingStates';
import { supabase } from '../../services/supabaseClient';

interface AdminMetricsProps {
  coupons: any[];
  loadingCoupons: boolean;
  fetchCoupons: () => Promise<void>;
  handleCreateCoupon: (e: React.FormEvent) => Promise<void>;
  handleToggleCoupon: (id: string, currentStatus: boolean) => Promise<void>;
  handleDeleteCoupon: (id: string) => Promise<void>;
  newCoupon: {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minPurchaseAmount: number;
  };
  setNewCoupon: React.Dispatch<React.SetStateAction<{
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minPurchaseAmount: number;
  }>>;
  showNewCouponForm: boolean;
  setShowNewCouponForm: (b: boolean) => void;
}

export function AdminMetrics({
  coupons,
  loadingCoupons,
  handleCreateCoupon,
  handleToggleCoupon,
  handleDeleteCoupon,
  newCoupon,
  setNewCoupon,
  showNewCouponForm,
  setShowNewCouponForm
}: AdminMetricsProps) {
  const [metricsPeriod, setMetricsPeriod] = useState<'all' | '30days' | '7days' | 'month'>('all');
  const [report, setReport] = useState<any | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [reportError, setReportError] = useState('');

  const loadReport = useCallback(async () => {
    setLoadingReport(true);
    setReportError('');
    const now = new Date();
    const start = new Date(now);
    if (metricsPeriod === '7days') start.setDate(now.getDate() - 7);
    else if (metricsPeriod === '30days') start.setDate(now.getDate() - 30);
    else if (metricsPeriod === 'month') start.setDate(1);
    else start.setFullYear(2020, 0, 1);
    const dateValue = (date: Date) => date.toISOString().slice(0, 10);
    const { data, error } = await supabase.rpc('admin_sales_report', {
      p_start_date: dateValue(start), p_end_date: dateValue(now),
    });
    if (error) setReportError('Não foi possível montar o relatório. Confirme se a migration 42 foi aplicada.');
    else setReport(data);
    setLoadingReport(false);
  }, [metricsPeriod]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  if (loadingReport && !report) return <TableSkeleton rows={6} columns={4} label="Montando relatório comercial" />;
  if (reportError) return <div className="border border-red-200 bg-red-50 p-6 text-red-900"><p>{reportError}</p><button onClick={() => void loadReport()} className="mt-3 font-bold underline">Tentar novamente</button></div>;
  if (!report) return null;

  const summary = report.summary || {};
  const comparison = report.comparison || {};
  const funnel = report.funnel || {};
  const completedOrdersCount = Number(summary.paid_orders) || 0;
  const paymentMethodsMap = Object.fromEntries((report.payment_methods || []).map((item: any) => [item.method, Number(item.orders)]));
  const topProducts = (report.top_products || []).map((item: any) => ({ name: item.name || 'Produto', qty: Number(item.quantity), total: Number(item.revenue), margin: Number(item.estimated_margin) }));
  const timeline = (report.timeline || []).map((item: any) => ({ month: new Date(`${item.day}T12:00:00`).toLocaleDateString('pt-BR'), val: Number(item.net_revenue) }));
  const couponPerformance = Object.fromEntries((report.coupon_performance || []).map((item: any) => [item.coupon_id, item]));
  const previousRevenue = Number(comparison.previous_net_revenue) || 0;
  const revenueChange = previousRevenue > 0 ? ((Number(summary.net_revenue) - previousRevenue) / previousRevenue) * 100 : null;

  const exportReport = () => {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows: string[][] = [
      ['RESUMO FINANCEIRO', 'Valor'],
      ['Receita bruta', Number(summary.gross_revenue).toFixed(2)],
      ['Receita liquida', Number(summary.net_revenue).toFixed(2)],
      ['Reembolsos', Number(summary.refunds).toFixed(2)],
      ['Custo de aquisicao', Number(summary.acquisition_cost).toFixed(2)],
      ['Margem estimada', Number(summary.estimated_margin).toFixed(2)],
      ['Pedidos pagos', String(completedOrdersCount)],
      ['Ticket medio', Number(summary.average_ticket).toFixed(2)],
      ['Taxa de recompra (%)', Number(summary.repeat_rate).toFixed(2)],
      [],
      ['PRODUTOS', 'Quantidade', 'Receita', 'Margem estimada'],
      ...topProducts.map((product: any) => [product.name, String(product.qty), product.total.toFixed(2), product.margin.toFixed(2)]),
      [],
      ['CUPONS', 'Pedidos', 'Receita liquida', 'Desconto concedido'],
      ...(report.coupon_performance || []).map((coupon: any) => [coupon.code, String(coupon.orders), Number(coupon.net_revenue).toFixed(2), Number(coupon.discount_granted).toFixed(2)]),
      [],
      ['EVOLUCAO DIARIA', 'Receita liquida'],
      ...timeline.map((item: { month: string; val: number }) => [item.month, item.val.toFixed(2)]),
    ];
    const csv = `\uFEFF${rows.map(row => row.map(quote).join(';')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_comercial_palm_co_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header & Period Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
        <div>
          <h2 className="text-xl font-serif text-[#1A332B]">Relatório Geral de Vendas</h2>
          <p className="text-xs text-[#A8A29E] mt-1">Acompanhe métricas financeiras e comportamento de compras em tempo real</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2 bg-[#FDF6F0] p-1.5 rounded border border-[#C06A35]/30">
          <span className="text-xs font-semibold uppercase text-[#423226] px-2">Período:</span>
          <button
            onClick={() => setMetricsPeriod('all')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              metricsPeriod === 'all' ? 'bg-[#1A332B] text-white' : 'text-[#423226] hover:bg-white'
            }`}
          >
            Todo o Histórico
          </button>
          <button
            onClick={() => setMetricsPeriod('month')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              metricsPeriod === 'month' ? 'bg-[#1A332B] text-white' : 'text-[#423226] hover:bg-white'
            }`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setMetricsPeriod('30days')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              metricsPeriod === '30days' ? 'bg-[#1A332B] text-white' : 'text-[#423226] hover:bg-white'
            }`}
          >
            Últimos 30 Dias
          </button>
          <button
            onClick={() => setMetricsPeriod('7days')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              metricsPeriod === '7days' ? 'bg-[#1A332B] text-white' : 'text-[#423226] hover:bg-white'
            }`}
          >
            Últimos 7 Dias
          </button>
        </div>
          <button type="button" onClick={exportReport} className="border border-[#1A332B] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#1A332B]">Exportar CSV</button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
          <span className="text-xs uppercase tracking-widest text-[#423226] font-bold block mb-1">Receita Líquida</span>
          <span className="text-2xl font-serif text-[#1A332B] font-bold">
            R$ {Number(summary.net_revenue).toFixed(2).replace('.', ',')}
          </span>
          <span className="text-xs text-gray-400 block mt-2">Após reembolsos {revenueChange === null ? '' : `· ${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%`}</span>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
          <span className="text-xs uppercase tracking-widest text-[#423226] font-bold block mb-1">Ticket Médio</span>
          <span className="text-2xl font-serif text-[#C06A35] font-bold">
            R$ {Number(summary.average_ticket).toFixed(2).replace('.', ',')}
          </span>
          <span className="text-xs text-gray-400 block mt-2">Valor médio por compra efetuada</span>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
          <span className="text-xs uppercase tracking-widest text-[#423226] font-bold block mb-1">Pedidos Concluídos</span>
          <span className="text-2xl font-serif text-[#1A332B] font-bold">
            {completedOrdersCount} / {Number(funnel.orders) || 0}
          </span>
          <span className="text-xs text-gray-400 block mt-2">Pedidos com pagamento confirmado</span>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
          <span className="text-xs uppercase tracking-widest text-[#423226] font-bold block mb-1">Cancelamentos</span>
          <span className="text-2xl font-serif text-red-700 font-bold">
            {Number(summary.cancelled_orders) || 0}
          </span>
          <span className="text-xs text-gray-400 block mt-2">Pedidos estornados ou desativados</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <article className="border border-[#C06A35]/20 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#6B625C]">Margem estimada</p><p className="mt-2 font-serif text-2xl text-[#1A332B]">R$ {Number(summary.estimated_margin).toFixed(2).replace('.', ',')}</p><p className="mt-1 text-xs text-gray-400">Receita líquida menos custo das peças</p></article>
        <article className="border border-[#C06A35]/20 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#6B625C]">Reembolsado</p><p className="mt-2 font-serif text-2xl text-red-700">R$ {Number(summary.refunds).toFixed(2).replace('.', ',')}</p><p className="mt-1 text-xs text-gray-400">No período selecionado</p></article>
        <article className="border border-[#C06A35]/20 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#6B625C]">Taxa de recompra</p><p className="mt-2 font-serif text-2xl text-[#1A332B]">{Number(summary.repeat_rate).toFixed(1)}%</p><p className="mt-1 text-xs text-gray-400">Clientes com duas ou mais compras</p></article>
        <article className="border border-[#C06A35]/20 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#6B625C]">Funil</p><p className="mt-2 text-sm text-[#1A332B]">{Number(funnel.carts) || 0} carrinhos → {Number(funnel.orders) || 0} pedidos → {completedOrdersCount} pagos</p><p className="mt-1 text-xs text-gray-400">{Number(funnel.recovered_carts) || 0} carrinhos recuperados</p></article>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="bg-white p-8 rounded shadow-sm border border-[#C06A35]/20">
          <h3 className="text-lg font-serif text-[#1A332B] mb-6">Produtos Mais Vendidos</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-[#A8A29E] text-center py-8">Nenhum produto vendido ainda no período.</p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((prod: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center border-b border-[#C06A35]/10 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs bg-[#FDF6F0] px-2 py-1 rounded text-[#C06A35] font-bold">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-medium text-[#1A332B]">{prod.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-[#1A332B] block">{prod.qty} vendas</span>
                    <span className="text-xs text-[#C06A35]">R$ {prod.total.toFixed(2).replace('.', ',')}</span>
                    <span className="block text-[10px] text-gray-400">Margem est.: R$ {prod.margin.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-8 rounded shadow-sm border border-[#C06A35]/20">
          <h3 className="text-lg font-serif text-[#1A332B] mb-6">Distribuição por Método de Pagamento</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#423226] font-medium">Cartão de Crédito</span>
                <span className="font-bold text-[#1A332B]">{paymentMethodsMap['credit_card'] || 0} pedido(s)</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#1A332B] h-full rounded-full" 
                  style={{ 
                    width: `${completedOrdersCount > 0 ? ((paymentMethodsMap['credit_card'] || 0) / completedOrdersCount) * 100 : 0}%`
                  }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#423226] font-medium">PIX (Aprovação Instantânea)</span>
                <span className="font-bold text-[#1A332B]">{paymentMethodsMap['pix'] || 0} pedido(s)</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full" 
                  style={{ 
                    width: `${completedOrdersCount > 0 ? ((paymentMethodsMap['pix'] || 0) / completedOrdersCount) * 100 : 0}%`
                  }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#423226] font-medium">Boleto / Mercado Pago</span>
                <span className="font-bold text-[#1A332B]">
                  {(paymentMethodsMap['boleto'] || 0) + (paymentMethodsMap['mercado_pago'] || 0)} pedido(s)
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-600 h-full rounded-full" 
                  style={{ 
                    width: `${completedOrdersCount > 0 ? (((paymentMethodsMap['boleto'] || 0) + (paymentMethodsMap['mercado_pago'] || 0)) / completedOrdersCount) * 100 : 0}%`
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Performance Chart */}
      <div className="bg-white p-8 rounded shadow-sm border border-[#C06A35]/20">
        <h3 className="text-lg font-serif text-[#1A332B] mb-6">Desempenho de Vendas por Mês</h3>
        {timeline.length === 0 ? (
          <p className="text-sm text-[#A8A29E] text-center py-8">Nenhuma venda registrada ainda para gerar o gráfico.</p>
        ) : (
          <div className="space-y-6">
            {timeline.map(({ month, val }: { month: string; val: number }) => {
              const maxVal = Math.max(...timeline.map((m: { val: number }) => m.val), 1);
              const percentage = (val / maxVal) * 100;
              return (
                <div key={month} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-[#423226]">{month}</span>
                    <span className="font-bold text-[#1A332B]">R$ {val.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#C06A35] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Coupon Management Section */}
      <div className="bg-white p-8 rounded shadow-sm border border-[#C06A35]/20 space-y-6">
        <div className="flex justify-between items-center border-b border-[#C06A35]/30 pb-4">
          <h3 className="text-lg font-serif text-[#1A332B]">Gerenciar Cupons de Desconto</h3>
          <button
            onClick={() => setShowNewCouponForm(!showNewCouponForm)}
            className="bg-[#1A332B] text-white px-4 py-2 rounded text-xs font-medium uppercase tracking-widest hover:bg-[#433E38] transition-colors"
          >
            {showNewCouponForm ? 'Fechar Form' : '+ Novo Cupom'}
          </button>
        </div>

        {showNewCouponForm && (
          <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#FDF6F0] p-6 rounded border border-[#C06A35]/20">
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Código</label>
              <input
                required
                placeholder="EX: PALM10"
                className="w-full border p-2 bg-white text-sm"
                value={newCoupon.code}
                onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Tipo de Desconto</label>
              <select
                className="w-full border p-2 bg-white text-sm"
                value={newCoupon.discountType}
                onChange={e => setNewCoupon({...newCoupon, discountType: e.target.value as 'fixed' | 'percentage'})}
              >
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Valor</label>
              <input
                required
                type="number"
                step="0.01"
                placeholder={newCoupon.discountType === 'percentage' ? '10' : '15.00'}
                className="w-full border p-2 bg-white text-sm"
                value={newCoupon.discountValue || ''}
                onChange={e => setNewCoupon({...newCoupon, discountValue: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Compra Mínima</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full border p-2 bg-white text-sm"
                value={newCoupon.minPurchaseAmount || ''}
                onChange={e => setNewCoupon({...newCoupon, minPurchaseAmount: Number(e.target.value)})}
              />
            </div>
            <div className="md:col-span-4 flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="bg-[#C06A35] text-white px-6 py-2 rounded text-xs font-medium uppercase tracking-widest hover:bg-[#a05528]"
              >
                Salvar Cupom
              </button>
            </div>
          </form>
        )}

        {loadingCoupons ? (
          <TableSkeleton rows={4} columns={7} label="Carregando cupons" />
        ) : coupons.length === 0 ? (
          <p className="text-[#A8A29E] text-sm">Nenhum cupom promocional ativo cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#FDF6F0] text-[#1A332B] border-b border-[#C06A35]/20 font-medium">
                  <th className="p-3">Código</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Mínimo</th>
                  <th className="p-3">Usos</th>
                  <th className="p-3">Receita / Desconto</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-[#C06A35]/10 hover:bg-[#FDF6F0]">
                    <td className="p-3 font-mono font-bold text-[#1A332B]">{c.code}</td>
                    <td className="p-3">{c.discount_type === 'percentage' ? 'Porcentagem' : 'Valor Fixo'}</td>
                    <td className="p-3">
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2).replace('.', ',')}`}
                    </td>
                    <td className="p-3">R$ {Number(c.min_purchase_amount).toFixed(2).replace('.', ',')}</td>
                    <td className="p-3">{c.used_count}</td>
                    <td className="p-3 text-xs">
                      <strong>R$ {Number(couponPerformance[c.id]?.net_revenue || 0).toFixed(2).replace('.', ',')}</strong>
                      <span className="block text-gray-400">- R$ {Number(couponPerformance[c.id]?.discount_granted || 0).toFixed(2).replace('.', ',')}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {c.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => handleToggleCoupon(c.id, c.is_active)}
                        className="text-xs text-orange-600 underline"
                      >
                        {c.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(c.id)}
                        className="text-xs text-red-600 underline"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
