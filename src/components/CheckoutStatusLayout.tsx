import type { ReactNode } from 'react';

interface CheckoutStatusLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone: 'success' | 'warning' | 'error';
  children?: ReactNode;
  actions: ReactNode;
  note: string;
}

const toneClasses = {
  success: 'bg-emerald-50 text-emerald-800',
  warning: 'bg-amber-50 text-amber-800',
  error: 'bg-red-50 text-red-800',
};

export function CheckoutStatusLayout({
  eyebrow,
  title,
  description,
  icon,
  tone,
  children,
  actions,
  note,
}: CheckoutStatusLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FDF6F0] px-5 pb-20 pt-32 sm:px-8">
      <div className="mx-auto grid max-w-5xl overflow-hidden border border-[#C06A35]/20 bg-white/55 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex min-h-56 items-center justify-center bg-[#F1E9E1] p-10 lg:min-h-[38rem]">
          <div className={`flex h-24 w-24 items-center justify-center rounded-full ${toneClasses[tone]}`}>
            {icon}
          </div>
        </div>

        <div className="flex flex-col justify-center p-7 sm:p-12 lg:p-16">
          <p className="palm-eyebrow mb-5">{eyebrow}</p>
          <h1 className="palm-display mb-6 text-4xl sm:text-5xl">{title}</h1>
          <p className="max-w-lg text-sm leading-7 text-[#423226] sm:text-base">{description}</p>
          {children}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>
          <p className="mt-8 border-t border-[#C06A35]/20 pt-5 text-xs leading-5 text-[#6B625C]">{note}</p>
        </div>
      </div>
    </div>
  );
}
