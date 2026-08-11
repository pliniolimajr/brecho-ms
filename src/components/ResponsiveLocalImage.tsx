interface ResponsiveLocalImageProps {
  basePath: string;
  fallbackSrc: string;
  widths: number[];
  width: number;
  height: number;
  alt: string;
  sizes: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
}

export function ResponsiveLocalImage({
  basePath, fallbackSrc, widths, width, height, alt, sizes, className,
  loading = 'lazy', fetchPriority = 'auto',
}: ResponsiveLocalImageProps) {
  const sourceSet = (format: 'avif' | 'webp') => widths.map(size => `${basePath}-${size}.${format} ${size}w`).join(', ');

  return (
    <picture className="contents">
      <source type="image/avif" srcSet={sourceSet('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={sourceSet('webp')} sizes={sizes} />
      <img
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
