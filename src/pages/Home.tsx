import Hero from '../components/Hero';
import ProductGrid from '../components/ProductGrid';
import { Lookbook } from '../components/Lookbook';
import { EditorialStory } from '../components/EditorialStory';
import { useNavigate } from 'react-router-dom';
import { Seo } from '../components/Seo';

export function Home() {
  const navigate = useNavigate();

  return (
    <>
      <Seo
        title="Palm CO. | Moda circular com curadoria"
        description="Peças únicas e selecionadas com cuidado. Vista sua personalidade com moda circular, qualidade e propósito."
        path="/"
        jsonLd={[
          {
            '@context': 'https://schema.org', '@type': 'Organization', name: 'Palm CO.',
            url: 'https://palm-co.vercel.app', logo: 'https://palm-co.vercel.app/favicon.svg',
          },
          {
            '@context': 'https://schema.org', '@type': 'WebSite', name: 'Palm CO.',
            url: 'https://palm-co.vercel.app', inLanguage: 'pt-BR',
          },
        ]}
      />
      <Hero />
      <EditorialStory />
      <ProductGrid onProductClick={(p) => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          navigate(`/produto/${p.id}`);
      }} />
      <Lookbook />
    </>
  );
}
