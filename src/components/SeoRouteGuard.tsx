import { useLocation } from 'react-router-dom';
import { Seo } from './Seo';

const PRIVATE_ROUTES = [
  '/admin', '/checkout', '/minha-conta', '/login',
  '/checkout-success', '/checkout-failure', '/checkout-pending',
  '/newsletter/descadastro',
];

export function SeoRouteGuard() {
  const { pathname } = useLocation();
  const isPrivate = PRIVATE_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
  if (!isPrivate) return null;

  return (
    <Seo
      title="Área reservada"
      description="Área operacional e reservada da Palm CO."
      path={pathname}
      noIndex
    />
  );
}
