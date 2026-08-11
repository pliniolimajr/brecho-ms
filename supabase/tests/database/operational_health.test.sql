BEGIN;
SELECT plan(4);

SELECT has_function('public', 'admin_operational_health', ARRAY[]::TEXT[],
  'admin_operational_health existe');
SELECT function_returns('public', 'admin_operational_health', ARRAY[]::TEXT[], 'jsonb',
  'admin_operational_health retorna jsonb');
SELECT function_privs_are('public', 'admin_operational_health', ARRAY[]::TEXT[], 'anon', ARRAY[]::TEXT[],
  'anon nao pode executar o resumo operacional');
SELECT function_privs_are('public', 'admin_operational_health', ARRAY[]::TEXT[], 'authenticated', ARRAY['EXECUTE'],
  'usuarios autenticados podem chamar a funcao, que valida o papel admin');

SELECT * FROM finish();
ROLLBACK;
