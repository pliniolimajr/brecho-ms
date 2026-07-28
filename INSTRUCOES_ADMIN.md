# 📖 Manual de Instruções do Administrador — Little Palm CO.

Bem-vindo ao guia prático de gerenciamento do Painel de Controle da sua loja! Aqui você aprenderá a gerenciar o estoque, atualizar pedidos, gerenciar cupons e acompanhar as métricas em poucos cliques.

---

## 💻 Como acessar o Painel
Acesse a rota administrativa adicionando `/admin` ao final do link da sua loja (ex: `localhost:5173/admin` no ambiente local).
No painel, você verá três abas principais no topo: **Estoque**, **Pedidos** e **Métricas**.

---

## 📦 1. Gerenciando o Estoque (Aba "Estoque")

### ➕ Adicionar um Produto Individualmente
1. No canto superior direito, clique em **+ Adicionar Produto**.
2. Preencha o formulário com os detalhes da peça:
   - **Nome:** Nome que aparecerá na vitrine (ex: *Vestido Midi Linho*).
   - **Tagline:** Um destaque opcional (ex: *Coleção de Primavera*).
   - **Preço:** Valor de venda do item.
   - **Categoria e Tamanho:** Selecione nos campos correspondentes.
   - **Imagem principal:** Clique em *Escolher arquivo* para enviar do seu computador ou cole o link direto de uma imagem na internet.
   - **Marca, Material, Cores:** Preencha os campos para facilitar os filtros da loja.
   - **Estoque:** Quantidade disponível para venda.
   - **Medidas:** Opcional (ex: *Cintura: 70cm, Comprimento: 110cm*).
   - **Descrição Curta e Longa:** Textos de apresentação da peça.
3. Clique em **Salvar** na base do formulário. O produto aparecerá imediatamente na vitrine da loja!

### 📝 Editar um Produto
1. Localize o produto na tabela da listagem de estoque.
2. Na coluna **Ações**, clique no botão **Editar** (ícone de lápis ou texto).
3. Modifique os campos que desejar no formulário e clique em **Salvar**.

### 🗑️ Excluir / Apagar um Produto
1. Localize o produto na tabela de estoque.
2. Na coluna **Ações**, clique no botão **Apagar** (texto vermelho).
3. Confirme na mensagem de alerta do seu navegador. A exclusão é imediata.

### 🔄 Marcar Produto como Vendido / Disponível Manualmente
1. Na tabela de estoque, clique no botão de status da peça (ex: *Disponível* ou *Vendido*).
2. Ele alternará automaticamente, ocultando ou exibindo o produto na vitrine pública.

### 📥 Importação Rápida em Massa (CSV)
Se você tiver dezenas de produtos para cadastrar de uma vez:
1. No banner informativo acima da tabela de estoque, clique no link **Baixar Modelo CSV**.
2. Abra este arquivo baixado no Excel, Google Sheets ou Bloco de Notas e preencha as linhas seguindo as colunas de exemplo.
3. Volte ao painel de controle e clique no botão **Importar CSV**.
4. Selecione o arquivo preenchido. O sistema cadastrará todas as peças em lote e atualizará a vitrine automaticamente!

---

## 🛒 2. Gerenciando Vendas e Pedidos (Aba "Pedidos")

### 📋 Acompanhar Novos Pedidos
- Todos os pedidos feitos por clientes aparecem organizados em ordem cronológica (os mais recentes no topo).
- Você pode visualizar:
  - O código reduzido do pedido (ex: `8F3A2B`).
  - O nome e WhatsApp de contato do cliente.
  - Os itens e tamanhos comprados.
  - O total pago e o método (PIX ou Cartão).

### 🚚 Atualizar o Status do Pedido
No canto direito de cada pedido, utilize o menu de seleção para atualizar a etapa:
- **Aguardando Pagamento:** O cliente gerou a preferência do Mercado Pago, mas ainda não concluiu a transação.
- **Pago (Pronto p/ Retirada):** O pagamento foi confirmado. Você já pode separar e embalar as peças físicas e deixar guardadas para a retirada do cliente.
- **Entregue / Retirado:** O cliente compareceu para retirar as peças e o pedido foi concluído.
- **Cancelado:** Pedidos não pagos expirados ou cancelados voluntariamente.

### 📊 Exportar Histórico de Vendas
Para contabilidade ou análise externa, clique em **Exportar CSV** no canto superior direito da aba de Pedidos. Uma planilha com todo o histórico será baixada imediatamente.

---

## 🏷️ 3. Métricas e Cupons (Aba "Métricas")

### 📈 Acompanhar o Desempenho Financeiro
No topo da aba de Métricas, você verá os seguintes indicadores baseados em pedidos pagos ou entregues:
- **Faturamento Total:** Soma de todas as vendas válidas.
- **Ticket Médio:** Valor médio que cada cliente gasta na sua loja por pedido.
- **Gráfico de Vendas Mensais:** Comparação visual do faturamento de cada mês.

### 🎟️ Gerenciamento de Cupons de Desconto
Role a página de Métricas até o final para acessar o painel de cupons:
- **Para Criar um Novo Cupom:**
  1. Clique em **+ Novo Cupom**.
  2. Digite o código desejado (ex: `PALM10`).
  3. Escolha o tipo de desconto: **Percentual** (ex: `10` para 10% de desconto) ou **Fixo** (ex: `20` para R$ 20,00 de desconto).
  4. Digite o **Valor Mínimo de Compra** (ex: `150` para exigir que o carrinho tenha R$ 150,00 ou mais para aplicar o cupom).
  5. Clique em **Criar Cupom**.
- **Desativar/Ativar Cupom:** Clique no botão verde de status (*Ativo/Inativo*) na tabela para pausar a utilização de um cupom instantaneamente sem excluí-lo.
- **Excluir Cupom:** Clique no botão vermelho de lixeira para remover permanentemente.
