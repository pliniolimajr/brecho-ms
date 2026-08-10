import { Link, useSearchParams } from 'react-router-dom';

const messages = {
  success: {
    title: 'Descadastro concluído',
    description: 'Você não receberá mais nossas novidades e comunicações promocionais.',
  },
  not_found: {
    title: 'Link não encontrado',
    description: 'Este link já foi utilizado ou não pertence a um cadastro ativo.',
  },
  invalid: {
    title: 'Link inválido',
    description: 'Não foi possível reconhecer este link de descadastro.',
  },
  error: {
    title: 'Não foi possível concluir',
    description: 'Tivemos um problema temporário. Por favor, tente novamente mais tarde.',
  },
};

export function NewsletterUnsubscribe() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') as keyof typeof messages | null;
  const content = status && messages[status] ? messages[status] : messages.invalid;
  const successful = status === 'success';

  return (
    <div className="min-h-screen bg-[#FDF6F0] px-6 pb-24 pt-36 flex items-center justify-center">
      <section className="w-full max-w-xl border border-[#C06A35]/20 bg-white p-8 text-center shadow-sm md:p-12">
        <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${
          successful ? 'bg-green-50 text-green-800' : 'bg-[#C06A35]/10 text-[#C06A35]'
        }`}>
          {successful ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-8 w-8" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m5 12 4 4L19 6" />
            </svg>
          ) : (
            <span className="font-serif text-2xl" aria-hidden="true">!</span>
          )}
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#C06A35]">Newsletter Palm CO.</p>
        <h1 className="mb-4 font-serif text-3xl text-[#1A332B] md:text-4xl">{content.title}</h1>
        <p className="mx-auto mb-8 max-w-md leading-relaxed text-[#5C544E]">{content.description}</p>

        <Link
          to="/"
          className="inline-block bg-[#1A332B] px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[#C06A35]"
        >
          Voltar para a loja
        </Link>
      </section>
    </div>
  );
}

export default NewsletterUnsubscribe;
