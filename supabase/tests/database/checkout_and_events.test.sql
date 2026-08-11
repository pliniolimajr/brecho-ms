BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(17);

INSERT INTO public.products (
  id, name, tagline, description, price, category, image_url, stock_quantity, is_sold
) VALUES
  ('10000000-0000-4000-8000-000000000001', 'Produto de teste 1', '', '', 100, 'Outros', 'https://example.com/1.jpg', 1, FALSE),
  ('10000000-0000-4000-8000-000000000002', 'Produto de teste 2', '', '', 150, 'Outros', 'https://example.com/2.jpg', 1, FALSE);

CREATE TEMP TABLE test_context (key TEXT PRIMARY KEY, value UUID);

INSERT INTO test_context
SELECT 'first_order', order_id
FROM public.create_order_with_stock_reservation(
  '[{"product_id":"10000000-0000-4000-8000-000000000001"}]'::JSONB,
  NULL,
  18.90,
  '{
    "firstName":"Maria","lastName":"Silva","email":"maria@example.com",
    "phone":"71999999999","cpf":"52998224725","postalCode":"40415115",
    "street":"Rua de Teste","number":"57","neighborhood":"Bonfim",
    "city":"Salvador","state":"BA"
  }'::JSONB
);

SELECT is(
  (SELECT stock_quantity FROM public.products WHERE id = '10000000-0000-4000-8000-000000000001'),
  0,
  'reservar pedido decrementa o estoque'
);
SELECT ok(
  (SELECT is_sold FROM public.products WHERE id = '10000000-0000-4000-8000-000000000001'),
  'última unidade fica indisponível'
);
SELECT is(
  (SELECT count(*)::INTEGER FROM public.order_items WHERE order_id = (SELECT value FROM test_context WHERE key = 'first_order')),
  1,
  'pedido e item são criados juntos'
);
SELECT throws_ok(
  $$ SELECT * FROM public.create_order_with_stock_reservation(
    '[{"product_id":"10000000-0000-4000-8000-000000000001"}]'::JSONB,
    NULL, 0,
    '{"firstName":"Maria","lastName":"Silva","email":"maria@example.com","phone":"71999999999","cpf":"52998224725","postalCode":"40415115","street":"Rua de Teste","number":"57","neighborhood":"Bonfim","city":"Salvador","state":"BA"}'::JSONB
  ) $$,
  'P0001',
  'O produto "Produto de teste 1" está esgotado.',
  'segunda reserva da última unidade é recusada'
);

SELECT ok(
  public.release_order_stock_reservation(
    (SELECT value FROM test_context WHERE key = 'first_order'),
    (SELECT checkout_token FROM public.orders WHERE id = (SELECT value FROM test_context WHERE key = 'first_order'))
  ),
  'reserva pendente pode ser liberada'
);
SELECT is(
  (SELECT stock_quantity FROM public.products WHERE id = '10000000-0000-4000-8000-000000000001'),
  1,
  'liberação devolve a unidade ao estoque'
);
SELECT is(
  (SELECT count(*)::INTEGER FROM public.orders WHERE id = (SELECT value FROM test_context WHERE key = 'first_order')),
  0,
  'pedido pendente liberado é removido'
);

INSERT INTO test_context
SELECT 'payment_order', order_id
FROM public.create_order_with_stock_reservation(
  '[{"product_id":"10000000-0000-4000-8000-000000000002"}]'::JSONB,
  NULL,
  0,
  '{
    "firstName":"João","lastName":"Souza","email":"joao@example.com",
    "phone":"71988888888","cpf":"52998224725","postalCode":"40415115",
    "street":"Rua de Teste","number":"10","neighborhood":"Bonfim",
    "city":"Salvador","state":"BA"
  }'::JSONB
);

SELECT is(
  (SELECT processed FROM public.process_payment_event(
    (SELECT value FROM test_context WHERE key = 'payment_order'),
    'payment-123', 'approved', 'credit_card', '{}'::JSONB
  )),
  TRUE,
  'primeiro webhook é processado'
);
SELECT is(
  (SELECT status FROM public.orders WHERE id = (SELECT value FROM test_context WHERE key = 'payment_order')),
  'paid',
  'pagamento aprovado marca pedido como pago'
);
SELECT is(
  (SELECT processed FROM public.process_payment_event(
    (SELECT value FROM test_context WHERE key = 'payment_order'),
    'payment-123', 'approved', 'credit_card', '{}'::JSONB
  )),
  FALSE,
  'webhook duplicado não é processado novamente'
);
SELECT is(
  (SELECT count(*)::INTEGER FROM public.payment_events WHERE payment_id = 'payment-123'),
  1,
  'webhook duplicado gera somente um evento'
);

UPDATE public.orders
SET status = 'shipped', tracking_code = 'AB123456789BR'
WHERE id = (SELECT value FROM test_context WHERE key = 'payment_order');
SELECT is(
  (SELECT count(*)::INTEGER FROM public.notification_jobs
   WHERE deduplication_key = 'order_shipped:' || (SELECT value::TEXT FROM test_context WHERE key = 'payment_order')),
  1,
  'pedido enviado gera uma notificação'
);

UPDATE public.orders
SET status = 'delivered'
WHERE id = (SELECT value FROM test_context WHERE key = 'payment_order');
SELECT is(
  (SELECT count(*)::INTEGER FROM public.notification_jobs
   WHERE deduplication_key = 'order_delivered:' || (SELECT value::TEXT FROM test_context WHERE key = 'payment_order')),
  1,
  'pedido entregue gera uma notificação'
);

SELECT is(
  (SELECT allowed FROM public.consume_api_rate_limit('test-endpoint', repeat('a', 64), 2, 60)),
  TRUE,
  'primeira chamada respeita o limite'
);
SELECT is(
  (SELECT allowed FROM public.consume_api_rate_limit('test-endpoint', repeat('a', 64), 2, 60)),
  TRUE,
  'segunda chamada ainda é permitida'
);
SELECT is(
  (SELECT allowed FROM public.consume_api_rate_limit('test-endpoint', repeat('a', 64), 2, 60)),
  FALSE,
  'chamada excedente é bloqueada'
);
SELECT ok(
  (SELECT retry_after FROM public.consume_api_rate_limit('test-endpoint', repeat('a', 64), 2, 60)) > 0,
  'bloqueio informa quando tentar novamente'
);

SELECT * FROM finish();
ROLLBACK;
