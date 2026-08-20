-- BLOCO 6 - FUNCOES ADMINISTRATIVAS, PERMISSOES E AUDITORIA

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- As contas administrativas existentes pertencem ao proprietario da loja.
UPDATE public.admin_users SET role = 'owner' WHERE role IS NULL;
ALTER TABLE public.admin_users ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.admin_users ALTER COLUMN role SET DEFAULT 'operations';
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('owner', 'operations', 'support', 'finance'));

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_resource_idx ON public.admin_audit_log(resource_type, resource_id);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_admin_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.admin_users WHERE user_id = auth.uid() AND is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = TRUE);
$$;

DROP POLICY IF EXISTS "Usuarios podem verificar seu status de admin" ON public.admin_users;
DROP POLICY IF EXISTS "Usuários podem verificar seu status de admin" ON public.admin_users;
CREATE POLICY "Usuarios ativos verificam seu status de admin" ON public.admin_users
FOR SELECT TO authenticated USING (auth.uid() = user_id AND is_active = TRUE);

CREATE OR REPLACE FUNCTION public.has_admin_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_role TEXT := public.current_admin_role();
BEGIN
  IF v_role = 'owner' THEN RETURN TRUE; END IF;
  RETURN CASE p_permission
    WHEN 'catalog.read' THEN v_role IN ('operations', 'support', 'finance')
    WHEN 'catalog.manage' THEN v_role = 'operations'
    WHEN 'inventory.manage' THEN v_role = 'operations'
    WHEN 'orders.read' THEN v_role IN ('operations', 'support', 'finance')
    WHEN 'orders.manage' THEN v_role IN ('operations', 'support')
    WHEN 'shipping.manage' THEN v_role = 'operations'
    WHEN 'returns.manage' THEN v_role IN ('operations', 'support')
    WHEN 'refunds.manage' THEN v_role = 'finance'
    WHEN 'customers.read' THEN v_role IN ('operations', 'support', 'finance')
    WHEN 'carts.manage' THEN v_role IN ('operations', 'support')
    WHEN 'coupons.manage' THEN v_role IN ('operations', 'finance')
    WHEN 'reports.read' THEN v_role IN ('operations', 'finance')
    WHEN 'health.read' THEN v_role IN ('operations', 'finance')
    WHEN 'settings.manage' THEN FALSE
    WHEN 'team.manage' THEN FALSE
    WHEN 'audit.read' THEN FALSE
    ELSE FALSE
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.write_admin_audit(
  p_action TEXT, p_resource_type TEXT, p_resource_id TEXT DEFAULT NULL, p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), LEFT(p_action, 100), LEFT(p_resource_type, 80), LEFT(p_resource_id, 200), COALESCE(p_details, '{}'::JSONB))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

DROP POLICY IF EXISTS "Proprietario consulta auditoria" ON public.admin_audit_log;
CREATE POLICY "Proprietario consulta auditoria" ON public.admin_audit_log
FOR SELECT TO authenticated USING (public.has_admin_permission('audit.read'));

CREATE OR REPLACE FUNCTION public.admin_list_team()
RETURNS TABLE(id UUID, user_id UUID, email TEXT, role TEXT, is_active BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT au.id, au.user_id, au.email, au.role, au.is_active, au.created_at, au.updated_at
  FROM public.admin_users au WHERE public.has_admin_permission('team.manage') ORDER BY au.created_at;
$$;

CREATE OR REPLACE FUNCTION public.owner_add_admin(p_email TEXT, p_role TEXT)
RETURNS public.admin_users
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_user auth.users%ROWTYPE; v_admin public.admin_users%ROWTYPE;
BEGIN
  IF NOT public.has_admin_permission('team.manage') THEN RAISE EXCEPTION 'Somente o proprietario gerencia a equipe.' USING ERRCODE = '42501'; END IF;
  IF p_role NOT IN ('owner', 'operations', 'support', 'finance') THEN RAISE EXCEPTION 'Funcao administrativa invalida.'; END IF;
  SELECT * INTO v_user FROM auth.users WHERE lower(email) = lower(BTRIM(p_email));
  IF NOT FOUND THEN RAISE EXCEPTION 'O usuario precisa criar uma conta na loja antes de entrar na equipe.'; END IF;
  INSERT INTO public.admin_users(user_id, email, role, is_active, invited_by)
  VALUES (v_user.id, lower(v_user.email), p_role, TRUE, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, is_active = TRUE, updated_at = NOW()
  RETURNING * INTO v_admin;
  PERFORM public.write_admin_audit('team_member_added', 'admin_user', v_admin.id::TEXT, jsonb_build_object('role', p_role));
  RETURN v_admin;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_update_admin(p_admin_id UUID, p_role TEXT, p_is_active BOOLEAN)
RETURNS public.admin_users
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_admin public.admin_users%ROWTYPE; v_active_owners INTEGER;
BEGIN
  IF NOT public.has_admin_permission('team.manage') THEN RAISE EXCEPTION 'Somente o proprietario gerencia a equipe.' USING ERRCODE = '42501'; END IF;
  IF p_role NOT IN ('owner', 'operations', 'support', 'finance') THEN RAISE EXCEPTION 'Funcao administrativa invalida.'; END IF;
  SELECT * INTO v_admin FROM public.admin_users WHERE id = p_admin_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Administrador nao encontrado.'; END IF;
  SELECT COUNT(*) INTO v_active_owners FROM public.admin_users WHERE role = 'owner' AND is_active = TRUE;
  IF v_admin.user_id = auth.uid() AND NOT p_is_active THEN RAISE EXCEPTION 'Voce nao pode desativar sua propria conta.'; END IF;
  IF v_admin.role = 'owner' AND v_admin.is_active AND (p_role <> 'owner' OR NOT p_is_active) AND v_active_owners <= 1 THEN
    RAISE EXCEPTION 'A loja precisa manter ao menos um proprietario ativo.';
  END IF;
  UPDATE public.admin_users SET role = p_role, is_active = p_is_active, updated_at = NOW()
  WHERE id = p_admin_id RETURNING * INTO v_admin;
  PERFORM public.write_admin_audit('team_member_updated', 'admin_user', v_admin.id::TEXT,
    jsonb_build_object('role', p_role, 'is_active', p_is_active));
  RETURN v_admin;
END;
$$;

-- Corrige configuracoes e cupons que ainda aceitavam qualquer usuario autenticado.
DROP POLICY IF EXISTS "Permitir modificacao para usuarios autenticados" ON public.store_settings;
DROP POLICY IF EXISTS "Permitir modificação para usuários autenticados" ON public.store_settings;
CREATE POLICY "Proprietario gerencia configuracoes" ON public.store_settings FOR ALL TO authenticated
USING (public.has_admin_permission('settings.manage')) WITH CHECK (public.has_admin_permission('settings.manage'));

DROP POLICY IF EXISTS "Usuarios autenticados podem gerenciar cupons" ON public.coupons;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar cupons" ON public.coupons;
CREATE POLICY "Equipe autorizada gerencia cupons" ON public.coupons FOR ALL TO authenticated
USING (public.has_admin_permission('coupons.manage')) WITH CHECK (public.has_admin_permission('coupons.manage'));

DROP POLICY IF EXISTS "Administradores inserem produtos" ON public.products;
DROP POLICY IF EXISTS "Administradores atualizam produtos" ON public.products;
DROP POLICY IF EXISTS "Administradores excluem produtos" ON public.products;
CREATE POLICY "Equipe de operacao insere produtos" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission('catalog.manage'));
CREATE POLICY "Equipe de operacao atualiza produtos" ON public.products FOR UPDATE TO authenticated USING (public.has_admin_permission('catalog.manage')) WITH CHECK (public.has_admin_permission('catalog.manage'));
CREATE POLICY "Proprietario exclui produtos" ON public.products FOR DELETE TO authenticated USING (public.current_admin_role() = 'owner');

REVOKE ALL ON FUNCTION public.current_admin_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_admin_permission(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.write_admin_audit(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_team() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owner_add_admin(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owner_update_admin(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_admin_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.write_admin_audit(TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_team() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owner_add_admin(TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owner_update_admin(UUID, TEXT, BOOLEAN) TO authenticated, service_role;
