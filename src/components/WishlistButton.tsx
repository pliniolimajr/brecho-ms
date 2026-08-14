import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './Toast';
import { useNavigate } from 'react-router-dom';

interface WishlistButtonProps {
  productId: string;
  className?: string;
}

/**
 * Botão de wishlist autônomo — gerencia seu próprio estado de favorito,
 * chama o Supabase diretamente e bloqueia propagação de clique para o card pai.
 */
export const WishlistButton: React.FC<WishlistButtonProps> = ({ productId, className }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsWishlisted(false);
      setWishlistId(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setIsWishlisted(true);
          setWishlistId(data.id);
        } else {
          setIsWishlisted(false);
          setWishlistId(null);
        }
      });
    return () => { cancelled = true; };
  }, [user, productId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede navegação para o produto
    e.preventDefault();

    if (!user) {
      showToast('Você precisa estar logado para salvar na sua lista de desejos.', 'warning');
      navigate('/login');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      if (isWishlisted && wishlistId) {
        await supabase.from('wishlists').delete().eq('id', wishlistId);
        setIsWishlisted(false);
        setWishlistId(null);
        showToast('Removido da sua lista de desejos.', 'info');
      } else {
        const { data, error } = await supabase
          .from('wishlists')
          .insert({ user_id: user.id, product_id: productId })
          .select('id')
          .single();

        if (!error && data) {
          setIsWishlisted(true);
          setWishlistId(data.id);
          showToast('Adicionado à sua lista de desejos!', 'success');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      title={isWishlisted ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
      className={`inline-flex items-center justify-center transition-all duration-200 disabled:opacity-50 ${className ?? ''}`}
      aria-label={isWishlisted ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
    >
      {isWishlisted ? (
        /* Ícone preenchido (salvo) */
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="block h-4 w-4 text-[#C06A35]">
          <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd" />
        </svg>
      ) : (
        /* Ícone vazio (não salvo) */
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="block h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
        </svg>
      )}
    </button>
  );
};
