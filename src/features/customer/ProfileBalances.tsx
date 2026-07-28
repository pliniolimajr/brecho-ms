interface ProfileBalancesProps {
  storeCredit: number | undefined | null;
}

export function ProfileBalances({ storeCredit }: ProfileBalancesProps) {
  const formattedCredit = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(storeCredit || 0);

  return (
    <div className="bg-white p-8 md:p-10 rounded border border-[#C06A35]/20 animate-fade-in-up h-full">
      <h2 className="text-xl font-serif text-[#1A332B] mb-8 italic border-b border-[#C06A35]/20 pb-4">Meus saldos</h2>
      
      <div className="flex flex-col items-start space-y-4">
        <p className="text-sm text-[#423226]">Saldo atual na sua conta Palm Co.</p>
        <div className="text-4xl font-serif text-[#C06A35]">{formattedCredit}</div>
        <p className="text-xs text-gray-500 mt-4">
          * O saldo pode ser utilizado como desconto em suas próximas compras no checkout.
        </p>
      </div>
    </div>
  );
}
