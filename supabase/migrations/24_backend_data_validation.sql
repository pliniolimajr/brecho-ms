-- =========================================================================
-- FASE 2 - NORMALIZACAO E VALIDACAO DEFINITIVA NO BANCO
-- =========================================================================

CREATE OR REPLACE FUNCTION public.only_digits(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT regexp_replace(COALESCE(p_value, ''), '[^0-9]', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.is_valid_email(p_value TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT length(trim(COALESCE(p_value, ''))) BETWEEN 5 AND 254
    AND lower(trim(p_value)) ~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$';
$$;

CREATE OR REPLACE FUNCTION public.is_valid_cpf(p_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  v_cpf TEXT := public.only_digits(p_value);
  v_sum INTEGER := 0;
  v_digit INTEGER;
  i INTEGER;
BEGIN
  IF length(v_cpf) <> 11 OR v_cpf ~ '^([0-9])\1{10}$' THEN
    RETURN FALSE;
  END IF;

  FOR i IN 1..9 LOOP
    v_sum := v_sum + substring(v_cpf, i, 1)::INTEGER * (11 - i);
  END LOOP;
  v_digit := 11 - (v_sum % 11);
  IF v_digit >= 10 THEN v_digit := 0; END IF;
  IF v_digit <> substring(v_cpf, 10, 1)::INTEGER THEN RETURN FALSE; END IF;

  v_sum := 0;
  FOR i IN 1..10 LOOP
    v_sum := v_sum + substring(v_cpf, i, 1)::INTEGER * (12 - i);
  END LOOP;
  v_digit := 11 - (v_sum % 11);
  IF v_digit >= 10 THEN v_digit := 0; END IF;
  RETURN v_digit = substring(v_cpf, 11, 1)::INTEGER;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_customer_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.first_name := NULLIF(regexp_replace(trim(COALESCE(NEW.first_name, '')), '\s+', ' ', 'g'), '');
  NEW.last_name := NULLIF(regexp_replace(trim(COALESCE(NEW.last_name, '')), '\s+', ' ', 'g'), '');
  NEW.phone := NULLIF(public.only_digits(NEW.phone), '');
  NEW.cpf := NULLIF(public.only_digits(NEW.cpf), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_customer_data_trigger ON public.customers;
CREATE TRIGGER normalize_customer_data_trigger
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.normalize_customer_data();

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_valid_personal_data;
ALTER TABLE public.customers ADD CONSTRAINT customers_valid_personal_data CHECK (
  (first_name IS NULL OR char_length(first_name) BETWEEN 2 AND 80)
  AND (last_name IS NULL OR char_length(last_name) BETWEEN 2 AND 80)
  AND (phone IS NULL OR char_length(public.only_digits(phone)) IN (10, 11))
  AND (cpf IS NULL OR public.is_valid_cpf(cpf))
) NOT VALID;

CREATE OR REPLACE FUNCTION public.normalize_address_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.street := regexp_replace(trim(NEW.street), '\s+', ' ', 'g');
  NEW.number := regexp_replace(trim(NEW.number), '\s+', ' ', 'g');
  NEW.complement := NULLIF(regexp_replace(trim(COALESCE(NEW.complement, '')), '\s+', ' ', 'g'), '');
  NEW.neighborhood := regexp_replace(trim(NEW.neighborhood), '\s+', ' ', 'g');
  NEW.city := regexp_replace(trim(NEW.city), '\s+', ' ', 'g');
  NEW.state := upper(trim(NEW.state));
  NEW.zip_code := public.only_digits(NEW.zip_code);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_address_data_trigger ON public.addresses;
CREATE TRIGGER normalize_address_data_trigger
BEFORE INSERT OR UPDATE ON public.addresses
FOR EACH ROW EXECUTE FUNCTION public.normalize_address_data();

ALTER TABLE public.addresses DROP CONSTRAINT IF EXISTS addresses_valid_data;
ALTER TABLE public.addresses ADD CONSTRAINT addresses_valid_data CHECK (
  char_length(street) BETWEEN 1 AND 120
  AND char_length(number) BETWEEN 1 AND 20
  AND (complement IS NULL OR char_length(complement) <= 100)
  AND char_length(neighborhood) BETWEEN 1 AND 80
  AND char_length(city) BETWEEN 1 AND 80
  AND state IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')
  AND zip_code ~ '^[0-9]{8}$'
) NOT VALID;

CREATE OR REPLACE FUNCTION public.normalize_newsletter_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.name := regexp_replace(trim(NEW.name), '\s+', ' ', 'g');
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_newsletter_data_trigger ON public.newsletter_subscribers;
CREATE TRIGGER normalize_newsletter_data_trigger
BEFORE INSERT OR UPDATE ON public.newsletter_subscribers
FOR EACH ROW EXECUTE FUNCTION public.normalize_newsletter_data();

ALTER TABLE public.newsletter_subscribers DROP CONSTRAINT IF EXISTS newsletter_valid_data;
ALTER TABLE public.newsletter_subscribers ADD CONSTRAINT newsletter_valid_data CHECK (
  char_length(name) BETWEEN 2 AND 80 AND public.is_valid_email(email)
) NOT VALID;

CREATE OR REPLACE FUNCTION public.is_valid_shipping_address(p_address JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT jsonb_typeof(p_address) = 'object'
    AND char_length(trim(COALESCE(p_address->>'firstName', ''))) BETWEEN 2 AND 80
    AND char_length(trim(COALESCE(p_address->>'lastName', ''))) BETWEEN 2 AND 80
    AND public.is_valid_email(p_address->>'email')
    AND char_length(public.only_digits(p_address->>'phone')) IN (10, 11)
    AND public.is_valid_cpf(p_address->>'cpf')
    AND public.only_digits(p_address->>'postalCode') ~ '^[0-9]{8}$'
    AND upper(COALESCE(p_address->>'state', '')) IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')
    AND char_length(trim(COALESCE(p_address->>'street', ''))) BETWEEN 1 AND 120
    AND char_length(trim(COALESCE(p_address->>'number', ''))) BETWEEN 1 AND 20
    AND char_length(trim(COALESCE(p_address->>'neighborhood', ''))) BETWEEN 1 AND 80
    AND char_length(trim(COALESCE(p_address->>'city', ''))) BETWEEN 1 AND 80;
$$;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_valid_shipping_address;
ALTER TABLE public.orders ADD CONSTRAINT orders_valid_shipping_address
CHECK (public.is_valid_shipping_address(shipping_address)) NOT VALID;

ALTER TABLE public.abandoned_carts DROP CONSTRAINT IF EXISTS abandoned_carts_safe_payload;
ALTER TABLE public.abandoned_carts ADD CONSTRAINT abandoned_carts_safe_payload CHECK (
  jsonb_typeof(cart_items) = 'array'
  AND jsonb_array_length(cart_items) BETWEEN 1 AND 100
  AND octet_length(cart_items::TEXT) <= 50000
  AND jsonb_typeof(customer_info) = 'object'
  AND octet_length(customer_info::TEXT) <= 10000
  AND total_amount BETWEEN 0 AND 1000000
  AND status IN ('abandoned', 'recovered')
) NOT VALID;

DROP POLICY IF EXISTS "Usuários autenticados podem ver carrinhos abandonados" ON public.abandoned_carts;
CREATE POLICY "Administradores podem ver carrinhos abandonados"
ON public.abandoned_carts FOR SELECT TO authenticated
USING (public.is_admin());
