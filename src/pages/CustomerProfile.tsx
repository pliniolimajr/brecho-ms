import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabaseClient';
import { Navigate, useNavigate } from 'react-router-dom';
import { ProfileData } from '../features/customer/ProfileData';
import { ProfileAddresses } from '../features/customer/ProfileAddresses';
import { ProfileOrders } from '../features/customer/ProfileOrders';
import { ProfileFavorites } from '../features/customer/ProfileFavorites';
import { ProfileBalances } from '../features/customer/ProfileBalances';

export function CustomerProfile() {
  const { session, user, isAdmin, loading, supabase: sb } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'favorites' | 'orders' | 'balances' | 'addresses'>('profile');
  const [customer, setCustomer] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCustomerProfile();
    }
  }, [user]);

  const fetchCustomerProfile = async () => {
    if (!user) return;
    setLoadingProfile(true);
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setCustomer(data);
    } else {
      // Create profile if doesn't exist (failsafe, should be handled by trigger)
      const googleFirstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || user.user_metadata?.name?.split(' ')[0] || '';
      const googleLastName = user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || user.user_metadata?.name?.split(' ').slice(1).join(' ') || '';
      
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({ 
          user_id: user.id,
          first_name: googleFirstName,
          last_name: googleLastName,
        })
        .select()
        .single();
      if (newCustomer) {
        setCustomer(newCustomer);
      }
    }
    setLoadingProfile(false);
  };

  if (loading || loadingProfile) {
    return <div className="min-h-screen bg-[#FDF6F0] flex items-center justify-center">Carregando...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogout = async () => {
    await sb.auth.signOut();
    navigate('/');
  };

  const displayName = 
    customer?.first_name || 
    user?.user_metadata?.first_name || 
    user?.user_metadata?.full_name?.split(' ')[0] || 
    user?.user_metadata?.name?.split(' ')[0] || 
    user?.email;

  const tabs = [
    { id: 'profile', label: 'Dados Pessoais' },
    { id: 'favorites', label: 'Favoritos' },
    { id: 'orders', label: 'Meus pedidos' },
    { id: 'balances', label: 'Meus saldos' },
    { id: 'addresses', label: 'Meus endereços' },
  ];

  return (
    <div className="min-h-screen bg-[#FDF6F0] pt-32 pb-24 px-6 md:px-12">
      <div className="max-w-[1400px] mx-auto">
        <header className="mb-12 text-center md:text-left">
          <h1 className="text-4xl font-serif text-[#1A332B] mb-2">Minha Conta</h1>
          <p className="text-[#423226]">Olá, <span className="font-semibold">{displayName}</span></p>
        </header>

        <div className="flex flex-col md:flex-row gap-12">
          {/* Sidebar Menu */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <nav className="flex flex-col space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`text-left px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                    activeTab === tab.id 
                      ? 'border-[#C06A35] text-[#1A332B] bg-white' 
                      : 'border-transparent text-gray-500 hover:text-[#1A332B] hover:bg-white/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <div className="my-2 border-t border-gray-200"></div>
              <button
                onClick={handleLogout}
                className="text-left px-4 py-3 text-sm font-medium text-gray-500 hover:text-[#1A332B] transition-colors border-l-2 border-transparent"
              >
                Sair
              </button>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {activeTab === 'profile' && <ProfileData user={user} customerData={customer} fetchProfile={fetchCustomerProfile} />}
            {activeTab === 'addresses' && <ProfileAddresses user={user} />}
            {activeTab === 'orders' && <ProfileOrders user={user} />}
            {activeTab === 'favorites' && <ProfileFavorites user={user} />}
            {activeTab === 'balances' && <ProfileBalances storeCredit={customer?.store_credit} />}
          </main>
        </div>
      </div>
    </div>
  );
}
