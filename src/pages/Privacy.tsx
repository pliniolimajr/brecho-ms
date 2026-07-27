export function Privacy() {
  return (
    <div className="min-h-screen bg-[#FDF6F0] pt-32 pb-24 px-6 text-[#1A332B] animate-fade-in-up">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded shadow-sm border border-[#C06A35]/20">
        <h1 className="text-4xl font-serif mb-6 text-center">Política de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-8 text-center uppercase tracking-widest">Última atualização: Julho de 2026</p>
        
        <div className="space-y-6 text-[#423226] leading-relaxed">
          <section>
            <h2 className="text-xl font-serif mb-3 text-[#1A332B]">1. Coleta de Informações</h2>
            <p>
              Coletamos informações pessoais que você nos fornece voluntariamente durante o processo de cadastro e compra, incluindo nome, e-mail, telefone, CPF, data de nascimento, preferências de moda e endereço de entrega.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif mb-3 text-[#1A332B]">2. Uso de Dados</h2>
            <p>
              Seus dados são utilizados para processar pedidos, gerenciar sua conta de cliente, enviar atualizações de pedidos e, se autorizado, enviar comunicações de marketing personalizadas de acordo com suas preferências de moda.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif mb-3 text-[#1A332B]">3. Compartilhamento de Informações</h2>
            <p>
              Não vendemos ou alugamos suas informações pessoais a terceiros. Seus dados são compartilhados apenas com prestadores de serviços parceiros estritamente necessários para a operação do e-commerce (como gateways de pagamento e serviços de entrega).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif mb-3 text-[#1A332B]">4. Segurança dos Dados</h2>
            <p>
              Implementamos medidas de segurança administrativas, técnicas e físicas para proteger seus dados pessoais contra acessos não autorizados, perdas ou alterações. Contudo, nenhum sistema na internet é completamente infalível.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif mb-3 text-[#1A332B]">5. Seus Direitos</h2>
            <p>
              Você tem o direito de acessar, corrigir ou solicitar a exclusão de seus dados pessoais a qualquer momento através de sua conta de cliente ou entrando em contato com nosso canal de atendimento.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
