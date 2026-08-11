import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Seo } from '../components/Seo';

describe('metadados SEO', () => {
  afterEach(() => {
    document.head.querySelectorAll('[data-palm-seo="true"]').forEach(element => element.remove());
    document.head.querySelectorAll('[data-palm-jsonld="true"]').forEach(element => element.remove());
  });

  it('configura título, descrição e URL canônica', async () => {
    render(<Seo
      title="Catálogo"
      description="Descrição da coleção"
      path="/catalogo"
      jsonLd={{ '@context': 'https://schema.org', '@type': 'CollectionPage' }}
    />);

    await waitFor(() => expect(document.title).toBe('Catálogo | Palm CO.'));
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute('content', 'Descrição da coleção');
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://palm-co.vercel.app/catalogo');
    expect(document.head.querySelector('meta[property="og:title"]')).toHaveAttribute('content', 'Catálogo | Palm CO.');
    expect(document.head.querySelector('script[type="application/ld+json"]')?.textContent).toContain('CollectionPage');
  });

  it('impede indexação quando solicitado', async () => {
    render(<Seo title="Conta" description="Área privada" path="/minha-conta" noIndex />);
    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow'));
  });
});
