import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useStoreSettings } from '../hooks/useStoreSettings';
import type { Product } from '../types';
import { useToast } from '../components/Toast';
import { useSearchParams } from 'react-router-dom';

import { AdminInventory } from '../features/admin/AdminInventory';
import { AdminOrders, type AdminOrderQuery } from '../features/admin/AdminOrders';
import { AdminCustomers } from '../features/admin/AdminCustomers';
import { AdminAbandonedCarts } from '../features/admin/AdminAbandonedCarts';
import { AdminMetrics } from '../features/admin/AdminMetrics';
import { AdminOperationalHealth } from '../features/admin/AdminOperationalHealth';
import { AdminOverview } from '../features/admin/AdminOverview';

type AdminSection = 'overview' | 'inventory' | 'orders' | 'customers' | 'abandoned' | 'metrics' | 'health';
const ADMIN_SECTIONS: AdminSection[] = ['overview', 'inventory', 'orders', 'customers', 'abandoned', 'metrics', 'health'];

export function AdminDashboard() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section') as AdminSection | null;
  const activeTab: AdminSection = requestedSection && ADMIN_SECTIONS.includes(requestedSection) ? requestedSection : 'overview';
  const setActiveTab = (section: AdminSection) => {
    setSearchParams(section === 'overview' ? {} : { section });
  };

  const adminTabs = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'inventory', label: 'Estoque' },
    { id: 'orders', label: 'Pedidos' },
    { id: 'customers', label: 'Clientes' },
    { id: 'abandoned', label: 'Carrinhos' },
    { id: 'metrics', label: 'Métricas' },
    { id: 'health', label: 'Saúde' },
  ];

  // Store Info & Shared Data
  const { storeInfo } = useStoreSettings();
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [totalAdminOrders, setTotalAdminOrders] = useState(0);
  const [metricsOrders, setMetricsOrders] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [sectionErrors, setSectionErrors] = useState<Record<string, string | null>>({});
  const loadedTabs = useRef(new Set<string>());
  const lastOrderQuery = useRef<AdminOrderQuery>({
    page: 1, pageSize: 20, status: null, startDate: null, endDate: null,
    minValue: null, maxValue: null, paymentMethod: null, search: null,
  });

  // Abandoned Carts States
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [loadingAbandoned, setLoadingAbandoned] = useState(false);

  // CRM States
  const [crmCustomers, setCrmCustomers] = useState<any[]>([]);
  const [loadingCRM, setLoadingCRM] = useState(false);

  // Coupons States
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [showNewCouponForm, setShowNewCouponForm] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    minPurchaseAmount: 0
  });

  const fetchAdminProducts = async () => {
    setLoadingProducts(true);
    setSectionErrors(previous => ({ ...previous, inventory: null }));
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setSectionErrors(previous => ({ ...previous, inventory: 'Não foi possível carregar o estoque.' }));
    } else if (data) {
      const mapped = data.map(row => ({
        id: row.id,
        name: row.name,
        tagline: row.tagline,
        description: row.description,
        longDescription: row.long_description,
        price: Number(row.price),
        category: row.category,
        imageUrl: row.image_url,
        gallery: row.gallery,
        features: row.features,
        isSold: row.is_sold,
        archivedAt: row.archived_at,
        sku: row.sku,
        acquisitionCost: row.acquisition_cost === null ? undefined : Number(row.acquisition_cost),
        source: row.source,
        acquiredAt: row.acquired_at,
        brand: row.brand,
        color: row.color,
        material: row.material,
        measurements: row.measurements,
        stockQuantity: row.stock_quantity,
        condition: row.condition,
        conditionNotes: row.condition_notes,
        size: row.size
      }));
      setAdminProducts(mapped);
    }
    setLoadingProducts(false);
  };

  const fetchAdminOrders = useCallback(async (query?: AdminOrderQuery) => {
    const nextQuery = query || lastOrderQuery.current;
    lastOrderQuery.current = nextQuery;
    setLoadingOrders(true);
    setSectionErrors(previous => ({ ...previous, orders: null }));
    const { data, error } = await supabase
      .rpc('admin_list_orders', {
        p_page: nextQuery.page,
        p_page_size: nextQuery.pageSize,
        p_status: nextQuery.status,
        p_start_date: nextQuery.startDate,
        p_end_date: nextQuery.endDate,
        p_min_value: nextQuery.minValue,
        p_max_value: nextQuery.maxValue,
        p_payment_method: nextQuery.paymentMethod,
        p_search: nextQuery.search,
      });

    if (error) {
      setSectionErrors(previous => ({ ...previous, orders: 'Não foi possível carregar os pedidos.' }));
    } else if (data) {
      const result = data as { orders?: any[]; total?: number };
      setAdminOrders(result.orders || []);
      setTotalAdminOrders(Number(result.total) || 0);
    }
    setLoadingOrders(false);
  }, []);

  const fetchMetricsOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, size))')
      .order('created_at', { ascending: false });
    if (error) {
      setSectionErrors(previous => ({ ...previous, metrics: 'Não foi possível carregar as métricas e cupons.' }));
    } else {
      setMetricsOrders(data || []);
    }
  };

  const fetchCRMData = async () => {
    setLoadingCRM(true);
    setSectionErrors(previous => ({ ...previous, customers: null }));
    try {
      const { data: customerRows, error: customerError } = await supabase.from('customers').select('*');
      const { data: orderRows, error: orderError } = await supabase.from('orders').select('*');

      if (customerError) throw customerError;
      if (orderError) throw orderError;

      const orders = orderRows || [];
      const profiles = customerRows || [];
      const crmMap: Record<string, any> = {};

      profiles.forEach(p => {
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sem Nome';
        crmMap[p.user_id] = {
          id: p.id,
          name,
          phone: p.phone || 'N/A',
          cpf: p.cpf || 'N/A',
          birthDate: p.birth_date || 'N/A',
          ordersCount: 0,
          totalSpent: 0,
          lastPurchaseDate: null,
          type: 'customer',
          userId: p.user_id,
          createdAt: p.created_at
        };
      });

      orders.forEach(order => {
        const isPaid = order.payment_status
          ? ['paid', 'partially_refunded'].includes(order.payment_status)
          : ['paid', 'shipped', 'delivered'].includes(order.status);
        const total = Number(order.total_amount) || 0;

        if (order.user_id && crmMap[order.user_id]) {
          const c = crmMap[order.user_id];
          c.ordersCount += 1;
          if (isPaid) c.totalSpent += total;
          if (!c.lastPurchaseDate || new Date(order.created_at) > new Date(c.lastPurchaseDate)) {
            c.lastPurchaseDate = order.created_at;
          }
        } else {
          const address = order.shipping_address || {};
          const name = `${address.firstName || ''} ${address.lastName || ''}`.trim() || 'Visitante';
          const phone = address.phone || 'N/A';
          const guestKey = `guest_${name}_${phone}`;

          if (!crmMap[guestKey]) {
            crmMap[guestKey] = {
              id: guestKey,
              name,
              phone,
              ordersCount: 0,
              totalSpent: 0,
              lastPurchaseDate: null,
              type: 'guest',
              createdAt: order.created_at
            };
          }
          const g = crmMap[guestKey];
          g.ordersCount += 1;
          if (isPaid) g.totalSpent += total;
          if (!g.lastPurchaseDate || new Date(order.created_at) > new Date(g.lastPurchaseDate)) {
            g.lastPurchaseDate = order.created_at;
          }
        }
      });

      setCrmCustomers(Object.values(crmMap));
    } catch (e) {
      console.error(e);
      setSectionErrors(previous => ({ ...previous, customers: 'Não foi possível carregar os clientes.' }));
    } finally {
      setLoadingCRM(false);
    }
  };

  const fetchAbandonedCarts = async () => {
    setLoadingAbandoned(true);
    setSectionErrors(previous => ({ ...previous, abandoned: null }));
    try {
      const { data, error } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('status', 'abandoned')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      if (data) setAbandonedCarts(data);
    } catch (err) {
      console.error('Erro ao buscar carrinhos abandonados:', err);
      setSectionErrors(previous => ({ ...previous, abandoned: 'Não foi possível carregar os carrinhos.' }));
    } finally {
      setLoadingAbandoned(false);
    }
  };

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    setSectionErrors(previous => ({ ...previous, metrics: null }));
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setSectionErrors(previous => ({ ...previous, metrics: 'Não foi possível carregar as métricas e cupons.' }));
    } else if (data) {
      setCoupons(data);
    }
    setLoadingCoupons(false);
  };

  useEffect(() => {
    if (loadedTabs.current.has(activeTab)) return;
    loadedTabs.current.add(activeTab);

    if (activeTab === 'inventory') void fetchAdminProducts();
    // A aba de pedidos inicia sua consulta com os filtros e a página atuais.
    if (activeTab === 'customers') void fetchCRMData();
    if (activeTab === 'abandoned') void fetchAbandonedCarts();
    if (activeTab === 'metrics') {
      void fetchCoupons();
      void fetchMetricsOrders();
    }
  }, [activeTab]);

  const retryActiveSection = () => {
    if (activeTab === 'inventory') void fetchAdminProducts();
    if (activeTab === 'orders') void fetchAdminOrders();
    if (activeTab === 'customers') void fetchCRMData();
    if (activeTab === 'abandoned') void fetchAbandonedCarts();
    if (activeTab === 'metrics') {
      void fetchCoupons();
      void fetchMetricsOrders();
    }
  };

  const handleExportCSV = () => {
    if (adminOrders.length === 0) return;
    const headers = ['ID Pedido', 'Data', 'Cliente', 'Telefone', 'Itens', 'Total', 'Metodo Pagamento', 'Status'];
    const rows = adminOrders.map(order => {
      const dateStr = new Date(order.created_at).toLocaleDateString('pt-BR');
      const clientName = `${order.shipping_address?.firstName || ''} ${order.shipping_address?.lastName || ''}`.trim();
      const phone = order.shipping_address?.phone || 'N/A';
      const itemsStr = order.order_items?.map((item: any) => `${item.products?.name || 'Produto'} (${item.products?.size || 'U'})`).join('; ') || '';
      const totalStr = Number(order.total_amount).toFixed(2);

      return [
        order.id,
        dateStr,
        `"${clientName.replace(/"/g, '""')}"`,
        phone,
        `"${itemsStr.replace(/"/g, '""')}"`,
        totalStr,
        order.payment_method,
        order.status
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pedidos_palm_co_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCode = newCoupon.code.trim().toUpperCase();
    if (!normalizedCode) {
      showToast('Informe o código do cupom.', 'warning');
      return;
    }
    if (newCoupon.discountValue <= 0) {
      showToast('O desconto precisa ser maior que zero.', 'warning');
      return;
    }
    if (newCoupon.discountType === 'percentage' && newCoupon.discountValue > 100) {
      showToast('O desconto percentual não pode ultrapassar 100%.', 'warning');
      return;
    }
    const { error } = await supabase
      .from('coupons')
      .insert({
        code: normalizedCode,
        discount_type: newCoupon.discountType,
        discount_value: newCoupon.discountValue,
        min_purchase_amount: newCoupon.minPurchaseAmount
      });
    if (error) {
      showToast('Erro ao criar cupom: ' + error.message, 'error');
    } else {
      showToast('Cupom criado com sucesso!', 'success');
      setNewCoupon({ code: '', discountType: 'percentage', discountValue: 0, minPurchaseAmount: 0 });
      setShowNewCouponForm(false);
      await fetchCoupons();
    }
  };

  const handleToggleCoupon = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (error) {
      showToast('Erro ao atualizar cupom: ' + error.message, 'error');
    } else {
      showToast('Status do cupom atualizado!', 'success');
      await fetchCoupons();
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Deseja excluir este cupom permanentemente?')) return;
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);
    if (error) {
      showToast('Erro ao deletar cupom: ' + error.message, 'error');
    } else {
      showToast('Cupom excluído com sucesso.', 'success');
      await fetchCoupons();
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF6F0] pt-8 pb-24 px-6 md:px-12 animate-fade-in-up">
      <div className="max-w-[1500px] mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between border-b border-[#C06A35]/20 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-serif text-[#1A332B] mb-1">Painel de Controle</h1>
            <p className="text-xs text-[#423226] opacity-70 uppercase tracking-widest font-sans">
              Admin Palm CO.
            </p>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-10">
          {/* Sidebar Menu - Exact Minha Conta / Shoulder Style */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <nav className="flex flex-col space-y-1">
              {adminTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminSection)}
                  className={`text-left px-4 py-3 text-sm font-medium transition-colors border-l-2 ${activeTab === tab.id
                      ? 'border-[#C06A35] text-[#1A332B] bg-white font-semibold shadow-sm'
                      : 'border-transparent text-gray-500 hover:text-[#1A332B] hover:bg-white/50'
                    }`}
                >
                  {tab.label}
                </button>
              ))}

              <div className="my-2 border-t border-gray-200"></div>

              <a
                href="/catalogo"
                target="_blank"
                rel="noreferrer"
                className="text-left px-4 py-3 text-sm font-medium text-gray-500 hover:text-[#1A332B] hover:bg-white/50 transition-colors border-l-2 border-transparent block"
              >
                Ver Loja ↗
              </a>

              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="text-left px-4 py-3 text-sm font-medium text-gray-500 hover:text-red-700 transition-colors border-l-2 border-transparent"
              >
                Sair
              </button>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {sectionErrors[activeTab] && (
              <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {sectionErrors[activeTab]}{' '}
                <button type="button" onClick={retryActiveSection} className="font-semibold underline">
                  Tentar novamente
                </button>
              </div>
            )}
            {activeTab === 'overview' && <AdminOverview onNavigate={setActiveTab} />}
            {activeTab === 'inventory' && (
              <AdminInventory
                adminProducts={adminProducts}
                loading={loadingProducts && adminProducts.length === 0}
                fetchAdminProducts={fetchAdminProducts}
              />
            )}

            {activeTab === 'orders' && (
              <AdminOrders
                adminOrders={adminOrders}
                totalOrders={totalAdminOrders}
                loading={loadingOrders && adminOrders.length === 0}
                storeInfo={storeInfo}
                fetchAdminOrders={fetchAdminOrders}
                fetchCRMData={fetchCRMData}
                handleExportCSV={handleExportCSV}
              />
            )}

            {activeTab === 'customers' && (
              <AdminCustomers
                crmCustomers={crmCustomers}
                loadingCRM={loadingCRM && crmCustomers.length === 0}
              />
            )}

            {activeTab === 'abandoned' && (
              <AdminAbandonedCarts
                abandonedCarts={abandonedCarts}
                loadingAbandoned={loadingAbandoned && abandonedCarts.length === 0}
              />
            )}

            {activeTab === 'metrics' && (
              <AdminMetrics
                adminOrders={metricsOrders}
                coupons={coupons}
                loadingCoupons={loadingCoupons && coupons.length === 0}
                fetchCoupons={fetchCoupons}
                handleCreateCoupon={handleCreateCoupon}
                handleToggleCoupon={handleToggleCoupon}
                handleDeleteCoupon={handleDeleteCoupon}
                newCoupon={newCoupon}
                setNewCoupon={setNewCoupon}
                showNewCouponForm={showNewCouponForm}
                setShowNewCouponForm={setShowNewCouponForm}
              />
            )}

            {activeTab === 'health' && <AdminOperationalHealth />}
          </main>
        </div>
      </div>
    </div>
  );
}
