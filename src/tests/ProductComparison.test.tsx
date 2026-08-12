import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProductComparison } from '../components/ProductComparison';
import { useStore } from '../store/useStore';
import type { Product } from '../types';

const products: Product[] = [
  {
    id: 'product-1', name: 'Produto Um', tagline: '', description: '', price: 100,
    category: 'Outros', imageUrl: '/one.jpg', features: [], brand: 'Marca Um', size: 'M',
  },
  {
    id: 'product-2', name: 'Produto Dois', tagline: '', description: '', price: 200,
    category: 'Outros', imageUrl: '/two.jpg', features: [], brand: 'Marca Dois', size: 'G',
  },
];

describe('comparador de produtos', () => {
  beforeEach(() => useStore.setState({ comparison: products }));

  it('oferece acesso individual a todos os produtos e compara a marca', () => {
    render(<MemoryRouter><ProductComparison /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Comparar agora' }));

    const productLinks = screen.getAllByRole('link', { name: 'Ver produto' });
    expect(productLinks).toHaveLength(2);
    expect(productLinks[0]).toHaveAttribute('href', '/produto/product-1');
    expect(productLinks[1]).toHaveAttribute('href', '/produto/product-2');
    expect(screen.getByText('Marca')).toBeInTheDocument();
    expect(screen.getByText('Marca Um')).toBeInTheDocument();
    expect(screen.getByText('Marca Dois')).toBeInTheDocument();
    expect(screen.queryByText('Ver primeiro produto')).not.toBeInTheDocument();
  });
});
