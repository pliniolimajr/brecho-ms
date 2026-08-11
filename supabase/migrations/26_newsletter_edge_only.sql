-- A newsletter passa a aceitar escrita somente pela Edge Function protegida.
REVOKE INSERT (name, email) ON public.newsletter_subscribers FROM anon, authenticated;

DROP POLICY IF EXISTS "Visitantes podem assinar newsletter"
ON public.newsletter_subscribers;

