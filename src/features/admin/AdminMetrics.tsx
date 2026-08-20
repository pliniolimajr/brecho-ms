import React, { useMemo, useState } from 'react';
import { TableSkeleton } from '../../components/LoadingStates';

interface AdminMetricsProps {
  adminOrders: any[];
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
  adminOrders,
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

  const metrics = useMemo(() => {
    const now = new Date();
    const filteredOrders = adminOrders.filter(o => {
      if (!o.created_at) return true;
      const orderDate = new Date(o.created_at);
      if (metricsPeriod === '7days') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (metricsPeriod === '30days') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      if (metricsPeriod === 'month') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    const paidOrDelivered = filteredOrders.filter(o =>
      o.payment_status
        ? ['paid', 'partially_refunded'].includes(o.payment_status)
        : ['paid', 'shipped', 'delivered'].includes(o.status)
    );
    const totalSales = paidOrDelivered.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalOrders = filteredOrders.length;
    const completedOrdersCount = paidOrDelivered.length;
    const averageTicket = completedOrdersCount > 0 ? totalSales / completedOrdersCount : 0;
    
    // Group by month
    const monthlySales: Record<string, number> = {};
    paidOrDelivered.forEach(o => {
      const date = new Date(o.created_at);
      const key = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      monthlySales[capitalizedKey] = (monthlySales[capitalizedKey] || 0) + Number(o.total_amount);
    });

    // Top Selling Products & Payment Methods
    const productSalesMap: Record<string, { name: string; qty: number; total: number }> = {};
    const paymentMethodsMap: Record<string, number> = { credit_card: 0, pix: 0, boleto: 0, mercado_pago: 0 };

    paidOrDelivered.forEach(o => {
      const method = o.payment_method || 'mercado_pago';
      paymentMethodsMap[method] = (paymentMethodsMap[method] || 0) + 1;

      o.order_items?.forEach((item: any) => {
        const prodName = item.products?.name || 'Produto';
        if (!productSalesMap[prodName]) {
          productSalesMap[prodName] = { name: prodName, qty: 0, total: 0 };
        }
        productSalesMap[prodName].qty += 1;
        productSalesMap[prodName].total += Number(item.price) || 0;
      });
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      totalSales,
      totalOrders,
      completedOrdersCount,
      averageTicket,
      monthlySales: Object.entries(monthlySales).map(([month, val]) => ({ month, val })),
      cancelledCount: filteredOrders.filter(o => o.status === 'cancelled').length,
      topProducts,
      paymentMethodsMap
    };
  }, [adminOrders, metricsPeriod]);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header & Period Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
        <div>
          <h2 className="text-xl font-serif text-[#1A332B]">Relatório Geral de Vendas</h2>
          <p className="text-xs text-[#A8A29E] mt-1">Acompanhe métricas financeiras e comportamento de compras em tempo real</p>
        </div>
        
        <div className="flex items-center gap-2 bg-[#FDF6F0] p-1.5 rounded border border-[#C06A35]/30">
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
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
          <span className="text-xs uppercase tracking-widest text-[#423226] font-bold block mb-1">Faturamento Bruto</span>
          <span className="text-2xl font-serif text-[#1A332B] font-bold">
            R$ {metrics.totalSales.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-xs text-gray-400 block mt-2">Somente pedidos pagos / entregues</span>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
          <span className="text-xs uppercase tracking-widest text-[#423226] font-bold block mb-1">Ticket Médio</span>
          <span className="text-2xl font-serif text-[#C06A35] font-bold">
            R$ {metrics.averageTicket.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-xs text-gray-400 block mt-2">Valor médio por compra efetuada</span>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
          <span className="text-xs uppercase tracking-widest text-[#423226] font-bold block mb-1">Pedidos Concluídos</span>
          <span className="text-2xl font-serif text-[#1A332B] font-bold">
            {metrics.completedOrdersCount} / {metrics.totalOrders}
          </span>
          <span className="text-xs text-gray-400 block mt-2">Pedidos com pagamento confirmado</span>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
          <span className="text-xs uppercase tracking-widest text-[#423226] font-bold block mb-1">Cancelamentos</span>
          <span className="text-2xl font-serif text-red-700 font-bold">
            {metrics.cancelledCount}
          </span>
          <span className="text-xs text-gray-400 block mt-2">Pedidos estornados ou desativados</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="bg-white p-8 rounded shadow-sm border border-[#C06A35]/20">
          <h3 className="text-lg font-serif text-[#1A332B] mb-6">Produtos Mais Vendidos</h3>
          {metrics.topProducts.length === 0 ? (
            <p className="text-sm text-[#A8A29E] text-center py-8">Nenhum produto vendido ainda no período.</p>
          ) : (
            <div className="space-y-4">
              {metrics.topProducts.map((prod, idx) => (
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
                <span className="font-bold text-[#1A332B]">{metrics.paymentMethodsMap['credit_card'] || 0} pedido(s)</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#1A332B] h-full rounded-full" 
                  style={{ 
                    width: `${metrics.completedOrdersCount > 0 ? ((metrics.paymentMethodsMap['credit_card'] || 0) / metrics.completedOrdersCount) * 100 : 0}%` 
                  }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#423226] font-medium">PIX (Aprovação Instantânea)</span>
                <span className="font-bold text-[#1A332B]">{metrics.paymentMethodsMap['pix'] || 0} pedido(s)</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full" 
                  style={{ 
                    width: `${metrics.completedOrdersCount > 0 ? ((metrics.paymentMethodsMap['pix'] || 0) / metrics.completedOrdersCount) * 100 : 0}%` 
                  }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#423226] font-medium">Boleto / Mercado Pago</span>
                <span className="font-bold text-[#1A332B]">
                  {(metrics.paymentMethodsMap['boleto'] || 0) + (metrics.paymentMethodsMap['mercado_pago'] || 0)} pedido(s)
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-600 h-full rounded-full" 
                  style={{ 
                    width: `${metrics.completedOrdersCount > 0 ? (((metrics.paymentMethodsMap['boleto'] || 0) + (metrics.paymentMethodsMap['mercado_pago'] || 0)) / metrics.completedOrdersCount) * 100 : 0}%` 
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
        {metrics.monthlySales.length === 0 ? (
          <p className="text-sm text-[#A8A29E] text-center py-8">Nenhuma venda registrada ainda para gerar o gráfico.</p>
        ) : (
          <div className="space-y-6">
            {metrics.monthlySales.map(({ month, val }) => {
              const maxVal = Math.max(...metrics.monthlySales.map(m => m.val), 1);
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
