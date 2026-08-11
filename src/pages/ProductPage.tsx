import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductDetail from '../components/ProductDetail';
import { useStore } from '../store/useStore';
import { ProductPageSkeleton } from '../components/LoadingStates';
import { Seo } from '../components/Seo';
import { trackEvent } from '../services/analytics';

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, addToCart, isLoadingProducts } = useStore();

  const product = products.find((p) => p.id === id);

  useEffect(() => {
    if (product) trackEvent('product_viewed', { product_id: product.id, price: product.price, category: product.category });
  }, [product]);

  if (isLoadingProducts) {
    return <ProductPageSkeleton />;
  }

  if (!product) {
    return (
      <div className="pt-32 text-center h-screen bg-[#FDF6F0] text-[#1A332B]">
        <h1 className="text-3xl font-serif mb-4">Produto não encontrado</h1>
        <button onClick={() => navigate('/')} className="text-[#C06A35] underline">Voltar para a loja</button>
      </div>
    );
  }

  return (
    <>
      <Seo
        title={product.name}
        description={product.description}
        path={`/produto/${product.id}`}
        image={product.imageUrl}
        type="product"
        jsonLd={[
          {
            '@context': 'https://schema.org', '@type': 'Product', name: product.name,
            description: product.description, image: [product.imageUrl, ...(product.gallery || [])],
            brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
            sku: product.id,
            offers: {
              '@type': 'Offer', priceCurrency: 'BRL', price: product.price.toFixed(2),
              availability: (product.stockQuantity || 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              url: `https://palm-co.vercel.app/produto/${product.id}`,
            },
          },
          {
            '@context': 'https://schema.org', '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://palm-co.vercel.app/' },
              { '@type': 'ListItem', position: 2, name: 'Catálogo', item: 'https://palm-co.vercel.app/catalogo' },
              { '@type': 'ListItem', position: 3, name: product.name, item: `https://palm-co.vercel.app/produto/${product.id}` },
            ],
          },
        ]}
      />
      <ProductDetail
        key={product.id}
        product={product}
        onBack={() => navigate('/')}
        onAddToCart={(p) => addToCart(p)}
      />
    </>
  );
}
