import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('halite2026', 12)

  await prisma.haliteAdmin.upsert({
    where: { email: 'admin@haliteintelligence.com' },
    update: { password },
    create: {
      email: 'admin@haliteintelligence.com',
      password,
      name: 'Halite Admin',
    },
  })

  const demoBrand = await prisma.brand.upsert({
    where: { slug: 'demo' },
    update: {
      focusAreas: ['SKINCARE', 'HAIR', 'BODY'] as any,
    },
    create: {
      name: 'Demo Brand',
      slug: 'demo',
      focusAreas: ['SKINCARE', 'HAIR', 'BODY'] as any,
    },
  })

  await prisma.brandAdmin.upsert({
    where: { email: 'admin@haliteintelligence.com' },
    update: { password },
    create: {
      brandId: demoBrand.id,
      email: 'admin@haliteintelligence.com',
      password,
      name: 'Halite Admin',
      role: 'OWNER',
    },
  })

  // Demo products for routine generation
  const products = [
    {
      externalId: 'demo-001',
      name: 'Vitamin C Brightening Serum',
      description: 'A potent 15% L-ascorbic acid serum with vitamin E and ferulic acid to brighten, even skin tone, and protect against environmental damage.',
      category: 'SERUM',
      beautyArea: 'SKINCARE',
      concerns: ['HYPERPIGMENTATION', 'DULLNESS', 'UNEVEN_TEXTURE'],
      fitzpatrickTypes: [1, 2, 3, 4, 5, 6],
      skinTypes: ['NORMAL', 'DRY', 'COMBINATION'],
      keyIngredients: ['L-Ascorbic Acid 15%', 'Vitamin E', 'Ferulic Acid'],
      ingredients: ['Aqua', 'L-Ascorbic Acid', 'Propanediol', 'Vitamin E', 'Ferulic Acid', 'Panthenol'],
      price: 48.00,
      currency: 'USD',
    },
    {
      externalId: 'demo-002',
      name: 'Niacinamide 10% + Zinc Pore Minimiser',
      description: 'High-strength niacinamide serum that reduces blemishes, minimises pore appearance, and controls oil production for a balanced complexion.',
      category: 'SERUM',
      beautyArea: 'SKINCARE',
      concerns: ['ACNE', 'PORES', 'OILINESS', 'HYPERPIGMENTATION'],
      fitzpatrickTypes: [1, 2, 3, 4, 5, 6],
      skinTypes: ['OILY', 'COMBINATION'],
      keyIngredients: ['Niacinamide 10%', 'Zinc PCA 1%'],
      ingredients: ['Aqua', 'Niacinamide', 'Pentylene Glycol', 'Zinc PCA', 'Dimethyl Isosorbide'],
      price: 12.90,
      currency: 'USD',
    },
    {
      externalId: 'demo-003',
      name: 'Hyaluronic Acid Deep Hydration Serum',
      description: 'Multi-weight hyaluronic acid complex delivering hydration at multiple skin depths, plumping and smoothing all skin types.',
      category: 'SERUM',
      beautyArea: 'SKINCARE',
      concerns: ['DRYNESS', 'DEHYDRATION', 'AGING'],
      fitzpatrickTypes: [1, 2, 3, 4, 5, 6],
      skinTypes: ['DRY', 'NORMAL', 'COMBINATION', 'SENSITIVE'],
      keyIngredients: ['Hyaluronic Acid', 'Sodium Hyaluronate', 'Panthenol'],
      ingredients: ['Aqua', 'Hyaluronic Acid', 'Sodium Hyaluronate', 'Glycerin', 'Panthenol'],
      price: 29.00,
      currency: 'USD',
    },
    {
      externalId: 'demo-004',
      name: 'SPF 50+ Invisible Daily Moisturiser',
      description: 'Lightweight broad-spectrum SPF50+ moisturiser with no white cast, suitable for all skin tones. Enriched with niacinamide and antioxidants.',
      category: 'SPF',
      beautyArea: 'SKINCARE',
      concerns: ['HYPERPIGMENTATION', 'AGING'],
      fitzpatrickTypes: [1, 2, 3, 4, 5, 6],
      skinTypes: ['NORMAL', 'OILY', 'COMBINATION', 'DRY'],
      keyIngredients: ['Zinc Oxide', 'Titanium Dioxide', 'Niacinamide', 'Vitamin E'],
      ingredients: ['Aqua', 'Zinc Oxide', 'Titanium Dioxide', 'Niacinamide', 'Glycerin', 'Dimethicone'],
      price: 36.00,
      currency: 'USD',
    },
    {
      externalId: 'demo-005',
      name: 'Barrier Repair Ceramide Moisturiser',
      description: 'Rich yet non-greasy moisturiser with ceramides NP, AP, EOP and hyaluronic acid to restore the skin barrier and lock in moisture for 72 hours.',
      category: 'MOISTURIZER',
      beautyArea: 'SKINCARE',
      concerns: ['DRYNESS', 'SENSITIVITY', 'REDNESS'],
      fitzpatrickTypes: [1, 2, 3, 4, 5, 6],
      skinTypes: ['DRY', 'SENSITIVE', 'NORMAL'],
      keyIngredients: ['Ceramides NP/AP/EOP', 'Hyaluronic Acid', 'Cholesterol'],
      ingredients: ['Aqua', 'Caprylic/Capric Triglyceride', 'Ceramide NP', 'Ceramide AP', 'Ceramide EOP', 'Hyaluronic Acid', 'Cholesterol'],
      price: 19.99,
      currency: 'USD',
    },
    {
      externalId: 'demo-006',
      name: 'Retinol 0.3% Renewal Serum',
      description: 'Encapsulated retinol serum for anti-aging, cell renewal and texture refinement. Gentle enough for sensitive skin with squalane buffer.',
      category: 'SERUM',
      beautyArea: 'SKINCARE',
      concerns: ['AGING', 'UNEVEN_TEXTURE', 'DULLNESS'],
      fitzpatrickTypes: [1, 2, 3, 4, 5],
      skinTypes: ['NORMAL', 'DRY', 'COMBINATION'],
      keyIngredients: ['Encapsulated Retinol 0.3%', 'Squalane', 'Bakuchiol'],
      ingredients: ['Aqua', 'Squalane', 'Retinol (Encapsulated)', 'Bakuchiol', 'Niacinamide', 'Glycerin'],
      price: 54.00,
      currency: 'USD',
    },
    {
      externalId: 'demo-007',
      name: 'AHA/BHA Exfoliating Toner 10%',
      description: 'Gentle liquid exfoliant with glycolic acid, lactic acid, and salicylic acid to resurface skin, clear congestion and improve radiance.',
      category: 'TONER',
      beautyArea: 'SKINCARE',
      concerns: ['ACNE', 'PORES', 'DULLNESS', 'UNEVEN_TEXTURE'],
      fitzpatrickTypes: [1, 2, 3, 4, 5, 6],
      skinTypes: ['OILY', 'COMBINATION', 'NORMAL'],
      keyIngredients: ['Glycolic Acid 5%', 'Lactic Acid 3%', 'Salicylic Acid 2%'],
      ingredients: ['Aqua', 'Glycolic Acid', 'Lactic Acid', 'Salicylic Acid', 'Witch Hazel', 'Aloe Vera'],
      price: 22.00,
      currency: 'USD',
    },
    {
      externalId: 'demo-008',
      name: 'Gentle Micellar Gel Cleanser',
      description: 'Soap-free, pH-balanced gel cleanser that effectively removes makeup and impurities without stripping the skin barrier.',
      category: 'CLEANSER',
      beautyArea: 'SKINCARE',
      concerns: ['SENSITIVITY', 'DRYNESS'],
      fitzpatrickTypes: [1, 2, 3, 4, 5, 6],
      skinTypes: ['SENSITIVE', 'DRY', 'NORMAL'],
      keyIngredients: ['Micellar Technology', 'Allantoin', 'Panthenol'],
      ingredients: ['Aqua', 'PEG-6 Caprylic/Capric Glycerides', 'Allantoin', 'Panthenol', 'Glycerin'],
      price: 16.50,
      currency: 'USD',
    },
    {
      externalId: 'demo-009',
      name: 'Centella Calming Ampoule',
      description: 'High-potency centella asiatica ampoule that soothes redness, accelerates healing and strengthens sensitive or reactive skin.',
      category: 'SERUM',
      beautyArea: 'SKINCARE',
      concerns: ['REDNESS', 'SENSITIVITY', 'ACNE'],
      fitzpatrickTypes: [1, 2, 3, 4, 5, 6],
      skinTypes: ['SENSITIVE', 'OILY', 'COMBINATION'],
      keyIngredients: ['Centella Asiatica 80%', 'Madecassoside', 'Asiaticoside'],
      ingredients: ['Centella Asiatica Extract', 'Madecassoside', 'Asiaticoside', 'Asiatic Acid', 'Glycerin'],
      price: 31.00,
      currency: 'USD',
    },
    {
      externalId: 'demo-010',
      name: 'Deep Hydration Hair Mask',
      description: 'Intensive weekly hair mask with shea butter, argan oil and keratin proteins to repair damage, eliminate frizz and restore shine.',
      category: 'HAIR_MASK',
      beautyArea: 'HAIR',
      concerns: [],
      fitzpatrickTypes: [1, 2, 3, 4, 5, 6],
      skinTypes: [],
      keyIngredients: ['Shea Butter', 'Argan Oil', 'Hydrolysed Keratin', 'Biotin'],
      ingredients: ['Aqua', 'Cetearyl Alcohol', 'Shea Butter', 'Argania Spinosa Kernel Oil', 'Hydrolysed Keratin', 'Biotin'],
      price: 28.00,
      currency: 'USD',
    },
    {
      externalId: 'demo-011',
      name: 'Scalp Detox Charcoal Shampoo',
      description: 'Clarifying shampoo with activated charcoal and salicylic acid to deep-cleanse the scalp, remove buildup and balance oil production.',
      category: 'SHAMPOO',
      beautyArea: 'HAIR',
      concerns: [],
      fitzpatrickTypes: [1, 2, 3, 4, 5, 6],
      skinTypes: [],
      keyIngredients: ['Activated Charcoal', 'Salicylic Acid', 'Tea Tree Oil'],
      ingredients: ['Aqua', 'Sodium Laureth Sulfate', 'Activated Charcoal', 'Salicylic Acid', 'Melaleuca Alternifolia Leaf Oil'],
      price: 19.00,
      currency: 'USD',
    },
    {
      externalId: 'demo-012',
      name: 'Body Glow Nourishing Lotion',
      description: 'Fast-absorbing body lotion enriched with shea butter, jojoba oil and vitamin E to deeply nourish and leave skin visibly radiant.',
      category: 'BODY_MOISTURIZER',
      beautyArea: 'BODY',
      concerns: [],
      fitzpatrickTypes: [1, 2, 3, 4, 5, 6],
      skinTypes: ['DRY', 'NORMAL', 'SENSITIVE'],
      keyIngredients: ['Shea Butter', 'Jojoba Oil', 'Vitamin E', 'Hyaluronic Acid'],
      ingredients: ['Aqua', 'Butyrospermum Parkii Butter', 'Simmondsia Chinensis Seed Oil', 'Tocopherol', 'Hyaluronic Acid'],
      price: 24.00,
      currency: 'USD',
    },
  ]

  const slugMap: Record<string, string> = {
    'demo-001': 'vitamin-c-brightening-serum',
    'demo-002': 'niacinamide-10-zinc-pore-minimiser',
    'demo-003': 'hyaluronic-acid-deep-hydration-serum',
    'demo-004': 'spf-50-invisible-daily-moisturiser',
    'demo-005': 'barrier-repair-ceramide-moisturiser',
    'demo-006': 'retinol-0-3-renewal-serum',
    'demo-007': 'aha-bha-exfoliating-toner-10',
    'demo-008': 'gentle-micellar-gel-cleanser',
    'demo-009': 'centella-calming-ampoule',
    'demo-010': 'deep-hydration-hair-mask',
    'demo-011': 'scalp-detox-charcoal-shampoo',
    'demo-012': 'body-glow-nourishing-lotion',
  }
  const BASE_URL = 'https://demo.haliteintelligence.com/products'

  for (const p of products) {
    const productUrl = slugMap[p.externalId] ? `${BASE_URL}/${slugMap[p.externalId]}` : null
    await prisma.product.upsert({
      where: { brandId_externalId: { brandId: demoBrand.id, externalId: p.externalId } },
      update: { name: p.name, description: p.description, price: p.price, productUrl },
      create: {
        brandId: demoBrand.id,
        ...p,
        productUrl,
        category: p.category as any,
        beautyArea: p.beautyArea as any,
        concerns: p.concerns as any,
        skinTypes: p.skinTypes as any,
      },
    })
  }

  console.log(`Seeded ${products.length} demo products`)
  console.log('Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
