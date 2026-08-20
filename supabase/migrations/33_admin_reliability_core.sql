-- BLOCO 1 - CONFIABILIDADE OPERACIONAL DO ADMIN

-- Produtos deixam de ser apagados da operacao normal e passam a ser arquivados.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "Produtos visíveis para todos" ON public.products;
DROP POLICY IF EXISTS "Produtos ativos visiveis para todos" ON public.products;
CREATE POLICY "Produtos ativos visiveis para todos"
ON public.products FOR SELECT TO anon, authenticated
USING (archived_at IS NULL);
CREATE POLICY "Administradores veem produtos arquivados"
ON public.products FOR SELECT TO authenticated
USING (public.is_admin());

CREATE INDEX IF NOT EXISTS products_active_created_at_idx
  ON public.products (created_at DESC)
  WHERE archived_at IS NULL;

-- A disponibilidade passa a ser derivada da quantidade, evitando estados contraditorios.
CREATE OR REPLACE FUNCTION public.sync_product_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.stock_quantity := GREATEST(COALESCE(NEW.stock_quantity, 0), 0);
  NEW.is_sold := NEW.stock_quantity = 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_product_availability_trigger ON public.products;
CREATE TRIGGER sync_product_availability_trigger
BEFORE INSERT OR UPDATE OF stock_quantity ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_product_availability();

UPDATE public.products
SET stock_quantity = CASE WHEN is_sold THEN 0 ELSE GREATEST(COALESCE(stock_quantity, 1), 1) END;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'manual_adjustment',
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_movements_product_created_idx
  ON public.inventory_movements(product_id, created_at DESC);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Administradores veem movimentacoes de estoque" ON public.inventory_movements;
CREATE POLICY "Administradores veem movimentacoes de estoque"
ON public.inventory_movements FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.record_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity THEN
    INSERT INTO public.inventory_movements (
      product_id, previous_quantity, new_quantity, delta, reason, changed_by
    ) VALUES (
      NEW.id,
      COALESCE(OLD.stock_quantity, 0),
      COALESCE(NEW.stock_quantity, 0),
      COALESCE(NEW.stock_quantity, 0) - COALESCE(OLD.stock_quantity, 0),
      COALESCE(NULLIF(current_setting('app.inventory_reason', TRUE), ''), 'system_adjustment'),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_inventory_movement_trigger ON public.products;
CREATE TRIGGER record_inventory_movement_trigger
AFTER UPDATE OF stock_quantity ON public.products
FOR EACH ROW EXECUTE FUNCTION public.record_inventory_movement();

-- Estados independentes: financeiro, atendimento, devolucao e situacao geral.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled',
  ADD COLUMN IF NOT EXISTS return_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS order_status TEXT NOT NULL DEFAULT 'open';

UPDATE public.orders SET
  payment_status = CASE
    WHEN status IN ('paid', 'shipped', 'delivered') THEN 'paid'
    WHEN status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END,
  fulfillment_status = CASE
    WHEN status = 'shipped' THEN 'shipped'
    WHEN status = 'delivered' THEN 'delivered'
    WHEN status = 'cancelled' THEN 'not_required'
    ELSE 'unfulfilled'
  END,
  order_status = CASE
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN status = 'delivered' THEN 'completed'
    ELSE 'open'
  END;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'in_process', 'paid', 'rejected', 'cancelled', 'refunded', 'partially_refunded', 'charged_back'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_status_check
  CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'not_required'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_return_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_return_status_check
  CHECK (return_status IN ('none', 'requested', 'approved', 'received', 'completed', 'rejected'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN ('open', 'completed', 'cancelled'));

CREATE TABLE IF NOT EXISTS public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_events_order_created_idx
  ON public.order_events(order_id, created_at DESC);
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Administradores veem eventos dos pedidos" ON public.order_events;
CREATE POLICY "Administradores veem eventos dos pedidos"
ON public.order_events FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.sync_legacy_order_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'pending' THEN
        NEW.payment_status := 'pending'; NEW.fulfillment_status := 'unfulfilled'; NEW.order_status := 'open';
      WHEN 'paid' THEN
        NEW.payment_status := 'paid'; NEW.fulfillment_status := 'processing'; NEW.order_status := 'open';
      WHEN 'shipped' THEN
        NEW.payment_status := 'paid'; NEW.fulfillment_status := 'shipped'; NEW.order_status := 'open';
      WHEN 'delivered' THEN
        NEW.payment_status := 'paid'; NEW.fulfillment_status := 'delivered'; NEW.order_status := 'completed';
      WHEN 'cancelled' THEN
        NEW.fulfillment_status := 'not_required'; NEW.order_status := 'cancelled';
      ELSE NULL;
    END CASE;

    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.order_events(order_id, event_type, title, details, actor_id, actor_email)
    VALUES (
      NEW.id,
      'status_changed',
      'Status alterado para ' || NEW.status,
      jsonb_build_object('from', OLD.status, 'to', NEW.status),
      auth.uid(),
      COALESCE(v_email, CASE WHEN auth.role() = 'service_role' THEN 'sistema' ELSE NULL END)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_legacy_order_status_trigger ON public.orders;
CREATE TRIGGER sync_legacy_order_status_trigger
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_order_status();

-- Atualizacao administrativa atomica e com regras de transicao.
CREATE OR REPLACE FUNCTION public.admin_transition_order_status(p_order_id UUID, p_new_status TEXT)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido nao encontrado.'; END IF;
  IF p_new_status = v_order.status THEN RETURN v_order; END IF;

  IF NOT (
    (v_order.status = 'pending' AND p_new_status = 'cancelled') OR
    (v_order.status = 'paid' AND p_new_status IN ('shipped', 'cancelled')) OR
    (v_order.status = 'shipped' AND p_new_status = 'delivered')
  ) THEN
    RAISE EXCEPTION 'Transicao de % para % nao permitida.', v_order.status, p_new_status;
  END IF;

  IF v_order.payment_status = 'paid' AND p_new_status = 'cancelled' THEN
    RAISE EXCEPTION 'Pagamento aprovado: realize o reembolso antes de cancelar o pedido.';
  END IF;

  UPDATE public.orders
  SET status = p_new_status,
      payment_status = CASE WHEN p_new_status = 'cancelled' THEN 'cancelled' ELSE payment_status END
  WHERE id = p_order_id
  RETURNING * INTO v_order;
  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_transition_order_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_transition_order_status(UUID, TEXT) TO authenticated, service_role;

-- Mantem o estado financeiro fiel ao retorno detalhado do Mercado Pago.
CREATE OR REPLACE FUNCTION public.sync_payment_event_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment_status TEXT;
BEGIN
  v_payment_status := CASE
    WHEN NEW.payment_status = 'approved' THEN 'paid'
    WHEN NEW.payment_status IN ('in_process', 'in_mediation') THEN 'in_process'
    WHEN NEW.payment_status = 'rejected' THEN 'rejected'
    WHEN NEW.payment_status IN ('cancelled', 'expired') THEN 'cancelled'
    WHEN NEW.payment_status = 'refunded' THEN 'refunded'
    WHEN NEW.payment_status = 'partially_refunded' THEN 'partially_refunded'
    WHEN NEW.payment_status = 'charged_back' THEN 'charged_back'
    ELSE 'pending'
  END;

  UPDATE public.orders SET payment_status = v_payment_status WHERE id = NEW.order_id;
  INSERT INTO public.order_events(order_id, event_type, title, details, actor_email)
  VALUES (
    NEW.order_id,
    'payment_status_changed',
    'Pagamento atualizado para ' || v_payment_status,
    jsonb_build_object('payment_id', NEW.payment_id, 'provider_status', NEW.payment_status),
    'Mercado Pago'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_payment_event_status_trigger ON public.payment_events;
CREATE TRIGGER sync_payment_event_status_trigger
AFTER INSERT ON public.payment_events
FOR EACH ROW EXECUTE FUNCTION public.sync_payment_event_status();
