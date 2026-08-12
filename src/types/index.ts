/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/



export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  longDescription?: string;
  price: number;
  category: 'Todos' | 'Vestidos' | 'Calças' | 'Saias' | 'Camisetas' | 'Casacos' | 'Acessórios' | 'Calçados' | 'Outros';
  size?: string;
  imageUrl: string;
  gallery?: string[];
  features: string[];
  isSold?: boolean;
  brand?: string;
  color?: string[];
  material?: string;
  measurements?: any;
  stockQuantity?: number;
}

export interface Order {
  id: string;
  userId?: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  paymentMethod: 'pix' | 'credit_card';
  createdAt: string;
  items?: Product[];
}

export type LoadingState = 'IDLE' | 'LOADING' | 'ERROR' | 'SUCCESS';
