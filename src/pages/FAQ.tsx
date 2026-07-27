import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "As peças são originais?",
      answer: "Sim! Todas as peças vendidas na Little Palm Co. passam por um rigoroso processo de autenticação e curadoria antes de serem expostas em nosso catálogo."
    },
    {
      question: "Como funciona a retirada presencial?",
      answer: "Ao finalizar seu pedido, você receberá a confirmação de pagamento. Seus produtos estarão prontos para retirada no nosso showroom no dia seguinte. Entraremos em contato via WhatsApp para combinar o melhor horário."
    },
    {
      question: "Vocês enviam para outros estados?",
      answer: "No momento estamos focados na retirada presencial em nosso showroom. Em breve expandiremos para entregas nacionais via transportadora parceira."
    },
    {
      question: "Como posso pagar minhas compras?",
      answer: "Aceitamos pagamentos de forma totalmente segura via Mercado Pago, com opções de PIX ou cartão de crédito parcelado."
    },
    {
      question: "Posso devolver uma peça se não servir?",
      answer: "Claro. Você tem até 7 dias corridos a partir da retirada da peça para solicitar a troca ou a devolução por qualquer motivo. A peça precisa estar com a tag intacta e sem sinais de uso."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 bg-[#FDF6F0] animate-fade-in-up">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <span className="text-xs uppercase tracking-widest text-[#C06A35] font-bold">Dúvidas</span>
          <h1 className="text-4xl font-serif text-[#1A332B]">Perguntas Frequentes</h1>
          <p className="text-sm text-[#423226] max-w-md mx-auto leading-relaxed">
            Precisa de ajuda? Separamos as dúvidas mais frequentes dos nossos clientes para te auxiliar.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className="border-b border-[#C06A35]/30 pb-4 transition-all duration-300"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex justify-between items-center text-left py-4 font-serif text-lg text-[#1A332B] hover:text-[#C06A35] transition-colors"
                >
                  <span>{faq.question}</span>
                  <span className="text-xl font-mono text-[#C06A35]">
                    {isOpen ? '—' : '+'}
                  </span>
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 max-h-0 ${isOpen ? 'max-h-40' : ''}`}
                >
                  <p className="text-sm text-[#423226] leading-relaxed pt-2">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FAQ;
