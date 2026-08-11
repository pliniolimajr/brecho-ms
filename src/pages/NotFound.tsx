import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';

export function NotFound() {
  return (
    <main className="min-h-screen bg-[#FDF6F0] px-6 pt-36 pb-24 text-center text-[#1A332B]">
      <Seo title="Página não encontrada" description="A página solicitada não foi encontrada." path="/404" noIndex />
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#C06A35]">Erro 404</p>
      <h1 className="mt-5 text-4xl md:text-6xl font-serif">Essa peça não está por aqui.</h1>
      <p className="mx-auto mt-5 max-w-xl text-[#423226]">
        O endereço pode ter mudado ou não existe. Você pode voltar para a loja e continuar explorando nossa curadoria.
      </p>
      <Link to="/catalogo" className="inline-block mt-9 bg-[#1A332B] px-7 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#C06A35]">
        Ver catálogo
      </Link>
    </main>
  );
}
