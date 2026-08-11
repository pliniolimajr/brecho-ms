interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  label?: string;
}

export function TableSkeleton({ rows = 5, columns = 5, label = 'Carregando dados' }: TableSkeletonProps) {
  return (
    <div className="p-5 animate-pulse" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <div key={`header-${index}`} className="h-4 rounded bg-[#C06A35]/15" />
        ))}
        {Array.from({ length: rows * columns }).map((_, index) => (
          <div key={`cell-${index}`} className="h-9 rounded bg-[#FDF6F0]" />
        ))}
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse bg-white border border-[#C06A35]/15 rounded overflow-hidden flex flex-col h-full shadow-sm" role="status">
      <span className="sr-only">Carregando produto</span>
      <div className="w-full aspect-[3/4] bg-[#FDF6F0]/80" />
      <div className="p-4 space-y-3 flex-1">
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/3 mt-6" />
      </div>
    </div>
  );
}

export function ProductPageSkeleton() {
  return (
    <main className="min-h-screen bg-[#FDF6F0] pt-28 px-6" role="status" aria-label="Carregando produto">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 animate-pulse">
        <div className="aspect-[3/4] bg-white rounded" />
        <div className="space-y-5 pt-4">
          <div className="h-4 bg-[#C06A35]/15 rounded w-1/4" />
          <div className="h-10 bg-[#1A332B]/10 rounded w-3/4" />
          <div className="h-6 bg-[#C06A35]/15 rounded w-1/3" />
          <div className="h-24 bg-white rounded" />
          <div className="h-12 bg-[#1A332B]/15 rounded w-full" />
        </div>
      </div>
    </main>
  );
}

export function ProfileSkeleton() {
  return (
    <main className="min-h-screen bg-[#FDF6F0] pt-28 px-6" role="status" aria-label="Carregando sua conta">
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="h-10 bg-[#1A332B]/10 rounded w-64 mb-10" />
        <div className="grid md:grid-cols-[240px_1fr] gap-8">
          <div className="h-72 bg-white rounded" />
          <div className="bg-white rounded p-6 space-y-5">
            <div className="h-6 bg-[#C06A35]/15 rounded w-1/3" />
            <div className="h-12 bg-[#FDF6F0] rounded" />
            <div className="h-12 bg-[#FDF6F0] rounded" />
            <div className="h-12 bg-[#FDF6F0] rounded" />
          </div>
        </div>
      </div>
    </main>
  );
}
