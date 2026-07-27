# Auditoria Completa - Brechó MS E-commerce
## Análise Detalhada e Roadmap de Implementação

**Data:** Julho 2026  
**Status:** Projeto em desenvolvimento - MVP parcialmente implementado  
**Stack:** React + TypeScript + Vite + Supabase + Mercado Pago SDK

---

## 1. ARQUITETURA E INFRAESTRUTURA

### ✅ Já Implementado
- React 19.2.6 com TypeScript
- Vite para build e desenvolvimento
- TailwindCSS 4.3.0 para estilização
- Supabase para banco de dados e autenticação
- Zustand para state management
- React Router 7 para navegação
- Mercado Pago SDK instalado (@mercadopago/sdk-react)

### ⚠️ Problemas Críticos
- **Variáveis de ambiente não configuradas**: `.env` no gitignore, credenciais Supabase não definidas
- **Storage do Supabase não configurado**: Bucket `product-images` referenciado no AdminDashboard mas não criado
- **Mercado Pago não integrado**: SDK instalado mas não implementado no fluxo de checkout

### 📋 Ações Necessárias
1. Configurar variáveis de ambiente no `.env`
2. Criar bucket `product-images` no Supabase Storage
3. Implementar integração real com Mercado Pago API
4. Configurar políticas RLS do Supabase para produção
5. Implementar error handling global

---

## 2. MODELO DE DADOS E BANCO DE DADOS

### ✅ Schema Atual (Supabase)
```sql
- products (id, name, tagline, description, long_description, price, category, size, image_url, gallery[], features[], is_sold, created_at)
- orders (id, user_id, status, total_amount, payment_method, shipping_address, created_at)
- order_items (id, order_id, product_id, price)
- auth.users (Supabase Auth)
```

### ⚠️ Limitações do Schema Atual
1. **Campo `size` limitado**: Apenas PP, P, M, G, GG, ÚNICO - falta numeração (34, 36, 38, etc.)
2. **Sem campo `brand`**: Filtro de marca essencial para brechós
3. **Sem campo `condition`**: Novo com etiqueta, Seminovo, Usado
4. **Sem campo `color`**: Filtro por cor
5. **Sem campo `material`**: Algodão, Poliéster, Jeans, etc.
6. **Sem campo `measurements`**: Medidas específicas da peça
7. **Sem campo `stock_quantity`**: Sistema assume peça única, mas não escala
8. **Sem tabela `customers`**: Dados de cliente separados do auth
9. **Sem tabela `addresses`**: Para futuro envio
10. **Sem tabela `reviews`**: Avaliações de produtos
11. **Sem tabela `wishlist`**: Lista de desejos
12. **Sem tabela `coupons`**: Sistema de cupons
13. **Sem tabela `notifications`**: Sistema de notificações

### 📋 Ações Necessárias - Schema
```sql
-- Adicionar campos à tabela products
ALTER TABLE products ADD COLUMN brand TEXT;
ALTER TABLE products ADD COLUMN condition TEXT DEFAULT 'seminovo'; -- novo, seminovo, usado
ALTER TABLE products ADD COLUMN color TEXT[];
ALTER TABLE products ADD COLUMN material TEXT;
ALTER TABLE products ADD COLUMN measurements JSONB;
ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 1;

-- Criar tabela de customers
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT,
    cpf TEXT,
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de wishlist
CREATE TABLE wishlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Criar tabela de reviews
CREATE TABLE reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Criar tabela de coupons
CREATE TABLE coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL,
    min_purchase_amount NUMERIC(10, 2) DEFAULT 0,
    max_uses INTEGER DEFAULT NULL,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Criar tabela de notifications
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. AUTENTICAÇÃO E AUTORIZAÇÃO

### ✅ Já Implementado
- Login/Signup com email e senha
- OAuth com Google e Microsoft
- Hook `useAuth` para gerenciar sessão
- Proteção de rota `/minha-conta`

### ⚠️ Problemas
1. **Sem recuperação de senha**: Fluxo "esqueci minha senha" não implementado
2. **Sem verificação de email**: Opcional, mas recomendado para produção
3. **Sem perfis de usuário completos**: Apenas email básico do Supabase
4. **Sem roles/permissions**: Não há distinção entre cliente e admin
5. **Login admin não protegido**: Qualquer usuário pode acessar `/admin`

### 📋 Ações Necessárias
1. Implementar recuperação de senha via Supabase Auth
2. Criar sistema de roles (admin, customer)
3. Proteger rotas de admin com middleware de autorização
4. Criar página de edição de perfil completo
5. Adicionar campos de telefone, CPF, data de nascimento
6. Implementar verificação de email (opcional)

---

## 4. CATÁLOGO E BUSCA

### ✅ Já Implementado
- Listagem de produtos com cards
- Filtros: Categoria, Tamanho, Preço máximo, Ordenação
- Busca por categoria
- Responsivo com toggle de filtros no mobile

### ⚠️ Problemas Críticos
1. **Sem busca por texto**: Campo de pesquisa ausente
2. **Filtro de tamanho limitado**: Apenas PP-GG, falta numeração
3. **Sem filtro de marca**: Essencial para brechós
4. **Sem filtro de condição**: Novo, Seminovo, Usado
5. **Sem filtro de cor**: Importante para roupas
6. **Sem filtro de material**: Algodão, Jeans, etc.
7. **Galeria de imagens não usada**: Campo `gallery` existe mas não é exibido
8. **Sem paginação**: Todos os produtos carregados de uma vez
9. **Sem lazy loading nas imagens**: Performance ruim com muitos produtos

### 📋 Ações Necessárias
1. Implementar busca por texto (nome, descrição, marca)
2. Expandir filtros: Marca, Condição, Cor, Material
3. Adicionar tamanhos numéricos (34, 36, 38, 40, 42, 44, 46)
4. Implementar galeria de imagens no ProductDetail
5. Adicionar paginação ou infinite scroll
6. Implementar lazy loading em todas as imagens
7. Adicionar filtro de faixa de preço (mínimo e máximo)
8. Implementar "filtro rápido" na página do produto

---

## 5. PÁGINA DE PRODUTO

### ✅ Já Implementado
- Exibição de imagem principal
- Informações básicas (nome, categoria, preço, descrição)
- Botão "Colocar no Carrinho"
- Tag "Peça Única"
- Lista de features

### ⚠️ Problemas Críticos
1. **Galeria de imagens não funcional**: Apenas 1 imagem exibida
2. **Botão de compra não sticky no mobile**: UX ruim
3. **Sem produtos relacionados**: Cross-sell ausente
4. **Sem avaliações**: Clientes não veem reviews
5. **Sem contador de estoque**: "Últimas unidades"
6. **Sem guia de medidas**: Essencial para roupas
7. **Sem informações da marca**: Branding
8. **Sem sugestão de tamanho**: Baseado no histórico
9. **Sem botão de favoritar**: Wishlist ausente
10. **Sem compartilhamento social**: WhatsApp, Instagram

### 📋 Ações Necessárias
1. Implementar galeria de imagens com thumbnails e zoom
2. Tornar botão de Purchase sticky no mobile
3. Adicionar seção de produtos relacionados
4. Implementar sistema de avaliações
5. Adicionar contador de estoque visual
6. Criar guia de medidas/tabela de tamanhos
7. Adicionar informações da marca
8. Implementar botão de favoritar (wishlist)
9. Adicionar botões de compartilhamento
10. Implementar "recentemente visualizados"

---

## 6. CARRINHO DE COMPRAS

### ✅ Já Implementado
- Carrinho drawer lateral
- Adicionar/remover itens
- Bloqueio de peça única (não permite quantidade > 1)
- Navegação para checkout

### ⚠️ Problemas
1. **Sem persistência**: Carrinho perdido ao recarregar página
2. **Sem cálculo de frete**: Mesmo que seja grátis, deveria ser explícito
3. **Sem cupom de desconto**: Sistema ausente
4. **Sem estimativa de entrega**: "Retirada em X horas"
5. **Sem upsell no carrinho**: "Adicione mais para ganhar frete"
6. **Sem aviso de estoque**: Se produto vendido durante navegação

### 📋 Ações Necessárias
1. Implementar persistência do carrinho (localStorage)
2. Adicionar campo de cupom de desconto
3. Mostrar estimativa de tempo para retirada
4. Implementar verificação de estoque em tempo real
5. Adicionar sugestões de produtos no carrinho
6. Implementar recuperação de carrinho abandonado

---

## 7. CHECKOUT E PAGAMENTO

### ✅ Já Implementado
- Formulário de checkout one-page
- Coleta de dados básicos (nome, email, telefone)
- Seleção de método de pagamento (PIX, Cartão)
- Criação de pedido no banco
- Marcação de produtos como vendidos

### ⚠️ Problemas Críticos
1. **Mercado Pago NÃO integrado**: Apenas UI mock, sem processamento real
2. **Sem validação de formulário**: Campos básicos sem validação robusta
3. **Sem cálculo de taxas**: Taxas do Mercado Pago não consideradas
4. **Sem webhook de confirmação**: Status do pagamento não atualizado automaticamente
5. **Sem página de sucesso detalhada**: Apenas mensagem básica
6. **Sem instruções de retirada**: Onde, quando, como retirar
7. **Sem envio de email de confirmação**: Cliente não recebe confirmação
8. **Sem tratamento de erro de pagamento**: Falha silenciosa

### 📋 Ações Necessárias - Integração Mercado Pago
1. Criar conta no Mercado Pago e obter Access Token
2. Implementar criação de preferência de pagamento no backend
3. Integrar checkout PRO do Mercado Pago (PIX e Cartão)
4. Configurar webhook para receber notificações de pagamento
5. Atualizar status do pedido automaticamente via webhook
6. Implementar página de sucesso com QR Code do PIX
7. Criar página de falha de pagamento com retry
8. Enviar email de confirmação via Supabase Auth ou serviço externo
9. Implementar expiração de pedidos não pagos (30 min)
10. Adicionar instruções detalhadas de retirada (endereço, horário, contato)

---

## 8. GESTÃO DE PEDIDOS

### ✅ Já Implementado
- Painel admin com lista de pedidos
- Atualização de status do pedido
- Visualização de itens do pedido
- Informações do cliente

### ⚠️ Problemas
1. **Sem dashboard de métricas**: Vendas do dia/mês, ticket médio
2. **Sem exportação de pedidos**: CSV/Excel para gestão
3. **Sem filtros de pedidos**: Por período, status, método de pagamento
4. **Sem notificações de novo pedido**: Admin não é alertado
5. **Sem histórico de mudanças de status**: Audit trail ausente
6. **Sem impressão de nota/pedido**: Para retirada
7. **Sem integração com WhatsApp**: Contato automático com cliente

### 📋 Ações Necessárias
1. Criar dashboard com métricas (vendas, pedidos, ticket médio)
2. Implementar filtros avançados de pedidos
3. Adicionar exportação para CSV/Excel
4. Implementar sistema de notificações para admin
5. Criar audit trail de mudanças de status
6. Adicionar impressão de comprovante/pedido
7. Integrar com WhatsApp API para contato automático
8. Implementar gráficos de vendas por período

---

## 9. GESTÃO DE ESTOQUE (ADMIN)

### ✅ Já Implementado
- CRUD de produtos
- Upload de imagem única
- Marcar como vendido
- Listagem com status

### ⚠️ Problemas Críticos
1. **Upload de galeria não implementado**: Apenas imagem principal
2. **Sem edição em lote**: Não é possível editar múltiplos produtos
3. **Sem importação CSV**: Cadastro manual é lento
4. **Sem duplicação de produto**: Para peças similares
5. **Sem histórico de preços**: Não rastreia mudanças
6. **Sem alerta de estoque baixo**: Não aplicável (peça única)
7. **Sem categorização avançada**: Apenas categorias básicas
8. **Sem campos de marca/condição**: UI não existe
9. **Sem preview de imagem no upload**: UX ruim
10. **Sem validação de campos**: Pode salvar dados inválidos

### 📋 Ações Necessárias
1. Implementar upload de múltiplas imagens (galeria)
2. Adicionar campos de marca, condição, cor, material
3. Implementar importação em massa via CSV
4. Adicionar funcionalidade de duplicar produto
5. Criar histórico de preços
6. Implementar edição em lote
7. Adicionar preview de imagens durante upload
8. Implementar validação de formulário
9. Adicionar sugestão automática de preço baseado em similares
10. Criar sistema de tags para organização

---

## 10. EXPERIÊNCIA DO CLIENTE (CUSTOMER)

### ✅ Já Implementado
- Página "Minha Conta"
- Visualização de pedidos
- Logout

### ⚠️ Problemas
1. **Sem edição de perfil**: Cliente não pode atualizar dados
2. **Sem lista de desejos**: Wishlist ausente
3. **Sem histórico de visualização**: Não rastreia produtos vistos
4. **Sem avaliações de pedidos**: Cliente não pode avaliar
5. **Sem rastreamento de pedido**: Status básico apenas
6. **Sem reordenar**: Não pode repetir pedido
7. **Sem endereços salvos**: Para futuro envio

### 📋 Ações Necessárias
1. Criar página de edição de perfil completo
2. Implementar lista de desejos (wishlist)
3. Adicionar histórico de produtos visualizados
4. Implementar sistema de avaliações
5. Criar página de rastreamento detalhado
6. Adicionar botão "comprar novamente"
7. Implementar gestão de endereços (futuro)

---

## 11. CONTEÚDO E SEO

### ✅ Já Implementado
- Página Home com Hero, Features, About, Footer
- Design consistente com branding

### ⚠️ Problemas
1. **Sem página "Sobre nós" funcional**: Apenas seção na Home
2. **Sem página de Política de Trocas**: Essencial para brechó
3. **Sem FAQ**: Perguntas frequentes ausentes
4. **Sem página de Contato**: Formulário ou informações
5. **Sem blog/lookbook**: Conteúdo de moda ausente
6. **Sem meta tags SEO**: React SPA sem SSR
7. **Sem sitemap XML**: Para indexação
8. **Sem robots.txt**: Configuração de crawlers

### 📋 Ações Necessárias
1. Criar página "Sobre Nós" completa
2. Criar página de Política de Trocas e Devoluções
3. Criar página de FAQ
4. Criar página de Contato com formulário
5. Implementar blog/lookbook (opcional)
6. Adicionar meta tags básicas (title, description, og:image)
7. Configurar sitemap.xml (opcional, dado o modelo de negócio)
8. Adicionar robots.txt

---

## 12. PERFORMANCE E OTIMIZAÇÃO

### ⚠️ Problemas
1. **Sem lazy loading**: Imagens carregam todas de uma vez
2. **Sem otimização de imagens**: Sem WebP/AVIF
3. **Sem cache**: Requisições repetidas ao Supabase
4. **Sem code splitting**: Bundle monolítico
5. **Sem monitoramento de erros**: Sem Sentry ou similar
6. **Sem analytics**: Sem Google Analytics ou similar

### 📋 Ações Necessárias
1. Implementar lazy loading em todas as imagens
2. Configurar otimização de imagens (WebP, compressão)
3. Implementar cache com React Query ou SWR
4. Configurar code splitting por rota
5. Adicionar monitoramento de erros (Sentry)
6. Implementar analytics (Google Analytics 4 ou Plausible)

---

## 13. NOTIFICAÇÕES E COMUNICAÇÃO

### ⚠️ Problemas
1. **Sem email de confirmação**: Cliente não recebe nada
2. **Sem email de atualização de status**: Sem alertas
3. **Sem notificações push**: Web Push ausente
4. **Sem integração WhatsApp**: Sem mensagens automáticas
5. **Sem newsletter**: Captura de emails ausente

### 📋 Ações Necessárias
1. Configurar envio de emails via Supabase Auth ou Resend/SendGrid
2. Implementar templates de email (confirmação, atualização, etc.)
3. Criar sistema de notificações in-app
4. Integrar com WhatsApp Business API
5. Implementar captura de newsletter

---

## 14. SEGURANÇA

### ⚠️ Problemas
1. **RLS não testado**: Políticas podem estar permissivas
2. **Sem rate limiting**: API vulnerável a abuso
3. **Sem sanitização de inputs**: XSS possível
4. **Sem proteção CSRF**: Em formulários
5. **Sem logs de auditoria**: Não rastreia ações

### 📋 Ações Necessárias
1. Revisar e testar todas as políticas RLS
2. Implementar rate limiting no Supabase
3. Adicionar sanitização de inputs
4. Implementar proteção CSRF
5. Criar sistema de logs de auditoria

---

## 15. TESTES E QA

### ⚠️ Problemas
1. **Sem testes unitários**: Código sem testes
2. **Sem testes E2E**: Fluxos não testados
3. **Sem testes de integração**: API não testada
4. **Sem CI/CD**: Deploy manual

### 📋 Ações Necessárias
1. Implementar testes unitários com Vitest
2. Implementar testes E2E com Playwright
3. Criar testes de integração com Supabase
4. Configurar CI/CD com GitHub Actions

---

## ROADMAP PRIORITÁRIO

### FASE 1 - CRÍTICO (MVP Funcional) - 2-3 semanas
1. ✅ Configurar variáveis de ambiente
2. ✅ Criar bucket Storage no Supabase
3. ✅ Implementar galeria de imagens no ProductDetail
4. ✅ Integrar Mercado Pago (PIX e Cartão)
5. ✅ Configurar webhook de pagamento
6. ✅ Implementar página de sucesso com instruções de retirada
7. ✅ Adicionar campos marca/condição no schema e admin
8. ✅ Implementar busca por texto no catálogo
9. ✅ Tornar botão de compra sticky no mobile
10. ✅ Implementar persistência do carrinho

### FASE 2 - IMPORTANTE (UX Melhorada) - 2-3 semanas
1. Implementar filtros avançados (marca, condição, cor, material)
2. Adicionar tamanhos numéricos
3. Implementar lazy loading de imagens
4. Criar página de edição de perfil
5. Implementar lista de desejos (wishlist)
6. Adicionar produtos relacionados
7. Implementar sistema de avaliações
8. Criar dashboard de métricas no admin
9. Adicionar exportação de pedidos
10. Implementar notificações de novo pedido

### FASE 3 - COMPLETO (E-commerce Profissional) - 3-4 semanas
1. Implementar cupons de desconto
2. Criar páginas institucionais (Sobre, Política, FAQ, Contato)
3. Integrar WhatsApp Business
4. Implementar envio de emails
5. Adicionar sistema de notificações
6. Implementar importação CSV de produtos
7. Criar blog/lookbook
8. Adicionar analytics
9. Implementar monitoramento de erros
10. Configurar SEO básico

### FASE 4 - ESCALA (Crescimento) - Contínuo
1. Implementar testes automatizados
2. Configurar CI/CD
3. Otimizar performance
4. Implementar cache avançado
5. Criar sistema de recomendação
6. Implementar programa de fidelidade
7. Adicionar marketplace (vendedores externos)
8. Implementar app mobile

---

## ESTIMATIVA DE ESFORÇO

- **Fase 1 (Crítico):** 80-120 horas
- **Fase 2 (Importante):** 60-100 horas
- **Fase 3 (Completo):** 80-120 horas
- **Fase 4 (Escala):** 100+ horas (contínuo)

**Total para e-commerce funcional:** 220-340 horas (aprox. 2-3 meses com 1 desenvolvedor full-time)

---

## CONCLUSÃO

O projeto possui uma base sólida com design premium e arquitetura moderna. Os principais gargalos são:

1. **Integração de pagamento** (Mercado Pago não implementado)
2. **Galeria de imagens** (essencial para brechó online)
3. **Filtros avançados** (marca, condição, tamanhos numéricos)
4. **UX mobile** (botão de compra sticky)
5. **Persistência de dados** (carrinho, wishlist)

Com a implementação da Fase 1, o sistema já estará funcional para o modelo de negócio local (retirada presencial). As fases subsequentes elevam o projeto para um e-commerce profissional completo.
