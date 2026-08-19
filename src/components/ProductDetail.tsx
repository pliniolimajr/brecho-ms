import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabaseClient';
import ProductCard from './ProductCard';
import type { Product } from '../types';
import { useToast } from './Toast';

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product) => void;
}

const CONDITION_LABELS: Record<NonNullable<Product['condition']>, string> = {
  new_with_tags: 'Novo com etiqueta',
  new_without_tags: 'Novo sem etiqueta',
  excellent: 'Excelente estado',
  very_good: 'Muito bom estado',
  good: 'Bom estado',
};

const normalizeFeature = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const ProductDetail: React.FC<ProductDetailProps> = ({ product, onBack, onAddToCart }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { products } = useStore();

  const relatedProducts = React.useMemo(() => {
    const list = products.filter(p => p.id !== product.id && !p.isSold);
    const sameCategory = list.filter(p => p.category === product.category);
    if (sameCategory.length > 0) {
      return sameCategory.slice(0, 3);
    }
    return list.slice(0, 3);
  }, [products, product]);

  const allImages = [product.imageUrl, ...(product.gallery || [])].filter(Boolean);
  const [currentImage, setCurrentImage] = useState(allImages[0]);
  const isUnavailable = product.isSold || product.stockQuantity === 0;
  const isUniquePiece = !isUnavailable && product.stockQuantity === 1;
  const hasStandardSizing = !['Acessórios', 'Calçados', 'Outros'].includes(product.category);
  const conditionLabel = product.condition ? CONDITION_LABELS[product.condition] : null;
  const uniqueFeatures = React.useMemo(() => {
    const attributeValues = [
      product.size,
      product.brand,
      product.material,
      ...(product.color || []),
      'Curadoria Palm CO.',
    ].filter(Boolean).map(value => normalizeFeature(String(value)));

    return (product.features || []).filter((feature) => {
      const normalized = normalizeFeature(feature);
      const repeatsAttribute = attributeValues.includes(normalized);
      const repeatsLabeledAttribute = ['tamanho:', 'marca:', 'material:', 'cor:', 'curadoria']
        .some(prefix => normalized.startsWith(prefix));
      return normalized && !repeatsAttribute && !repeatsLabeledAttribute;
    });
  }, [product]);

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
      showToast('Você precisa estar logado para salvar itens na sua lista de desejos.', 'warning');
      navigate('/login');
      return;
    }

    if (isWishlisted && wishlistId) {
      await supabase.from('wishlists').delete().eq('id', wishlistId);
      setIsWishlisted(false);
      setWishlistId(null);
      showToast('Produto removido da sua wishlist.', 'info');
    } else {
      const { data, error } = await supabase
        .from('wishlists')
        .insert({ user_id: user.id, product_id: product.id })
        .select('id')
        .single();

      if (!error && data) {
        setIsWishlisted(true);
        setWishlistId(data.id);
        showToast('Produto adicionado à sua wishlist!', 'success');
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
      showToast('Você precisa estar logado para avaliar.', 'warning');
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
      showToast('Erro ao enviar avaliação: ' + error.message, 'error');
    } else {
      showToast('Sua avaliação foi enviada com sucesso!', 'success');
      setNewComment('');
      setNewRating(5);
      fetchReviews();
    }
    setSubmittingReview(false);
  };

  return (
    <div className="min-h-screen bg-[#FDF6F0] pt-8 animate-fade-in-up md:pt-10">
      <div className="palm-shell pb-24">

        {/* Breadcrumb / Back */}
        <button
          onClick={onBack}
          className="group mb-6 flex min-h-11 items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#6B625C] transition-colors hover:text-[#1A332B]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Voltar para a Loja
        </button>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-12 xl:gap-20">

          {/* Left: Image Gallery */}
          <div className="flex min-w-0 flex-col gap-4 lg:grid lg:grid-cols-[64px_minmax(0,1fr)] lg:items-start lg:gap-4">
            <div className="palm-product-media mx-auto aspect-[4/5] w-full lg:col-start-2 lg:row-start-1 lg:aspect-auto lg:w-fit lg:max-w-full lg:bg-transparent">
              <img
                src={currentImage}
                alt={product.name}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="palm-product-image animate-fade-in-up lg:h-[min(74vh,760px)] lg:w-auto lg:max-w-full lg:object-contain"
              />
              {isUniquePiece && (
                <span className="absolute right-4 top-4 bg-[#FDF6F0]/95 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#1A332B] shadow-sm backdrop-blur-sm">
                  Peça única
                </span>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide lg:col-start-1 lg:row-start-1 lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(img)}
                    aria-label={`Exibir imagem ${idx + 1} de ${product.name}`}
                    aria-pressed={currentImage === img}
                    className={`palm-product-media aspect-[4/5] w-20 flex-shrink-0 border transition-colors sm:w-24 lg:w-16 ${currentImage === img ? 'border-[#1A332B]' : 'border-transparent hover:border-[#1A332B]/50'}`}
                  >
                    <img src={img} alt={`${product.name} — imagem ${idx + 1}`} loading="lazy" className="palm-product-image" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="mx-auto flex w-full max-w-xl flex-col lg:sticky lg:top-24 lg:max-w-[500px] lg:self-start lg:pt-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <span className="palm-eyebrow">{product.category}</span>
              <span className={`palm-eyebrow inline-flex items-center gap-2 ${isUnavailable ? 'text-red-700' : 'text-[#1A332B]'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isUnavailable ? 'bg-red-700' : 'bg-emerald-700'}`} aria-hidden="true" />
                {isUnavailable ? 'Esgotado' : 'Disponível'}
              </span>
            </div>
            {product.brand && <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A4825]">{product.brand}</p>}
            <h1 className="palm-display mb-4 text-3xl sm:text-4xl lg:text-[2.4rem] xl:text-[2.75rem]">{product.name}</h1>
            {product.tagline && <p className="mb-5 max-w-md text-xs leading-5 text-[#423226]">{product.tagline}</p>}
            <span className="mb-5 block border-b border-[#C06A35]/20 pb-5 font-serif text-xl text-[#1A332B]">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>

            <dl className="mb-6 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-[#C06A35]/20 pb-6 text-xs">
              <div><dt className="palm-eyebrow mb-1">Tamanho</dt><dd className="font-medium text-[#1A332B]">{product.size || 'Único'}</dd></div>
              {product.material && <div><dt className="palm-eyebrow mb-1">Material</dt><dd className="font-medium text-[#1A332B]">{product.material}</dd></div>}
              {product.color?.length ? <div><dt className="palm-eyebrow mb-1">Cor</dt><dd className="font-medium text-[#1A332B]">{product.color.join(', ')}</dd></div> : null}
              {conditionLabel && <div><dt className="palm-eyebrow mb-1">Estado</dt><dd className="font-medium text-[#1A332B]">{conditionLabel}</dd></div>}
            </dl>

            {product.conditionNotes && (
              <div className="mb-7 border-l-2 border-[#C06A35] bg-white/55 px-4 py-3 text-sm leading-6 text-[#423226]">
                <strong className="mb-1 block text-xs uppercase tracking-[0.14em] text-[#1A332B]">Observações da peça</strong>
                <p>{product.conditionNotes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mb-5 flex w-full gap-3">
              <button
                onClick={() => onAddToCart(product)}
                disabled={isUnavailable}
                className="flex min-h-12 flex-1 items-center justify-center bg-[#1A332B] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#8A4825] disabled:cursor-not-allowed disabled:bg-[#6B625C]"
              >
                {isUnavailable ? 'Produto esgotado' : 'Adicionar à sacola'}
              </button>
              <button
                onClick={handleWishlistToggle}
                aria-label={isWishlisted ? 'Remover da lista de desejos' : 'Adicionar à lista de desejos'}
                className={`flex min-h-12 min-w-12 items-center justify-center border px-3 transition-colors ${isWishlisted ? 'border-red-700 bg-red-50 text-red-700' : 'border-[#1A332B] text-[#1A332B] hover:bg-[#1A332B]/5'}`}
                title={isWishlisted ? 'Remover da Wishlist' : 'Adicionar à Wishlist'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill={isWishlisted ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
            </div>

            {/* Collapsible details inspired by Shoulder */}
            <div className="mb-8 space-y-3">
              <details className="group border-b border-[#C06A35]/10 pb-3" open>
                <summary className="flex list-none items-center justify-between font-serif text-sm text-[#1A332B]">
                  <span>Detalhes da peça</span>
                  <span className="transition-transform group-open:rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </span>
                </summary>
                <div className="mt-4 text-xs font-light text-[#423226] leading-relaxed space-y-2">
                  <p>{product.longDescription || product.description}</p>

                  {uniqueFeatures.length > 0 && (
                    <ul className="mt-4 space-y-1.5 border-t border-[#C06A35]/10 pt-4">
                      {uniqueFeatures.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="mt-2 h-1 w-1 flex-none rounded-full bg-[#C06A35]" aria-hidden="true" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {product.measurements && Object.keys(product.measurements).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#C06A35]/10">
                      <span className="mb-2 block text-[9px] font-medium uppercase tracking-wider text-[#6B625C]">Medidas detalhadas</span>
                      <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
                        {Object.entries(product.measurements).map(([key, val]) => (
                          <li key={key} className="flex justify-between py-1">
                            <span className="text-[#6B625C]">{key}:</span>
                            <span className="font-semibold">{val as string}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>

              {hasStandardSizing && <details className="group border-b border-[#C06A35]/10 pb-3">
                <summary className="flex list-none items-center justify-between font-serif text-sm text-[#1A332B]">
                  <span>Referência geral de tamanhos</span>
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
                <p className="mt-3 text-[10px] leading-relaxed text-[#6B625C]">As medidas podem variar conforme a marca e a modelagem. Priorize as medidas específicas da peça quando disponíveis.</p>
              </details>}

              <details className="group border-b border-[#C06A35]/10 pb-3">
                <summary className="flex list-none items-center justify-between font-serif text-sm text-[#1A332B]">
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
                  <Link to="/politicas" className="inline-flex min-h-10 items-center font-semibold text-[#8A4825] underline underline-offset-4">Consultar política completa</Link>
                </div>
              </details>
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
                  <span className="text-xs text-[#6B625C]">{reviews.length} avaliações</span>
                </div>
              </div>

              {user ? (
                <form onSubmit={handleAddReview} className="bg-white p-6 rounded border border-[#C06A35]/20 space-y-4">
                  <h3 className="font-serif text-lg text-[#1A332B]">Escrever Avaliação</h3>

                  <div>
                    <span className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Nota</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setNewRating(num)}
                          aria-label={`${num} ${num === 1 ? 'estrela' : 'estrelas'}`}
                          aria-pressed={num === newRating}
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
                    <label htmlFor="product-review-comment" className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Comentário</label>
                    <textarea
                      id="product-review-comment"
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
                    className="text-[#8A4825] font-semibold underline text-sm"
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
                <p className="text-[#6B625C]">Ainda não há avaliações para este produto. Seja o primeiro a avaliar!</p>
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
