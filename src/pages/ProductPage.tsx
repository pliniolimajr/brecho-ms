import { useParams, useNavigate } from 'react-router-dom';
import ProductDetail from '../components/ProductDetail';
import { useStore } from '../store/useStore';
import { ProductPageSkeleton } from '../components/LoadingStates';

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, addToCart, isLoadingProducts } = useStore();

  const product = products.find((p) => p.id === id);

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
    <ProductDetail 
      key={product.id}
      product={product} 
      onBack={() => navigate('/')} 
      onAddToCart={(p) => addToCart(p)} 
    />
  );
}
