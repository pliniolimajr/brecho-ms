BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(3);

SELECT throws_ok(
  $$ SELECT public.admin_list_orders() $$,
  '42501',
  'Acesso restrito a administradores.',
  'cliente sem permissão não consulta pedidos administrativos'
);

INSERT INTO auth.users (id, aud, role, email)
VALUES ('90000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'admin-pagination@example.com');
INSERT INTO public.admin_users (user_id, email)
VALUES ('90000000-0000-4000-8000-000000000001', 'admin-pagination@example.com');
SELECT set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', TRUE);

INSERT INTO public.orders (id, user_id, status, total_amount, payment_method, shipping_address, created_at)
VALUES
  ('91000000-0000-4000-8000-000000000001', NULL, 'paid', 100, 'pix', '{"firstName":"Maria","lastName":"Silva","email":"maria@example.com","phone":"71999999999","cpf":"52998224725","postalCode":"40415115","street":"Rua Um","number":"10","neighborhood":"Bonfim","city":"Salvador","state":"BA"}', NOW()),
  ('91000000-0000-4000-8000-000000000002', NULL, 'pending', 200, 'credit_card', '{"firstName":"João","lastName":"Souza","email":"joao@example.com","phone":"71888888888","cpf":"11144477735","postalCode":"40415115","street":"Rua Dois","number":"20","neighborhood":"Bonfim","city":"Salvador","state":"BA"}', NOW() - INTERVAL '1 day');

SELECT is(
  (public.admin_list_orders(p_page => 1, p_page_size => 1)->>'total')::INTEGER,
  2,
  'consulta informa o total antes da paginação'
);

SELECT is(
  jsonb_array_length(public.admin_list_orders(p_status => 'paid')->'orders'),
  1,
  'filtro de status é aplicado no banco'
);

SELECT * FROM finish();
ROLLBACK;
