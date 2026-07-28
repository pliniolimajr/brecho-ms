import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

// Assuming this exists and has these props
const ProductCard = ({ product, onClick }: { product: any, onClick?: () => void }) => {
  return (
    <div className="border border-gray-100 p-4 cursor-pointer" onClick={onClick}>
      <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover mb-4" />
      <h3 className="text-sm font-semibold">{product.name}</h3>
      <p className="text-xs text-gray-500">R$ {product.price}</p>
    </div>
  )
}

interface ProfileFavoritesProps {
  user: User | null;
}

export function ProfileFavorites({ user }: ProfileFavoritesProps) {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Fetch wishlist items and join with products
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          id,
          product_id,
          products (*)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Extract products from the join
      const products = data ? data.map((item: any) => item.products).filter(p => p) : [];
      setFavorites(products);
    } catch (err: any) {
      console.error('Erro ao buscar favoritos:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 md:p-10 rounded border border-[#C06A35]/20 animate-fade-in-up min-h-[400px]">
      <h2 className="text-xl font-serif text-[#1A332B] mb-8 italic border-b border-[#C06A35]/20 pb-4">Favoritos</h2>
      
      {loading ? (
        <div className="text-center text-sm text-gray-500 py-10">Carregando seus favoritos...</div>
      ) : favorites.length === 0 ? (
        <div className="text-center text-sm text-gray-500 py-10 border border-dashed border-gray-200 rounded p-6">
          <p>Você ainda não tem produtos salvos como favoritos.</p>
          <button onClick={() => navigate('/catalogo')} className="inline-block mt-4 text-xs font-semibold uppercase tracking-widest text-[#C06A35] hover:text-[#1A332B] border-b border-[#C06A35] pb-1">Ver Produtos</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {favorites.map(product => (
            <ProductCard key={product.id} product={product} onClick={() => navigate(`/produto/${product.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
