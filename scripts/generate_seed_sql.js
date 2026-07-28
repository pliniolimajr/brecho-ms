import fs from 'fs';

const images = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1550614000-4b95d4e57434?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1502716119720-b23a93e5fe8b?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1434389670869-c8751522c947?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1572804013309-84620023a8e9?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1509319117193-57bab727e09d?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1618331835717-801e976710b2?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1617260719888-9d41d1d916cc?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800'
];

const types = [
  { prefix: 'Vestido', categories: ['Vestidos'], priceRange: [250, 890] },
  { prefix: 'Calça Pantalona', categories: ['Calças'], priceRange: [180, 550] },
  { prefix: 'Saia Midi', categories: ['Saias'], priceRange: [150, 420] },
  { prefix: 'Camisa Alfaiataria', categories: ['Camisetas'], priceRange: [190, 480] },
  { prefix: 'Blazer Tailoring', categories: ['Casacos'], priceRange: [380, 990] },
  { prefix: 'Bolsa Minimalista', categories: ['Acessórios'], priceRange: [220, 750] },
  { prefix: 'Sandália Couro', categories: ['Calçados'], priceRange: [180, 600] }
];

const adjectives = ['Rústico', 'Premium', 'Minimalista', 'Contemporâneo', 'Vintage', 'Clássico', 'Estruturado'];
const materials = ['Linho', 'Algodão Pima', 'Seda', 'Couro Vegano', 'Viscose', 'Tricot', 'Lã Fria'];
const sizes = ['PP', 'P', 'M', 'G', 'GG', 'ÚNICO'];
const brands = ['Shoulder', 'Animale', 'Le Lis Blanc', 'Zara', 'Cris Barros', 'Richards', 'Farm'];
const colors = ['Off-White', 'Preto', 'Terracota', 'Verde Oliva', 'Areia', 'Cinza Mescla', 'Marinho'];

function escapeSql(str) {
  if (!str) return 'NULL';
  return "'" + str.replace(/'/g, "''") + "'";
}

function generateProductsSQL(count) {
  let sql = `-- Seed Script de Produtos
-- Este script apaga a tabela atual e insere 50 itens luxuosos aleatórios.

DELETE FROM public.products;

INSERT INTO public.products (
  name, tagline, description, long_description, price, category, size, 
  image_url, gallery, features, brand, color, material, stock_quantity, is_sold
) VALUES 
`;

  const values = [];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const mat = materials[Math.floor(Math.random() * materials.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const size = sizes[Math.floor(Math.random() * sizes.length)];

    const name = `${type.prefix} em ${mat} ${adj}`;
    const price = Math.floor(Math.random() * (type.priceRange[1] - type.priceRange[0])) + type.priceRange[0] + 0.90;

    // Pick 3 random distinct images
    const shuffledImages = [...images].sort(() => 0.5 - Math.random());
    const mainImage = shuffledImages[0];
    const gallery = [shuffledImages[1], shuffledImages[2]];

    const tagline = `Coleção Exclusiva - ${brand}`;
    const desc = `Peça impecável da marca ${brand}, perfeita para um look ${adj.toLowerCase()} e sofisticado. A cor ${color} traz versatilidade ao guarda-roupa.`;
    const longDesc = `Feito com maestria em ${mat}, o ${name} é uma escolha certeira para quem busca conforto sem abrir mão da elegância. Peça garimpada com cuidado, passando por rigoroso processo de curadoria da Palm CO. Lavagem a seco recomendada.`;
    const features = `ARRAY['Curadoria Palm CO.', 'Material: ${mat}', 'Cor: ${color}']`;
    const colorArray = `ARRAY['${color}']`;
    const galleryArray = `ARRAY['${gallery[0]}', '${gallery[1]}']`;

    const row = `(${escapeSql(name)}, ${escapeSql(tagline)}, ${escapeSql(desc)}, ${escapeSql(longDesc)}, ${price}, ${escapeSql(type.categories[0])}, ${escapeSql(size)}, ${escapeSql(mainImage)}, ${galleryArray}, ${features}, ${escapeSql(brand)}, ${colorArray}, ${escapeSql(mat)}, ${Math.floor(Math.random() * 5) + 1}, false)`;

    values.push(row);
  }

  sql += values.join(',\n') + ';\n';
  return sql;
}

const sqlContent = generateProductsSQL(50);
fs.writeFileSync('scripts/seed_products.sql', sqlContent, 'utf-8');
console.log('✅ Arquivo SQL de seed gerado com sucesso em scripts/seed_products.sql');
console.log('Cole este arquivo no SQL Editor do Supabase para inserir os 50 produtos.');
