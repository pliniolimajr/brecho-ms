import { useEffect } from 'react';

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'product';
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://palm-co.vercel.app').replace(/\/$/, '');
const DEFAULT_IMAGE = '/hero/slide_1.jpg';

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
  element.dataset.palmSeo = 'true';
}

export function Seo({ title, description, path = '/', image = DEFAULT_IMAGE, type = 'website', noIndex = false, jsonLd }: SeoProps) {
  useEffect(() => {
    const pageTitle = title.includes('Palm CO.') ? title : `${title} | Palm CO.`;
    const canonicalUrl = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? image : `/${image}`}`;

    document.title = pageTitle;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    setMeta('property', 'og:title', pageTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', imageUrl);
    setMeta('property', 'og:locale', 'pt_BR');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', pageTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', imageUrl);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
    canonical.dataset.palmSeo = 'true';

    document.head.querySelectorAll('script[data-palm-jsonld="true"]').forEach(element => element.remove());
    const entries = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
    entries.forEach(entry => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.palmJsonld = 'true';
      script.textContent = JSON.stringify(entry).replace(/</g, '\\u003c');
      document.head.appendChild(script);
    });
  }, [description, image, jsonLd, noIndex, path, title, type]);

  return null;
}
