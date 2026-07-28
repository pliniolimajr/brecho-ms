import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabaseClient';
import ProductCard from './ProductCard';
import type { Product } from '../types';

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product) => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, onBack, onAddToCart }) => {
  const navigate = useNavigate();
  const { products } = useStore();

  const relatedProducts = React.useMemo(() => {
    let list = products.filter(p => p.id !== product.id && !p.isSold);
    const sameCategory = list.filter(p => p.category === product.category);
    if (sameCategory.length > 0) {
      return sameCategory.slice(0, 3);
    }
    return list.slice(0, 3);
  }, [products, product]);

  const allImages = [product.imageUrl, ...(product.gallery || [])].filter(Boolean);
  const [currentImage, setCurrentImage] = useState(allImages[0]);

  const { user } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistId, setWishlistId] = useState<string | null>(null);

  const checkWishlist = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle();

    if (data) {
      setIsWishlisted(true);
      setWishlistId(data.id);
    } else {
      setIsWishlisted(false);
      setWishlistId(null);
    }
  };

  useEffect(() => {
    checkWishlist();
  }, [user, product.id]);

  const handleWishlistToggle = async () => {
    if (!user) {
      alert('Você precisa estar logado para salvar itens na sua lista de desejos.');
      navigate('/login');
      return;
    }

    if (isWishlisted && wishlistId) {
      await supabase.from('wishlists').delete().eq('id', wishlistId);
      setIsWishlisted(false);
      setWishlistId(null);
    } else {
      const { data, error } = await supabase
        .from('wishlists')
        .insert({ user_id: user.id, product_id: product.id })
        .select('id')
        .single();

      if (!error && data) {
        setIsWishlisted(true);
        setWishlistId(data.id);
      }
    }
  };

  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchReviews = async () => {
    setLoadingReviews(true);
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false });
    if (data) {
      setReviews(data);
    }
    setLoadingReviews(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [product.id]);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Você precisa estar logado para avaliar.');
      navigate('/login');
      return;
    }
    setSubmittingReview(true);
    const { error } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        product_id: product.id,
        rating: newRating,
        comment: newComment,
      });

    if (error) {
      alert('Erro ao enviar avaliação: ' + error.message);
    } else {
      setNewComment('');
      setNewRating(5);
      fetchReviews();
    }
    setSubmittingReview(false);
  };

  return (
    <div className="pt-24 min-h-screen bg-[#FDF6F0] animate-fade-in-up">
      <div className="max-w-[1800px] mx-auto px-6 md:px-12 pb-24">

        {/* Breadcrumb / Back */}
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#A8A29E] hover:text-[#1A332B] transition-colors mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Voltar para a Loja
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">

          {/* Left: Image Gallery */}
          <div className="flex flex-col gap-4">
            <div className="w-full aspect-[4/5] bg-[#F4E4D4] overflow-hidden relative">
              <img
                src={currentImage}
                alt={product.name}
                loading="lazy"
                className="w-full h-full object-cover animate-fade-in-up"
              />
              <span className="absolute top-4 right-4 bg-[#FDF6F0] text-[#1A332B] text-xs font-bold uppercase tracking-widest px-3 py-1 shadow-md">
                Novidade
              </span>
            </div>

            {allImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(img)}
                    className={`flex-shrink-0 w-24 aspect-[4/5] overflow-hidden border-2 transition-colors ${currentImage === img ? 'border-[#1A332B]' : 'border-transparent hover:border-[#1A332B]/50'}`}
                  >
                    <img src={img} alt={`Thumb ${idx}`} loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="flex flex-col justify-center max-w-xl bg-[#FAF9F6] border border-[#C06A35]/15 p-8 md:p-12 shadow-sm rounded-sm">
            <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em] mb-2">{product.category}</span>
            <h1 className="text-3xl md:text-4xl font-serif italic text-[#1A332B] mb-4 leading-tight">{product.name}</h1>
            <span className="text-xl font-semibold text-[#1A332B] block border-b border-[#C06A35]/20 pb-6 mb-6">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>

            {/* Collapsible details inspired by Shoulder */}
            <div className="space-y-4 mb-8">
              <details className="group border-b border-[#C06A35]/10 pb-3" open>
                <summary className="flex justify-between items-center font-serif text-base text-[#1A332B] cursor-pointer list-none">
                  <span>Composição e Medidas</span>
                  <span className="transition-transform group-open:rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </span>
                </summary>
                <div className="mt-4 text-xs font-light text-[#423226] leading-relaxed space-y-2">
                  <p>{product.longDescription || product.description}</p>
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 pt-4 border-t border-[#C06A35]/10">
                    <li className="flex justify-between py-1">
                      <span className="font-medium text-[#A8A29E] uppercase tracking-wider text-[9px]">Tamanho:</span>
                      <span className="font-semibold">{product.size || 'Único'}</span>
                    </li>
                    <li className="flex justify-between py-1">
                      <span className="font-medium text-[#A8A29E] uppercase tracking-wider text-[9px]">Marca:</span>
                      <span className="font-semibold">{product.brand || 'Palm CO.'}</span>
                    </li>
                    {product.color && product.color.length > 0 && (
                      <li className="flex justify-between py-1">
                        <span className="font-medium text-[#A8A29E] uppercase tracking-wider text-[9px]">Cor:</span>
                        <span className="font-semibold">{product.color.join(', ')}</span>
                      </li>
                    )}
                    {product.material && (
                      <li className="flex justify-between py-1">
                        <span className="font-medium text-[#A8A29E] uppercase tracking-wider text-[9px]">Material:</span>
                        <span className="font-semibold">{product.material}</span>
                      </li>
                    )}

                  </ul>

                  {product.measurements && Object.keys(product.measurements).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#C06A35]/10">
                      <span className="font-medium text-[#A8A29E] uppercase tracking-wider text-[9px] block mb-2">Medidas Detalhadas:</span>
                      <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
                        {Object.entries(product.measurements).map(([key, val]) => (
                          <li key={key} className="flex justify-between py-1">
                            <span className="text-[#A8A29E]">{key}:</span>
                            <span className="font-semibold">{val as string}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>

              <details className="group border-b border-[#C06A35]/10 pb-3">
                <summary className="flex justify-between items-center font-serif text-base text-[#1A332B] cursor-pointer list-none">
                  <span>Tabela de Medidas Padrão</span>
                  <span className="transition-transform group-open:rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </span>
                </summary>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-[11px] text-[#423226]">
                    <thead>
                      <tr className="border-b border-[#C06A35]/20 font-bold uppercase tracking-wider text-[9px] text-[#A8A29E]">
                        <th className="pb-2">Tamanho</th>
                        <th className="pb-2">Busto (cm)</th>
                        <th className="pb-2">Cintura (cm)</th>
                        <th className="pb-2">Quadril (cm)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C06A35]/10">
                      <tr><td className="py-2 font-semibold">PP (34/36)</td><td>80 - 84</td><td>62 - 66</td><td>90 - 94</td></tr>
                      <tr><td className="py-2 font-semibold">P (38)</td><td>85 - 89</td><td>67 - 71</td><td>95 - 99</td></tr>
                      <tr><td className="py-2 font-semibold">M (40)</td><td>90 - 94</td><td>72 - 76</td><td>100 - 104</td></tr>
                      <tr><td className="py-2 font-semibold">G (42)</td><td>95 - 99</td><td>77 - 81</td><td>105 - 109</td></tr>
                      <tr><td className="py-2 font-semibold">GG (44/46)</td><td>100 - 106</td><td>82 - 88</td><td>110 - 116</td></tr>
                    </tbody>
                  </table>
                </div>
              </details>

              <details className="group border-b border-[#C06A35]/10 pb-3">
                <summary className="flex justify-between items-center font-serif text-base text-[#1A332B] cursor-pointer list-none">
                  <span>Envio e Devoluções</span>
                  <span className="transition-transform group-open:rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </span>
                </summary>
                <div className="mt-4 text-xs font-light text-[#423226] leading-relaxed space-y-2">
                  <p>Entregamos para todo o Brasil via Correios (PAC e SEDEX) ou transportadora parceira. O cálculo do frete é feito no momento do checkout.</p>
                  <p>As devoluções podem ser solicitadas em até 7 dias após o recebimento do produto, seguindo as diretrizes do Código de Defesa do Consumidor.</p>
                </div>
              </details>
            </div>

            <div className="flex flex-col gap-4">
              {/* Mobile Sticky Container */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-[#C06A35]/20 md:static md:p-0 md:bg-transparent md:border-t-0 z-40 flex gap-4">
                <button
                  onClick={() => onAddToCart(product)}
                  className="flex-1 py-4 bg-black text-white hover:bg-[#C06A35] transition-colors text-xs font-bold uppercase tracking-[0.25em]"
                >
                  Comprar
                </button>
                <button
                  onClick={handleWishlistToggle}
                  className={`px-5 border border-[#1A332B] flex items-center justify-center transition-colors ${isWishlisted ? 'bg-red-50 text-red-500 border-red-500' : 'text-[#1A332B] hover:bg-[#1A332B]/5'}`}
                  title={isWishlisted ? 'Remover da Wishlist' : 'Adicionar à Wishlist'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill={isWishlisted ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                </button>
              </div>
              <ul className="mt-6 space-y-2 text-xs text-[#423226]">
                {product.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-[#C06A35] rounded-full"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Avaliações (Reviews) Section */}
        <div className="mt-24 border-t border-[#C06A35]/30 pt-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Col: Review Summary & Write Review Form */}
            <div className="lg:col-span-1">
              <h2 className="text-3xl font-serif text-[#1A332B] mb-4">Avaliações</h2>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-5xl font-serif font-bold text-[#1A332B]">
                  {reviews.length > 0
                    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                    : '0.0'}
                </span>
                <div>
                  <div className="flex text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const avg = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
                      return (
                        <svg key={i} xmlns="http://www.w3.org/2000/svg" fill={i < Math.round(avg) ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.195-.39.73-.39.927 0l2.184 4.3c.08.156.24.267.417.29l4.747.65c.446.06.623.585.308.883l-3.418 3.23c-.128.12-.186.29-.155.45l.848 4.67c.08.438-.39.768-.78.55l-4.225-2.18a.747.747 0 00-.678 0l-4.225 2.18c-.39.218-.86-.112-.78-.55l.848-4.67c.03-.16-.028-.33-.155-.45L3.65 10.612c-.315-.297-.138-.823.308-.883l4.747-.65c.178-.024.338-.135.417-.29l2.184-4.3z" />
                        </svg>
                      );
                    })}
                  </div>
                  <span className="text-xs text-[#A8A29E]">{reviews.length} avaliações</span>
                </div>
              </div>

              {user ? (
                <form onSubmit={handleAddReview} className="bg-white p-6 rounded border border-[#C06A35]/20 space-y-4">
                  <h3 className="font-serif text-lg text-[#1A332B]">Escrever Avaliação</h3>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Nota</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setNewRating(num)}
                          className="text-amber-500 hover:scale-110 transition-transform"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill={num <= newRating ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.195-.39.73-.39.927 0l2.184 4.3c.08.156.24.267.417.29l4.747.65c.446.06.623.585.308.883l-3.418 3.23c-.128.12-.186.29-.155.45l.848 4.67c.08.438-.39.768-.78.55l-4.225-2.18a.747.747 0 00-.678 0l-4.225 2.18c-.39.218-.86-.112-.78-.55l.848-4.67c.03-.16-.028-.33-.155-.45L3.65 10.612c-.315-.297-.138-.823.308-.883l4.747-.65c.178-.024.338-.135.417-.29l2.184-4.3z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Comentário</label>
                    <textarea
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Compartilhe sua opinião sobre o produto..."
                      className="w-full bg-transparent border border-[#C06A35]/30 rounded p-3 text-sm text-[#1A332B] focus:border-[#1A332B] outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-3 bg-[#1A332B] text-white uppercase tracking-widest text-xs font-medium hover:bg-[#433E38] transition-colors disabled:opacity-50"
                  >
                    {submittingReview ? 'Enviando...' : 'Enviar Avaliação'}
                  </button>
                </form>
              ) : (
                <div className="bg-white p-6 rounded border border-[#C06A35]/20 text-center">
                  <p className="text-sm text-[#423226] mb-4">Você precisa estar logado para avaliar este produto.</p>
                  <button
                    onClick={() => navigate('/login')}
                    className="text-[#C06A35] font-semibold underline text-sm"
                  >
                    Fazer Login
                  </button>
                </div>
              )}
            </div>

            {/* Right Col: Reviews List */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-xl font-serif text-[#1A332B]">Comentários dos Clientes</h3>
              {loadingReviews ? (
                <p className="text-[#A8A29E]">Buscando avaliações...</p>
              ) : reviews.length === 0 ? (
                <p className="text-[#A8A29E]">Ainda não há avaliações para este produto. Seja o primeiro a avaliar!</p>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="bg-white p-6 rounded border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="font-semibold text-sm text-[#1A332B] block">
                            {user && rev.user_id === user.id ? 'Você (Cliente Verificado)' : 'Cliente Verificado'}
                          </span>
                          <span className="text-xs text-[#A8A29E]">
                            {new Date(rev.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex text-amber-500">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <svg key={idx} xmlns="http://www.w3.org/2000/svg" fill={idx < rev.rating ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.195-.39.73-.39.927 0l2.184 4.3c.08.156.24.267.417.29l4.747.65c.446.06.623.585.308.883l-3.418 3.23c-.128.12-.186.29-.155.45l.848 4.67c.08.438-.39.768-.78.55l-4.225-2.18a.747.747 0 00-.678 0l-4.225 2.18c-.39.218-.86-.112-.78-.55l.848-4.67c.03-.16-.028-.33-.155-.45L3.65 10.612c-.315-.297-.138-.823.308-.883l4.747-.65c.178-.024.338-.135.417-.29l2.184-4.3z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-[#423226] text-sm font-light leading-relaxed">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-24 border-t border-[#C06A35]/30 pt-16">
            <h2 className="text-3xl font-serif text-[#1A332B] mb-8 text-center">Produtos Relacionados</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedProducts.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onClick={() => {
                    navigate(`/produto/${p.id}`);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProductDetail;