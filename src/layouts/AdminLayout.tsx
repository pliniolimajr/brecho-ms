import { Outlet, Link, Navigate } from 'react-router-dom';
import { Package, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function AdminLayout() {
  const { session, loading, supabase } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6F0] flex items-center justify-center text-[#1A332B]">
        Carregando...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex min-h-screen bg-[#FDF6F0] text-[#423226] font-sans">
      <aside className="w-64 bg-[#F4E4D4] p-6 flex flex-col border-r border-[#C06A35]/30">
        <div className="text-2xl font-serif font-bold text-[#1A332B] mb-12">
          Brechó Admin
        </div>
        
        <nav className="flex-1 flex flex-col gap-2">
          <Link 
            to="/admin" 
            className="flex items-center gap-3 p-3 rounded bg-[#1A332B] text-[#FDF6F0] transition-colors"
          >
            <Package size={20} />
            Catálogo
          </Link>
          {/* Outras rotas administrativas no futuro */}
        </nav>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 text-[#1A332B] hover:bg-[#C06A35]/20 rounded transition-colors w-full text-left"
        >
          <LogOut size={20} />
          Sair
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}