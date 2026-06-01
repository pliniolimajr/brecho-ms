import type { Product } from './types';

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Bermuda Cinza',
    tagline: 'Garimpo especial.',
    description: 'Tecido de algodão leve e confortável. Modelagem regular, ideal para dias quentes.',
    longDescription: 'Peça única. Bermuda masculina cinza em excelente estado de conservação (Ótimo). Possui bolsos frontais e traseiros, proporcionando um visual casual e super versátil. Uma escolha com propósito para o seu consumo consciente.',
    price: 29.99,
    category: 'Calças',
    imageUrl: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&q=80&w=1000',
    gallery: [
      'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&q=80&w=1000'
    ],
    features: ['Algodão', 'Tamanho 42', 'Estado: Ótimo']
  },
  {
    id: 'p2',
    name: 'Bermuda Estampada Nilits',
    tagline: 'Estilo que inspira.',
    description: 'Estampa exclusiva Nilits. Tecido leve e de secagem rápida.',
    longDescription: 'Peça única. Bermuda estampada masculina da marca Nilits. Tamanho 44. Confeccionada em poliéster, ideal para praia, piscina e lazer. Cós com cadarço ajustável. Estado de conservação ótimo. Valorize o que é bom!',
    price: 19.99,
    category: 'Calças',
    imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=1000',
    gallery: [
        'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=1000'
    ],
    features: ['Poliéster', 'Tamanho 44', 'Secagem Rápida']
  },
  {
    id: 'p3',
    name: 'Camisa Vintage Xadrez',
    tagline: 'Qualidade que surpreende.',
    description: 'Camisa de flanela vintage, autêntica dos anos 90.',
    longDescription: 'Uma verdadeira relíquia. Camisa xadrez flanelada, perfeita para sobreposições. Garimpo exclusivo em perfeito estado. Consumo consciente é colocar você em primeiro lugar enquanto ajuda o planeta.',
    price: 45.00,
    category: 'Camisetas',
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e23?auto=format&fit=crop&q=80&w=1000',
    gallery: [
        'https://images.unsplash.com/photo-1596755094514-f87e32f85e23?auto=format&fit=crop&q=80&w=1000'
    ],
    features: ['Flanela', 'Tamanho M', 'Anos 90']
  },
  {
    id: 'p4',
    name: 'Jaqueta Jeans Clássica',
    tagline: 'Sempre na moda.',
    description: 'O clássico que nunca morre. Jeans encorpado com lavagem clara.',
    longDescription: 'Jaqueta Jeans unissex com modelagem oversized. Peça curinga para qualquer guarda-roupa. Botões originais e sem nenhuma avaria. Escolhas com propósito começam por peças duráveis.',
    price: 89.90,
    category: 'Casacos',
    imageUrl: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&q=80&w=1000',
    gallery: [
        'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&q=80&w=1000'
    ],
    features: ['Jeans 100% Algodão', 'Tamanho G', 'Oversized']
  }
];

export const BRAND_NAME = 'Brechó MS';
export const PRIMARY_COLOR = 'stone-900'; 
export const ACCENT_COLOR = 'stone-500';