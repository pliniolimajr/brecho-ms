export function Policies() {
  return (
    <div className="min-h-screen pt-32 pb-24 px-6 bg-[#FDF6F0] animate-fade-in-up">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <span className="text-xs uppercase tracking-widest text-[#C06A35] font-bold">Transparência</span>
          <h1 className="text-4xl font-serif text-[#1A332B]">Políticas da Loja</h1>
          <p className="text-sm text-[#423226] max-w-lg mx-auto leading-relaxed">
            Nossos termos de troca, prazos e procedimentos de entrega para garantir uma experiência de compra tranquila e confiável.
          </p>
        </div>

        <div className="space-y-10 bg-white p-8 md:p-12 rounded border border-[#C06A35]/20">
          <section className="space-y-4">
            <h2 className="text-xl font-serif text-[#1A332B] border-b border-[#C06A35]/20 pb-2">1. Envio e Entrega</h2>
            <p className="text-sm text-[#423226] leading-relaxed">
              Realizamos envios para todo o Brasil através dos Correios (modalidades PAC e SEDEX). Os pedidos são despachados em até <strong className="font-semibold text-[#1A332B]">2 dias úteis</strong> após a confirmação do pagamento. O prazo final de entrega e o valor do frete variam de acordo com o CEP de destino e são informados no momento do checkout.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-serif text-[#1A332B] border-b border-[#C06A35]/20 pb-2">2. Trocas e Devoluções</h2>
            <p className="text-sm text-[#423226] leading-relaxed">
              Aceitamos trocas ou devoluções no prazo de até <strong className="font-semibold text-[#1A332B]">7 dias corridos</strong> a contar da data de recebimento do pedido, conforme o Código de Defesa do Consumidor. A peça deve ser devolvida nas mesmas condições em que foi entregue, sem sinais de uso e com a etiqueta da Palm Co. fixada.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-serif text-[#1A332B] border-b border-[#C06A35]/20 pb-2">3. Como solicitar</h2>
            <p className="text-sm text-[#423226] leading-relaxed">
              Para iniciar o processo de troca ou devolução, entre em contato pelo nosso WhatsApp ou e-mail com o número do seu pedido. Forneceremos um código de autorização de postagem dos Correios (logística reversa) para que você possa nos enviar o produto sem custos de frete.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Policies;
