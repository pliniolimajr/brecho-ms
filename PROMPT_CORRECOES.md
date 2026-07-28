# Prompt para Agente - Correções Necessárias Little Palm CO.

**Contexto:** Little Palm CO. é uma loja de roupas NOVAS (não é brechó). O sistema atual está 85% funcional, mas precisa de correções críticas para produção.

## INSTRUÇÕES PARA O AGENTE

Analise o códigobase e implemente as correções abaixo. Priorize a **FASE 1** (crítico para produção).

---

## FASE 1 - CRÍTICO PARA PRODUÇÃO

### 1. Proteger Rota /admin
**Problema:** Qualquer usuário pode acessar `/admin` sem autorização.
**Solução:** Criar middleware de proteção baseado em custom claim ou tabela de roles.

```typescript
// Criar src/components/ProtectedAdminRoute.tsx
export function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      // Verificar custom claim ou tabela de admins
      const { data } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsAdmin(!!data);
      setLoading(false);
    };
    
    checkAdmin();
  }, [user]);

  if (loading) return <div>Carregando...</div>;
  if (!isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
}

// Atualizar src/App.tsx
<Route path="/admin" element={<AdminLayout />}>
  <Route element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
</Route>
```

**SQL adicional:**
```sql
-- Criar tabela de admins
CREATE TABLE IF NOT EXISTS admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir primeiro admin (substituir pelo user_id real)
INSERT INTO admins (user_id) VALUES ('SEU_USER_ID_AQUI');
```

---

### 2. Adicionar Lazy Loading nas Imagens
**Problema:** Todas as imagens carregam de uma vez, prejudicando performance.
**Solução:** Adicionar `loading="lazy"` em todas as imagens.

**Arquivos a modificar:**
- `src/components/ProductCard.tsx` - linha da imagem
- `src/components/ProductDetail.tsx` - imagem principal e thumbnails
- `src/pages/CustomerProfile.tsx` - imagens da wishlist

```typescript
// Exemplo em ProductCard.tsx
<img 
  src={product.imageUrl} 
  alt={product.name} 
  loading="lazy"
  className="w-full h-full object-cover"
/>
```

---

### 3. Validar Estoque Real no Checkout
**Problema:** Race condition possível - produto pode ser vendido durante checkout.
**Solução:** Validar estoque antes de criar pedido e marcar como reservado.

**Modificar `src/components/Checkout.tsx`:**

```typescript
// Antes de criar o pedido, validar estoque
const validateStock = async () => {
  for (const item of items) {
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity, is_sold')
      .eq('id', item.id)
      .single();
    
    if (!product || product.is_sold || (product.stock_quantity ?? 0) < 1) {
      throw new Error(`O produto "${item.name}" está esgotado.`);
    }
  }
};

// No handleSubmit, antes de criar order:
try {
  await validateStock();
  
  // Criar pedido...
} catch (err: any) {
  alert(err.message);
  setLoading(false);
  return;
}
```

---

### 4. Adicionar Tratamento de Timeout no Mercado Pago
**Problema:** Se Mercado Pago não responder, usuário fica travado.
**Solução:** Adicionar timeout e retry.

**Modificar `src/components/Checkout.tsx`:**

```typescript
// No handleSubmit, ao chamar create-preference:
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos

try {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-preference`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({...}),
      signal: controller.signal
    }
  );
  
  clearTimeout(timeoutId);
  
  if (!response.ok) {
    throw new Error('Erro ao processar pagamento');
  }
  
  const prefData = await response.json();
  // ...
} catch (err: any) {
  clearTimeout(timeoutId);
  if (err.name === 'AbortError') {
    alert('Tempo esgotado. O serviço de pagamento está demorando. Tente novamente.');
  } else {
    console.error(err);
    alert('Erro ao processar pagamento. Tente novamente.');
  }
  setLoading(false);
}
```

---

### 5. Testar Webhook de Pagamento
**Problema:** Webhook implementado mas não validado em produção.
**Solução:** Implementar validação de assinatura e logs de erro.

**Modificar `supabase/functions/payment-webhook/index.ts`:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Validar assinatura do Mercado Pago
function validateSignature(signature: string | null, body: any): boolean {
  if (!signature) return false;
  // Implementar validação HMAC com secret do Mercado Pago
  // Por enquanto, retorna true para desenvolvimento
  return true;
}

serve(async (req) => {
  try {
    const signature = req.headers.get('x-signature');
    const body = await req.json();
    
    if (!validateSignature(signature, body)) {
      console.error('Invalid signature');
      return new Response('Invalid signature', { status: 401 });
    }
    
    const { data, topic } = body;
    
    if (topic === 'payment') {
      const paymentId = data.id;
      
      // Buscar detalhes do pagamento
      const mpResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')}`
          }
        }
      );
      
      const payment = await mpResponse.json();
      
      if (payment.status === 'approved') {
        const orderId = payment.external_reference;
        
        // Atualizar status do pedido
        await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('id', orderId);
        
        console.log(`Order ${orderId} marked as paid`);
      }
    }
    
    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('Webhook error:', error);
    
    // Log erro em tabela para debugging
    await supabase.from('webhook_errors').insert({
      error: error.message,
      payload: await req.text(),
      created_at: new Date().toISOString()
    });
    
    return new Response('Error processing webhook', { status: 500 });
  }
})
```

**SQL adicional:**
```sql
-- Criar tabela para logs de webhook
CREATE TABLE IF NOT EXISTS webhook_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    error TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## FASE 2 - IMPORTANTE PARA ADMIN

### 6. Implementar Dashboard de Métricas
**Problema:** Admin não tem visão de faturamento, ticket médio, etc.
**Solução:** Criar componente de dashboard com cards e gráficos.

**Criar `src/components/AdminDashboard.tsx` (ou adicionar em AdminDashboard):**

```typescript
const DashboardMetrics = () => {
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    averageTicket: 0,
    totalOrders: 0,
    pendingOrders: 0,
    paidOrders: 0
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Últimos 30 dias
      
      if (orders) {
        const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'delivered');
        const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
        
        setMetrics({
          totalRevenue,
          averageTicket: paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
          totalOrders: orders.length,
          pendingOrders: orders.filter(o => o.status === 'pending').length,
          paidOrders: paidOrders.length
        });
      }
    };
    
    fetchMetrics();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      <MetricCard 
        label="Faturamento (30d)" 
        value={`R$ ${metrics.totalRevenue.toFixed(2)}`} 
        color="green"
      />
      <MetricCard 
        label="Ticket Médio" 
        value={`R$ ${metrics.averageTicket.toFixed(2)}`} 
        color="blue"
      />
      <MetricCard 
        label="Pedidos Totais" 
        value={metrics.totalOrders} 
        color="purple"
      />
      <MetricCard 
        label="Pedidos Pagos" 
        value={metrics.paidOrders} 
        color="green"
      />
      <MetricCard 
        label="Pendentes" 
        value={metrics.pendingOrders} 
        color="orange"
      />
    </div>
  );
};

const MetricCard = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
  <div className={`bg-white p-6 rounded-lg shadow-sm border-l-4 border-${color}-500`}>
    <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
    <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
  </div>
);
```

---

### 7. Adicionar Exportação CSV de Pedidos
**Problema:** Admin não pode exportar pedidos para contabilidade.
**Solução:** Implementar função de exportação.

**Adicionar em `src/pages/AdminDashboard.tsx`:**

```typescript
const handleExportOrdersCSV = async () => {
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, products(*))')
    .order('created_at', { ascending: false });
  
  if (!orders) return;
  
  const headers = ['ID', 'Data', 'Cliente', 'Total', 'Status', 'Método Pagamento', 'Itens'];
  const rows = orders.map(order => [
    order.id.split('-')[0].toUpperCase(),
    new Date(order.created_at).toLocaleDateString('pt-BR'),
    order.shipping_address?.firstName || 'N/A',
    Number(order.total_amount).toFixed(2),
    order.status,
    order.payment_method,
    order.order_items?.map((i: any) => i.products?.name).join('; ') || ''
  ]);
  
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

// Adicionar botão na UI
<button onClick={handleExportOrdersCSV} className="...">
  Exportar CSV
</button>
```

---

### 8. Implementar Upload de Galeria de Imagens
**Problema:** Admin só pode upload de imagem única.
**Solução:** Permitir upload de múltiplas imagens.

**Modificar `src/pages/AdminDashboard.tsx`:**

```typescript
const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;
  
  const urls = [];
  
  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);
    
    if (uploadError) {
      console.error('Error uploading:', uploadError);
      continue;
    }
    
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    
    urls.push(data.publicUrl);
  }
  
  setEditingProduct(prev => ({
    ...prev,
    gallery: [...(prev.gallery || []), ...urls]
  }));
};

// No formulário de edição, adicionar:
<div>
  <label>Galeria de Imagens</label>
  <input 
    type="file" 
    multiple 
    accept="image/*"
    onChange={handleGalleryUpload}
  />
  {editingProduct.gallery && (
    <div className="flex gap-2 mt-2">
      {editingProduct.gallery.map((url, idx) => (
        <img key={idx} src={url} className="w-20 h-20 object-cover" />
      ))}
    </div>
  )}
</div>
```

---

### 9. Implementar Importação CSV de Produtos
**Problema:** Cadastro manual de produtos é lento.
**Solução:** Permitir importação em massa via CSV.

**Adicionar em `src/pages/AdminDashboard.tsx`:**

```typescript
const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  const text = await file.text();
  const rows = text.split('\n').slice(1); // Skip header
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const row of rows) {
    if (!row.trim()) continue;
    
    const cols = row.split(',');
    if (cols.length < 5) {
      errorCount++;
      continue;
    }
    
    try {
      await supabase.from('products').insert({
        name: cols[0].trim(),
        price: Number(cols[1]),
        category: cols[2].trim(),
        size: cols[3].trim(),
        description: cols[4]?.trim() || '',
        image_url: cols[5]?.trim() || '',
        // ... outros campos conforme necessário
      });
      successCount++;
    } catch (err) {
      errorCount++;
    }
  }
  
  alert(`Importação concluída: ${successCount} produtos importados, ${errorCount} erros.`);
  fetchAdminProducts();
};

// Adicionar botão e input
<input 
  type="file" 
  accept=".csv"
  onChange={handleCSVImport}
/>
```

---

### 10. Adicionar Filtros de Pedidos
**Problema:** Admin não pode filtrar pedidos por período/status.
**Solução:** Implementar filtros de data e status.

**Adicionar em `src/pages/AdminDashboard.tsx`:**

```typescript
const [orderFilter, setOrderFilter] = useState({
  status: 'all',
  dateFrom: '',
  dateTo: ''
});

const filteredOrders = orders.filter(order => {
  if (orderFilter.status !== 'all' && order.status !== orderFilter.status) {
    return false;
  }
  
  if (orderFilter.dateFrom && new Date(order.created_at) < new Date(orderFilter.dateFrom)) {
    return false;
  }
  
  if (orderFilter.dateTo && new Date(order.created_at) > new Date(orderFilter.dateTo)) {
    return false;
  }
  
  return true;
});

// UI de filtros
<div className="flex gap-4 mb-4">
  <select 
    value={orderFilter.status}
    onChange={(e) => setOrderFilter({...orderFilter, status: e.target.value})}
  >
    <option value="all">Todos os Status</option>
    <option value="pending">Pendente</option>
    <option value="paid">Pago</option>
    <option value="shipped">Enviado</option>
    <option value="delivered">Entregue</option>
    <option value="cancelled">Cancelado</option>
  </select>
  <input 
    type="date" 
    value={orderFilter.dateFrom}
    onChange={(e) => setOrderFilter({...orderFilter, dateFrom: e.target.value})}
  />
  <input 
    type="date" 
    value={orderFilter.dateTo}
    onChange={(e) => setOrderFilter({...orderFilter, dateTo: e.target.value})}
  />
</div>
```

---

## FASE 3 - MELHORIAS UX

### 11. Adicionar Paginação no Catálogo
**Problema:** Todos os produtos carregam de uma vez.
**Solução:** Implementar paginação ou infinite scroll.

**Modificar `src/pages/Catalog.tsx`:**

```typescript
const [page, setPage] = useState(1);
const ITEMS_PER_PAGE = 12;

const paginatedProducts = filteredProducts.slice(
  0, 
  page * ITEMS_PER_PAGE
);

const hasMore = paginatedProducts.length < filteredProducts.length;

// Adicionar botão "Carregar Mais"
{hasMore && (
  <button 
    onClick={() => setPage(prev => prev + 1)}
    className="mx-auto block mt-8 px-8 py-3 bg-[#1A332B] text-white"
  >
    Carregar Mais
  </button>
)}
```

---

### 12. Adicionar Campo "Condição" (Opcional para Loja de Roupas Novas)
**Nota:** Para loja de produtos novos, este campo pode ter valores diferentes: "Novo", "Coleção Atual", "Promoção", "Outlet".

**SQL:**
```sql
ALTER TABLE products ADD COLUMN condition TEXT DEFAULT 'novo';

-- Adicionar check constraint
ALTER TABLE products 
ADD CONSTRAINT check_condition 
CHECK (condition IN ('novo', 'colecao_atual', 'promocao', 'outlet'));
```

**Adicionar filtro em `src/pages/Catalog.tsx`:**
```typescript
const CONDITIONS = ['Todos', 'Novo', 'Coleção Atual', 'Promoção', 'Outlet'];
const [selectedCondition, setSelectedCondition] = useState('Todos');

// No filteredProducts:
if (selectedCondition !== 'Todos') {
  result = result.filter(p => p.condition === selectedCondition);
}
```

---

### 13. Implementar Sistema de Notificações
**Problema:** Admin não é alertado de novos pedidos.
**Solução:** Criar sistema de notificações in-app.

**SQL:**
```sql
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários veem suas notificações" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);
```

**Criar hook `src/hooks/useNotifications.ts`:**
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    };

    fetchNotifications();

    // Real-time subscription
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return { notifications, unreadCount, markAsRead };
}
```

**Criar notificação ao receber pedido (no webhook):**
```typescript
// No payment-webhook, após marcar pedido como pago:
await supabase.from('notifications').insert({
  user_id: ADMIN_USER_ID, // Buscar da tabela admins
  type: 'new_order',
  title: 'Novo Pedido Recebido',
  message: `Pedido ${orderId} foi pago e está pronto para envio.`,
  data: { order_id: orderId }
});
```

---

### 14. Adicionar Botão "Comprar Novamente"
**Problema:** Cliente não pode repetir pedido facilmente.
**Solução:** Implementar função de reordenar.

**Adicionar em `src/pages/CustomerProfile.tsx`:**

```typescript
const { addToCart } = useStore();

const handleReorder = async (order: any) => {
  for (const item of order.order_items) {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', item.product_id)
      .single();
    
    if (product && !product.is_sold && (product.stock_quantity ?? 0) > 0) {
      addToCart(product);
    }
  }
  navigate('/checkout');
};

// Adicionar botão no card do pedido
<button onClick={() => handleReorder(order)}>
  Comprar Novamente
</button>
```

---

### 15. Implementar Guia de Medidas
**Problema:** Cliente não tem referência de tamanhos.
**Solução:** Adicionar tabela de conversão de tamanhos.

**Criar componente `src/components/SizeGuide.tsx`:**

```typescript
const SIZE_GUIDE = {
  PP: { busto: '82-86', cintura: '62-66', quadril: '88-92' },
  P: { busto: '86-90', cintura: '66-70', quadril: '92-96' },
  M: { busto: '90-94', cintura: '70-74', quadril: '96-100' },
  G: { busto: '94-98', cintura: '74-78', quadril: '100-104' },
  GG: { busto: '98-102', cintura: '78-82', quadril: '104-108' },
};

export function SizeGuide() {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer font-bold">Guia de Medidas</summary>
      <table className="w-full mt-4 text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Tamanho</th>
            <th className="py-2">Busto (cm)</th>
            <th className="py-2">Cintura (cm)</th>
            <th className="py-2">Quadril (cm)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(SIZE_GUIDE).map(([size, measures]) => (
            <tr key={size} className="border-b">
              <td className="py-2 font-bold">{size}</td>
              <td className="py-2">{measures.busto}</td>
              <td className="py-2">{measures.cintura}</td>
              <td className="py-2">{measures.quadril}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
```

**Adicionar em `src/components/ProductDetail.tsx`:**
```tsx
<SizeGuide />
```

---

## FASE 4 - PROFISSIONAL (Opcional)

### 16. Configurar Analytics
**Opcional:** Adicionar Google Analytics 4 ou Plausible.

```bash
npm install @plausible/analytics-react
```

### 17. Adicionar Monitoramento de Erros
**Opcional:** Configurar Sentry.

```bash
npm install @sentry/react
```

### 18. Implementar CI/CD
**Opcional:** Configurar GitHub Actions.

### 19. Expandir Testes
**Opcional:** Adicionar Playwright para E2E.

```bash
npm install -D @playwright/test
```

---

## ORDEM DE PRIORIDADE

1. **Proteger rota /admin** (CRÍTICO - segurança)
2. **Validar estoque real** (CRÍTICO - evitar overselling)
3. **Tratamento de timeout** (CRÍTICO - UX)
4. **Lazy loading** (IMPORTANTE - performance)
5. **Testar webhook** (IMPORTANTE - pagamentos)
6. **Dashboard métricas** (IMPORTANTE - admin)
7. **Exportação CSV** (IMPORTANTE - admin)
8. **Upload galeria** (IMPORTANTE - admin)
9. **Importação CSV** (IMPORTANTE - admin)
10. **Filtros pedidos** (IMPORTANTE - admin)
11. **Paginação** (UX - performance)
12. **Notificações** (UX - admin)
13. **Comprar novamente** (UX - cliente)
14. **Guia de medidas** (UX - cliente)
15. **Campo condition** (Opcional - se necessário)

---

## NOTAS IMPORTANTES

- **Variáveis de ambiente:** Verificar se `.env` está configurado com `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, e `MERCADO_PAGO_ACCESS_TOKEN` nas Edge Functions.
- **Storage bucket:** Verificar se bucket `product-images` existe no Supabase Storage.
- **RLS:** Testar políticas de segurança em produção antes de liberar.
- **Mercado Pago:** Verificar se conta está configurada em modo produção (não sandbox).
- **Deploy:** Vercel já configurado, basta fazer push para main.

---

## TESTES APÓS IMPLEMENTAÇÃO

1. Testar proteção de rota /admin (tentar acessar sem ser admin)
2. Testar lazy loading (abrir Network tab e verificar loading)
3. Testar validação de estoque (tentar comprar produto esgotado)
4. Testar timeout (simular demora no Mercado Pago)
5. Testar webhook (fazer pagamento de teste)
6. Testar dashboard métricas (verificar números corretos)
7. Testar exportação CSV (verificar formato)
8. Testar upload galeria (enviar múltiplas imagens)
9. Testar importação CSV (usar modelo correto)
10. Testar filtros de pedidos (filtrar por status/data)
