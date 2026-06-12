# Configuração do Supabase - Brechó MS

Siga este passo a passo para linkar o seu novo projeto do Supabase com o código do brechó e criar as tabelas necessárias com os campos exatos que o nosso frontend precisa.

## 1. Criando as Tabelas (Código SQL)

No painel do seu projeto no Supabase, vá no menu lateral esquerdo e clique em **SQL Editor**. 
Abra uma **New query**, cole o código abaixo e clique no botão **Run** (ou aperte Cmd/Ctrl + Enter):

```sql
-- 1. Criar tabela de Produtos (Catálogo)
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    long_description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    category TEXT NOT NULL,
    size TEXT,
    image_url TEXT NOT NULL,
    gallery TEXT[], -- Array para suportar a nossa nova galeria de imagens!
    features TEXT[], -- Array para as listagens de detalhes
    is_sold BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Criar tabela de Pedidos
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Relaciona com o login (mas permite compra como visitante se quiser)
    status TEXT DEFAULT 'pending' NOT NULL, -- Status: pending, paid, ready_for_pickup, completed
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    shipping_address JSONB, -- Aqui vamos salvar o nome e telefone de quem vai retirar
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Criar tabela de Itens do Pedido (Relacionamento Produto x Pedido)
CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    price NUMERIC(10, 2) NOT NULL
);

-- ==========================================
-- REGRAS DE SEGURANÇA BÁSICAS (RLS)
-- ==========================================

-- Produtos: Qualquer um pode ler (para a vitrine funcionar), mas ninguém pode inserir pelo site (só via painel admin que faremos depois).
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Produtos visíveis para todos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Apenas admin modifica produtos" ON public.products FOR ALL USING (auth.role() = 'service_role'); -- Por segurança

-- Pedidos: Qualquer um (visitante ou logado) pode criar um pedido.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clientes podem criar pedidos" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuários veem seus próprios pedidos" ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- Itens do Pedido: Qualquer um pode inserir itens no pedido que acabou de criar.
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clientes inserem itens no pedido" ON public.order_items FOR INSERT WITH CHECK (true);
```

---

## 2. Linkando o Banco de Dados com o seu Código (VS Code)

1. No painel do Supabase, clique na engrenagem **Project Settings** (lá embaixo, na esquerda).
2. No menu que abrir, clique em **API**.
3. Você verá dois valores muito importantes:
   * **Project URL** (Geralmente começa com `https://xxxxxx.supabase.co`)
   * **Project API Keys** -> Copie a chave que tem a tag `anon` `public` (NÃO copie a secret/service_role).
4. Volte para o VS Code do seu projeto.
5. Você verá um arquivo chamado `.env.example`. **Renomeie ele para `.env`** (ou crie um novo chamado `.env`).
6. Cole as credenciais nele exatamente assim:

```env
VITE_SUPABASE_URL=cole_sua_url_aqui
VITE_SUPABASE_ANON_KEY=cole_sua_anon_key_aqui
```

---

## 3. Configurando o Login (Autenticação)

Como o nosso código de `Login.tsx` usa E-mail, Google e Microsoft, precisamos habilitar isso no Supabase:

1. Vá no menu lateral esquerdo e clique em **Authentication** (ícone de usuários com engrenagem).
2. Clique na aba **Providers**.
3. **Email:** Clique em "Email" e certifique-se de que está "Enabled". 
   * *Dica:* Para facilitar os testes agora no início, desative a opção "Confirm email". Assim, quando criarmos uma conta, já entramos direto sem precisar ir na caixa de entrada verificar.
4. **Google / Microsoft (Opcional por enquanto):** Se quiser testar o botão "Entrar com Google" do código, você precisará ativar o Provider do Google e colar o *Client ID* (isso nós teremos que gerar no console do Google depois. Recomendo focar no email primeiro e depois habilitamos isso).

Pronto! Ao terminar o passo 2, o código do React já estará conectado com o seu banco de dados na nuvem!
