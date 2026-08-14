# Plano de Implementação das Melhorias — 2026

Este documento transforma as pendências identificadas em `AUDITORIA_FINAL_2026.md` e na revisão posterior do código em um plano de implementação ordenado por risco, dependências e impacto operacional.

A sequência recomendada é corrigir primeiro os riscos transacionais e de pagamento, estabelecer uma base confiável de qualidade técnica e, em seguida, evoluir SEO, performance e experiência de uso.

---

## Fase 0 — Preparação e baseline

### 0.1 Corrigir o pipeline de CI

- Trocar `npm install` por `npm ci`.
- Remover `|| echo "Lint warnings allowed"`.
- Tornar lint, testes e build obrigatórios.
- Separar os jobs:
  - lint;
  - testes unitários;
  - build;
  - E2E;
  - deploy.
- Adicionar cache do npm.
- Configurar deploy de preview em pull requests.
- Configurar deploy de produção somente na branch principal.

#### Critério de aceite

- Pull requests não podem ser integrados com lint, testes ou build falhando.

### 0.2 Zerar os erros de lint

Corrigir os erros por grupos:

1. Variáveis e imports não utilizados.
2. Substituição de `any` por interfaces.
3. Dependências incorretas em `useEffect`.
4. Funções declaradas depois de serem utilizadas.
5. Atualizações de estado desnecessárias dentro de efeitos.
6. Chamadas impuras durante renderização, como `Date.now()`.

#### Critério de aceite

Os comandos abaixo devem terminar com código zero:

```bash
npm run lint
npm run test
npm run build
```

---

## Fase 1 — Bloqueadores de produção

### 1. Estoque transacional

A validação atual no frontend deve permanecer apenas para feedback rápido. A garantia real precisa estar no banco.

#### Implementação

Criar uma RPC PostgreSQL, por exemplo:

```text
create_order_with_stock_reservation
```

Ela deve executar na mesma transação:

1. Receber cliente, produtos, cupom, endereço e valores.
2. Bloquear os produtos selecionados com `FOR UPDATE`.
3. Verificar disponibilidade e quantidade.
4. Validar novamente o cupom.
5. Criar o pedido.
6. Inserir os itens.
7. Reservar ou decrementar o estoque.
8. Incrementar o uso do cupom.
9. Retornar o pedido criado.

Adicionar campos ou tabela de reserva:

- `reserved_quantity`;
- `reservation_expires_at`;
- ou uma tabela `stock_reservations`.

Uma rotina agendada deve liberar reservas de pagamentos expirados.

Não permitir que o frontend altere diretamente `products.is_sold` ou quantidades de estoque.

#### Testes necessários

- Duas compras simultâneas do último item.
- Produto esgotado entre carrinho e checkout.
- Falha ao inserir um dos itens.
- Cupom esgotado durante a compra.
- Pagamento recusado liberando a reserva.
- Webhook duplicado.

#### Critério de aceite

- Somente uma compra consegue reservar a última unidade.
- Nenhum pedido parcial permanece em caso de falha.

### 2. Timeout e resiliência do Mercado Pago

#### Implementação

Na Edge Function `create-preference`:

- Aplicar `AbortController` com timeout de 10 segundos na chamada externa.
- Retornar HTTP 504 para timeout.
- Diferenciar erros:
  - entrada inválida: 400;
  - autenticação: 401/403;
  - indisponibilidade externa: 502;
  - timeout: 504;
  - erro interno: 500.
- Implementar retry curto somente para falhas transitórias e antes da criação confirmada.
- Usar uma chave de idempotência vinculada ao pedido.
- Não incluir token ou payload sensível nos logs.
- Validar o payload recebido com schema.

No frontend:

- Manter timeout um pouco maior que o backend.
- Exibir mensagem específica para timeout.
- Permitir nova tentativa usando o mesmo pedido e a mesma chave de idempotência.

#### Critério de aceite

- A função nunca fica aguardando indefinidamente.
- Uma repetição não gera duas preferências ou dois pedidos.

### 3. Webhook de pagamento

#### Implementação

- Validar a assinatura enviada pelo Mercado Pago.
- Validar `paymentId`, tópico e `external_reference`.
- Consultar o pagamento diretamente na API do Mercado Pago.
- Registrar eventos em uma tabela `payment_events`.
- Criar restrição única para impedir processamento duplicado.
- Atualizar pedido e estoque em uma transação.
- Responder:
  - `2xx` somente quando processado ou já processado;
  - `4xx` para payload inválido;
  - `5xx` para falha transitória, permitindo retry.
- Remover retorno 200 em exceções internas.
- Aplicar timeout à consulta do pagamento.
- Usar logs estruturados com `request_id`, `payment_id` e `order_id`.

#### Testes necessários

- Pagamento aprovado.
- Pagamento pendente.
- Pagamento recusado.
- Pagamento cancelado ou estornado.
- Webhook duplicado.
- Assinatura inválida.
- Pedido inexistente.
- Falha temporária no banco.
- Falha ou timeout do Mercado Pago.

#### Critério de aceite

- O mesmo evento pode chegar várias vezes sem duplicar efeitos.
- Falhas transitórias são reenviadas pelo provedor.

### 4. Notificações

#### Estrutura recomendada

Criar uma fila ou tabela `notification_jobs`:

```text
id
type
recipient
payload
status
attempts
last_error
scheduled_at
sent_at
created_at
```

Eventos iniciais:

- cadastro na newsletter;
- pedido criado;
- pagamento confirmado;
- pedido enviado;
- pedido entregue;
- pagamento recusado;
- carrinho abandonado;
- redefinição ou ação relevante de conta.

#### Implementação

- Validar o payload da função `send-email`.
- Nunca retornar “sucesso” simulado em produção sem chave.
- Criar templates responsivos.
- Escapar dados interpolados nos templates HTML.
- Adicionar retry com limite.
- Registrar erro e ID retornado pelo Resend.
- Implementar opt-out da newsletter.
- Incluir link de descadastro nos e-mails promocionais.
- Criar rotina agendada de recuperação de carrinho.
- Separar comunicações transacionais das promocionais.

#### Critério de aceite

- Cada disparo fica auditável.
- Falhas podem ser reenviadas.
- Newsletter e recuperação respeitam consentimento e descadastro.

---

## Fase 2 — Validação, erros e segurança

### 5. Schemas centralizados

Adicionar Zod e criar schemas para:

- checkout;
- cliente;
- endereço;
- cupom;
- produto;
- newsletter;
- avaliações;
- respostas das Edge Functions.

Reutilizar regras entre formulários quando possível.

#### Regras mínimas

- CPF matemático.
- E-mail normalizado e validado.
- Telefone com quantidade aceitável de dígitos.
- CEP com oito dígitos.
- UF pertencente à lista brasileira.
- Nomes e textos com limites de tamanho.
- Preços e quantidades não negativos.
- UUIDs válidos.
- Comentários e textos sem HTML arbitrário.

#### Critério de aceite

- Dados inválidos são recusados tanto no cliente quanto no backend.

### 6. Sanitização

- Remover espaços excessivos.
- Normalizar e-mail para lowercase.
- Persistir CPF, CEP e telefone em formato canônico.
- Escapar valores usados nos templates de e-mail.
- Escapar dados usados nas páginas de impressão do admin.
- Não usar HTML vindo do usuário com `dangerouslySetInnerHTML`.
- Adicionar limites de tamanho no banco.

> Queries parametrizadas do Supabase ajudam contra SQL injection, mas não resolvem XSS, HTML injection ou dados inconsistentes.

### 7. Tratamento centralizado de erros

Criar:

- `AppError` com código, mensagem pública e causa interna;
- conversor de erros do Supabase;
- cliente padronizado para Edge Functions;
- Error Boundary global;
- Error Boundaries para áreas críticas;
- páginas de erro e ação de “tentar novamente”.

Padronizar respostas das APIs:

```json
{
  "error": {
    "code": "PAYMENT_TIMEOUT",
    "message": "Não foi possível iniciar o pagamento.",
    "requestId": "..."
  }
}
```

Eliminar `alert()` e reduzir `console.error` no frontend.

#### Critério de aceite

- O cliente vê mensagens compreensíveis.
- Logs preservam detalhes técnicos sem expor segredos.

### 8. Rate limiting

Aplicar especialmente em:

- newsletter;
- criação de preferência;
- cálculo de frete;
- avaliações;
- recuperação de carrinho;
- consulta pública sensível;
- login, respeitando os controles já fornecidos pelo Supabase.

Chaves possíveis:

- usuário autenticado;
- IP;
- e-mail normalizado;
- combinação de endpoint e identificador.

#### Critério de aceite

- Abusos recebem HTTP 429 com `Retry-After`.
- Operações normais não são bloqueadas.

---

## Fase 3 — Testes automatizados

### 9. Testes unitários

Cobrir:

- CPF e e-mail;
- cálculo de cupom;
- cálculo de total;
- transformação de produtos;
- filtros;
- paginação;
- mapeamento de status;
- tratamento de erros.

### 10. Testes de integração

Usar um projeto Supabase local ou ambiente exclusivo de testes.

Cobrir:

- criação transacional do pedido;
- reserva e liberação de estoque;
- aplicação concorrente de cupom;
- políticas RLS;
- webhook idempotente;
- fila de notificações.

### 11. Playwright E2E

Fluxos prioritários:

1. Navegar e filtrar catálogo.
2. Abrir quick view.
3. Adicionar ao carrinho.
4. Checkout em três etapas.
5. CPF inválido.
6. Frete indisponível.
7. Produto esgotado.
8. Aplicar cupom.
9. Pagamento simulado.
10. Comprar novamente.
11. Login e perfil.
12. Acesso negado ao admin.
13. Admin filtrando e atualizando pedido.

#### Critério de aceite

- Fluxos críticos rodam na CI.
- Webhooks e pagamentos externos usam mocks controlados.

---

## Fase 4 — Admin, catálogo e carregamento

### 12. Filtros completos de pedidos

Adicionar:

- status, incluindo `shipped`;
- data inicial e final;
- valor mínimo e máximo;
- nome e e-mail do cliente;
- código do pedido;
- código de rastreio;
- forma de pagamento.

Para grandes volumes, migrar filtros e paginação para consultas no Supabase.

### 13. Paginação server-side

A paginação atual do catálogo apenas corta a lista já baixada.

Implementar:

- `.range(from, to)` no Supabase;
- contagem total;
- filtros aplicados no banco;
- ordenação no banco;
- debounce da busca;
- URLs com página e filtros;
- retorno automático à primeira página ao alterar filtros.

#### Critério de aceite

- O navegador recebe somente os produtos da página atual.

### 14. Loading states

Criar componentes reutilizáveis:

- `ProductCardSkeleton`;
- `ProductPageSkeleton`;
- `AdminDashboardSkeleton`;
- `TableSkeleton`;
- `ProfileSkeleton`.

Adicionar também:

- estado de erro;
- botão de tentar novamente;
- empty state;
- atualização em segundo plano sem apagar dados antigos.

---

## Fase 5 — SEO e indexação

### 15. Metadados dinâmicos

Adicionar `react-helmet-async` ou solução equivalente:

- título;
- descrição;
- canonical;
- Open Graph;
- Twitter Cards;
- `robots`;
- imagem social.

Aplicar em:

- home;
- catálogo;
- produto;
- páginas institucionais.

### 16. Structured data

Gerar JSON-LD para:

- `Organization`;
- `WebSite`;
- `BreadcrumbList`;
- `Product`;
- `Offer`;
- `AggregateRating`, somente com dados reais.

### 17. Sitemap e robots

- Criar `robots.txt`.
- Gerar `sitemap.xml`.
- Incluir páginas de produto ativas.
- Excluir checkout, conta, admin e retornos de pagamento.
- Definir página 404.

> Por ser uma SPA, SEO completo pode exigir prerenderização ou migração futura para um framework com SSR/SSG.

---

## Fase 6 — Imagens e performance

### 18. Pipeline de imagens

- Gerar versões WebP e AVIF.
- Criar tamanhos para card, quick view, produto e hero.
- Usar `srcset` e `sizes`.
- Definir `width` e `height` para evitar layout shift.
- Manter lazy loading abaixo da dobra.
- Usar `fetchpriority="high"` apenas na imagem principal do hero.
- Comprimir uploads antes ou durante o armazenamento.
- Validar MIME type, tamanho e dimensões.

### 19. CDN

- Confirmar cache/CDN do bucket público do Supabase.
- Definir `Cache-Control` longo para arquivos versionados.
- Usar transformação de imagens do Supabase ou serviço dedicado.
- Invalidar por nome versionado, sem reduzir agressivamente o cache.

### 20. Bundle e carregamento

O bundle principal encontrado durante a auditoria estava próximo de 477 kB antes de gzip.

- Analisar o bundle.
- Fazer lazy loading de SDKs e recursos administrativos.
- Carregar Mercado Pago somente no checkout.
- Remover dependências e assets não utilizados.
- Avaliar prefetch de rotas prováveis.

---

## Fase 7 — Monitoramento e operação

**Situação em 11/08/2026:** implementada e validada no código. O Sentry recebeu um erro real do frontend e o monitor de alta prioridade foi acionado. O envio de e-mail depende das preferências de notificação da conta no Sentry. O upload de source maps fica ativo automaticamente quando `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT` estiverem cadastradas no build da Vercel.

### 21. Sentry

Configurar no frontend e nas Edge Functions:

- exceções;
- source maps;
- versão do deploy;
- ambiente;
- performance sampling;
- remoção de CPF, e-mail, token e endereço dos eventos.

Entregue: captura global e operacional no frontend, ambiente, amostragem, versão baseada no commit da Vercel, redação recursiva de dados sensíveis e source maps privados com upload condicional. As Edge Functions usam logs JSON seguros no Supabase; elas não carregam o SDK de navegador do Sentry.

### 22. Analytics

Implementar ferramenta que respeite o consentimento do usuário:

- visualização de produto;
- adicionar ao carrinho;
- iniciar checkout;
- selecionar frete;
- aplicar cupom;
- redirecionar ao pagamento;
- compra confirmada;
- abandonar checkout.

Entregue: todos os eventos acima respeitam a escolha de cookies. O abandono é registrado ao sair da página, mas é descartado quando o fluxo segue corretamente para o Mercado Pago ou chega à confirmação.

### 23. Logs e alertas

Padronizar logs JSON:

```text
timestamp
level
service
request_id
user_id_hash
order_id
payment_id
event
duration_ms
```

Alertas essenciais:

- crescimento de pedidos pendentes;
- falha de webhook;
- falha de e-mail;
- timeout do Mercado Pago;
- erro de reserva de estoque;
- aumento de respostas 5xx.

Entregue: logs JSON nas funções críticas, monitor de erros no Sentry e aba administrativa **Saúde** para e-mails falhos/atrasados, pedidos vencidos e etiquetas falhas/travadas. Falhas de webhook, timeout do Mercado Pago, reserva de estoque e respostas 5xx aparecem com eventos padronizados nos logs das Edge Functions. Alertas externos sobre esses logs dependem de uma integração de logs/alertas do Supabase e não bloqueiam o beta.

---

## Fase 8 — Pendências funcionais e acabamento

### 24. Redes sociais

**Situação:** concluído. Instagram temporário configurado como `@aperte.f1`, WhatsApp centralizado e clicável, e TikTok ocultado enquanto não houver perfil oficial.

- Substituir `#` pelas URLs reais.
- Se ainda não existirem, ocultar os ícones.
- Usar `target="_blank"` e `rel="noopener noreferrer"`.

### 25. Assistant

**Situação:** concluído. Não havia mais componente, integração ou dependência Gemini ativa; o tipo residual de mensagens do chat foi removido.

Tomar uma decisão explícita:

- remover o código e a dependência Gemini; ou
- habilitar por meio de uma Edge Function segura.

A chave da API nunca deve ficar exposta no frontend.

### 26. CSS

**Situação:** base concluída. O tema escuro obsoleto foi removido e a identidade atual ganhou tokens globais para cores, fontes, sombra, raio, transição e foco. A adoção dos nomes semânticos nos componentes seguirá gradualmente para evitar alterações visuais em massa.

- Remover `variables.css` se estiver obsoleto; ou
- transformar as cores atuais em tokens usados globalmente.
- Eliminar cores repetidas hardcoded.
- Definir tokens para cor, espaçamento, raio, sombra e tipografia.

### 27. Comparador de produtos

**Situação:** concluído. Permite selecionar até três produtos, persiste a seleção localmente e compara preço, tamanho, material, cor e disponibilidade em desktop e mobile.

Implementar após os bloqueadores:

- até três produtos;
- persistência local;
- comparação por preço, tamanho, material, cor e disponibilidade;
- suporte mobile.

### 28. Acessibilidade e mobile

**Situação:** validação técnica concluída. Foco global visível, nomes acessíveis, labels dos formulários principais, contraste e semântica de diálogo foram corrigidos. Cards de produto, carrinho e comparador possuem fluxo equivalente pelo teclado; os diálogos prendem o foco, fecham com `Esc` e o restauram ao elemento de origem. Catálogo, produto em 375 px, carrinho, checkout, conta e admin passaram no axe sem violações graves. O fluxo principal passou sem rolagem horizontal em 320 px, 375 px, tablet e desktop. O Lighthouse local alcançou 100 em acessibilidade, 100 em SEO, 96 em boas práticas e 75 em desempenho; as requisições externas bloqueadas no ambiente local afetaram as duas últimas notas. Resta somente a confirmação visual humana na versão publicada, pois o navegador integrado não estava disponível nesta sessão.

- Realizar auditoria de teclado.
- Prender e restaurar foco em drawers e modais.
- Ligar labels e mensagens de erro aos inputs.
- Revisar contraste.
- Garantir áreas clicáveis mínimas.
- Verificar leitores de tela.
- Testar em 320 px, 375 px, tablet e desktop.
- Rodar Lighthouse e axe.

---

## Fase 9 — Direção de arte e experiência premium

**Objetivo:** elevar a percepção de valor da Palm CO. sem prejudicar velocidade, acessibilidade ou clareza de compra. A referência é uma experiência editorial de moda com identidade própria, e não a reprodução visual de outra marca.

**Premissas:**

- trabalhar com as fotografias comerciais autorizadas pelos fornecedores;
- não alterar digitalmente cor, tecido, modelagem ou caimento real das peças;
- criar consistência por enquadramento, proporção, fundo, espaçamento e hierarquia;
- projetar primeiro para celular e validar depois em tablet e desktop;
- cada mudança deve aumentar desejo, confiança ou facilidade de compra.

### 29. Sistema de direção visual

**Situação:** base implementada. Tokens de layout, tipografia editorial, mídia de produto e movimento foram centralizados; cards e galeria de produto já usam o padrão fotográfico. O modo de redução de movimento é respeitado globalmente e o fluxo de tratamento de imagens está documentado em `DIRECAO_VISUAL_FOTOGRAFIA.md`. A adoção nos demais componentes seguirá junto aos blocos correspondentes, evitando uma troca visual indiscriminada.

- consolidar escala tipográfica, espaçamento, largura de conteúdo e ritmo vertical;
- reduzir cores e medidas repetidas diretamente nos componentes;
- definir tratamentos oficiais para títulos, legendas, categorias, preços e chamadas;
- padronizar animações e respeitar `prefers-reduced-motion`;
- criar regras para fundos, proporções e enquadramentos das imagens de produto.

### 30. Página inicial editorial

**Situação:** implementada tecnicamente. A home passou a ter uma narrativa mais curta e editorial: hero com mensagem de curadoria, abertura institucional assimétrica, novidades com hierarquia refinada e caderno de estilo em português. O conteúdo institucional completo permanece na página Sobre, reduzindo o peso e a extensão da entrada. Falta apenas confirmação visual humana após o deploy.

- transformar o hero em abertura de campanha com mensagem mais curta e segura;
- organizar novidades, curadoria e manifesto como uma narrativa contínua;
- variar o ritmo da grade sem esconder informações essenciais de compra;
- melhorar transições entre seções e chamadas para o catálogo;
- revisar textos genéricos e reforçar a personalidade da Palm CO.

### 31. Catálogo com percepção premium

**Situação:** implementada tecnicamente. A abertura do acervo, busca, ordenação, painel fixo de filtros e contagem de resultados ganharam hierarquia editorial. No mobile, filtros são recolhíveis e exibem a quantidade ativa. Os cards priorizam fotografia, marca, nome, preço e tamanho; comparação e favoritos permanecem acessíveis, mas visualmente discretos. Skeletons usam a mesma proporção final e o marco principal duplicado foi removido. Falta apenas confirmação visual humana após o deploy.

- equilibrar densidade de produtos e respiro em cada resolução;
- reforçar hierarquia entre fotografia, nome, marca e preço;
- refinar filtros, ordenação, estados vazios e carregamento;
- manter comparação e favoritos discretos, porém acessíveis;
- garantir que imagens heterogêneas pareçam parte da mesma curadoria.

### 32. Página de produto e confiança

**Situação:** implementada tecnicamente. A galeria ganhou mais espaço e a área de decisão permanece visível no desktop. Disponibilidade, marca, tamanho, material, cor e caráter de peça única aparecem antes da ação principal. O estado de conservação e suas observações agora são campos estruturados, preenchidos manualmente no painel e exibidos sem inventar dados para o acervo antigo. Envio nacional, prazo de postagem e devolução em sete dias ficaram visíveis sem depender de acordeões; a política completa está ligada à página correspondente. A referência genérica de tamanhos é omitida para acessórios e calçados e não substitui medidas específicas. Produto esgotado não pode ser adicionado à sacola. Falta apenas confirmação visual humana após o deploy e aplicação da migration `31_product_condition.sql` no Supabase.

- dar protagonismo à galeria sem comprometer informações de compra;
- aprimorar composição, medidas, estado da peça, marca e materiais;
- tornar frete, disponibilidade e política de devolução mais fáceis de encontrar;
- revisar avaliações e produtos relacionados;
- preservar fidelidade visual entre fotografia e produto entregue.

### 33. Carrinho, checkout e pós-compra

**Situação:** implementada tecnicamente. A sacola ganhou hierarquia mais limpa, fotografia no padrão editorial e explicação do que será revisado no checkout. O checkout agora apresenta contexto antes das etapas, resumo fixo no desktop, imagens proporcionais, total e proteção do Mercado Pago com maior clareza. Os retornos aprovado, pendente e recusado compartilham uma linguagem visual consistente e mensagens objetivas. Em especial, uma recusa leva o cliente ao pedido existente em `Minha conta`, evitando encaminhá-lo para um checkout vazio depois que a sacola já foi limpa no redirecionamento. Falta apenas confirmação visual humana após o deploy.

- alinhar carrinho e checkout à linguagem editorial sem adicionar distrações;
- reforçar total, frete, prazo e próxima ação;
- revisar mensagens de erro, pagamento pendente, aprovado e recusado;
- manter a experiência rápida, previsível e acessível.

### 34. Fluxo de tratamento fotográfico

**Situação:** implementada. O padrão de proporções, resolução, formatos, peso, recorte, ordem das imagens, tratamentos permitidos e tratamentos proibidos está documentado em `DIRECAO_VISUAL_FOTOGRAFIA.md`. O painel converte os arquivos enviados para WebP e aplica validação de tipo e tamanho. A confirmação de autorização de uso continua sendo uma responsabilidade operacional antes de cada publicação.

- documentar dimensões, proporções, formatos e peso máximo;
- criar um processo repetível de recorte, margem e compressão;
- separar imagem principal, imagem em modelo e detalhes da peça;
- registrar autorização de uso das imagens fornecidas;
- rejeitar edições que alterem características comerciais do produto.

### 35. Validação da experiência premium

**Situação:** validação técnica concluída. Lint, 46 testes unitários, build e os 21 fluxos Playwright foram aprovados. Axe não encontrou violações graves nas telas auditadas; teclado, foco, estrutura para leitores de tela e ausência de rolagem horizontal foram verificados em 320 px, 375 px, tablet e desktop. No Lighthouse local final, a home atingiu 79 em desempenho e 100 em acessibilidade, boas práticas e SEO, com LCP de 4,3 s, TBT de 10 ms e CLS igual a zero. Permanecem como validações humanas: revisão visual após deploy, teste com pessoas externas e acompanhamento contínuo das métricas reais de produção.

- comparar antes e depois em 320 px, 375 px, tablet e desktop;
- validar contraste, teclado, leitor de tela e redução de movimento;
- repetir Lighthouse, axe, testes e build;
- realizar teste com pessoas externas antes do lançamento definitivo;
- acompanhar conversão, abandono de checkout e erros no Sentry.

### Ordem dos blocos da Fase 9

| Bloco | Entrega |
|---|---|
| 1 | Sistema visual e regras fotográficas |
| 2 | Página inicial editorial |
| 3 | Catálogo e cards de produto |
| 4 | Página de produto |
| 5 | Carrinho, checkout e pós-compra |
| 6 | Validação visual, acessibilidade e desempenho |

---

## Ordem recomendada de execução

| Ciclo | Entregas |
|---|---|
| 1 | CI obrigatório, lint e tipagem |
| 2 | RPC transacional de estoque e pedidos |
| 3 | Mercado Pago, timeout, idempotência e webhook |
| 4 | Fila e templates de notificações |
| 5 | Schemas, sanitização, Error Boundary e rate limiting |
| 6 | Testes unitários, integração e Playwright |
| 7 | Filtros, paginação server-side e skeletons |
| 8 | SEO, sitemap e structured data |
| 9 | Imagens, CDN, bundle e monitoramento |
| 10 | Redes sociais, CSS, Assistant, comparador e acessibilidade |

---

## Definição global de pronto

Uma melhoria somente deve ser considerada concluída quando:

- estiver implementada no frontend e no backend aplicável;
- possuir validação de entrada;
- tratar falhas;
- tiver testes automatizados;
- passar por lint, testes e build;
- não expuser segredos ou dados pessoais;
- estiver documentada;
- possuir logs ou métricas suficientes para diagnóstico.

---

## Prioridade imediata

A primeira entrega deve concentrar-se em:

1. CI e qualidade obrigatória.
2. Estoque transacional.
3. Pagamento e timeout.
4. Webhook seguro e idempotente.
5. Notificações auditáveis.

Esses itens reduzem os maiores riscos financeiros e operacionais do sistema.
