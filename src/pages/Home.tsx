import Hero from '../components/Hero';
import ProductGrid from '../components/ProductGrid';
import About from '../components/About';
import { useNavigate } from 'react-router-dom';

export function Home() {
  const navigate = useNavigate();

  return (
    <>
      <Hero />
      <ProductGrid onProductClick={(p) => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          navigate(`/produto/${p.id}`);
      }} />
      <About />
    </>
  );
}