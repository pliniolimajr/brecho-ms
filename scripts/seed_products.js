import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos nas variáveis de ambiente.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

const generateProducts = (count) => {
  const products = [];

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

    products.push({
      name: name,
      tagline: `Coleção Exclusiva - ${brand}`,
      description: `Peça impecável da marca ${brand}, perfeita para um look ${adj.toLowerCase()} e sofisticado. A cor ${color} traz versatilidade ao guarda-roupa.`,
      long_description: `Feito com maestria em ${mat}, o ${name} é uma escolha certeira para quem busca conforto sem abrir mão da elegância. Peça garimpada com cuidado, passando por rigoroso processo de curadoria da Palm CO. Lavagem a seco recomendada.`,
      price: price,
      category: type.categories[0],
      size: size,
      image_url: mainImage,
      gallery: gallery,
      features: ['Curadoria Palm CO.', `Material: ${mat}`, `Cor: ${color}`],
      brand: brand,
      color: [color],
      material: mat,
      stock_quantity: Math.floor(Math.random() * 5) + 1,
      is_sold: false
    });
  }

  return products;
};

async function seed() {
  console.log("🚀 Iniciando processo de Seeding...");

  // 1. Wipe all existing products
  console.log("🧹 Apagando todos os produtos antigos...");
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Truncate hack to delete all

  if (deleteError) {
    console.error("❌ Erro ao deletar produtos antigos:", deleteError.message);
    return;
  }

  console.log("✅ Base de produtos limpa com sucesso!");

  // 2. Generate 50 realistic products
  const productsToInsert = generateProducts(50);

  console.log(`🌱 Inserindo ${productsToInsert.length} novos produtos realistas...`);
  const { error: insertError } = await supabase
    .from('products')
    .insert(productsToInsert);

  if (insertError) {
    console.error("❌ Erro ao inserir produtos:", insertError.message);
    return;
  }

  console.log("🎉 Seeding finalizado com sucesso! Acesse a loja para ver os 50 produtos premium.");
}

seed();
