import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const { user, isAdmin, loading, adminLoading } = useAuth();

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-[#FDF6F0] flex flex-col justify-center items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#C06A35] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs uppercase tracking-widest text-[#423226] font-medium">Verificando credenciais...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#FDF6F0] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-[#C06A35]/10 rounded-full flex items-center justify-center text-[#C06A35] mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <h1 className="text-3xl font-serif italic text-[#1A332B] mb-2">Acesso Restrito</h1>
        <p className="text-sm text-[#423226] max-w-md mb-8 leading-relaxed">
          Esta área é reservada exclusivamente para administradores da Palm CO. Sua conta não está registrada na lista de administradores.
        </p>
        <div className="flex gap-4">
          <Link
            to="/"
            className="px-6 py-3 bg-[#1A332B] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#C06A35] transition-colors"
          >
            Voltar para a Loja
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 border border-[#1A332B] text-[#1A332B] text-xs font-bold uppercase tracking-widest hover:bg-[#1A332B]/5 transition-colors"
          >
            Trocar de Conta
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;
