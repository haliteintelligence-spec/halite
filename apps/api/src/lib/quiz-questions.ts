// All question definitions for every beauty area.
// Each question has a stable ID, area tag, type, and options.

export type QuestionType = 'single' | 'multi' | 'scale' | 'text' | 'unit_select' | 'area_select' | 'location'
export type BeautyArea = 'SKINCARE' | 'BODY' | 'HAIR' | 'MAKEUP' | 'FRAGRANCE' | 'NAILS' | 'WELLNESS' | 'SUN_CARE' | 'LIP_CARE' | 'EYE_CARE' | 'SHARED'

export interface QuizOption {
  value: string
  label: string
  description?: string
  swatchColor?: string // hex color for Monk Skin Tone picker
  imageHint?: string   // image identifier for visual pickers (e.g. hair type)
}

export interface QuizQuestion {
  id: string
  area: BeautyArea
  type: QuestionType
  question: string
  subtext?: string
  options?: QuizOption[]
  // For unit_select: unit options with their labelled choices
  units?: Array<{ unit: string; label: string; options: QuizOption[] }>
  // For scale: min/max labels
  scaleMin?: string
  scaleMax?: string
  scaleSteps?: number
  required?: boolean
}

// ── SKINCARE ──────────────────────────────────────────────────────────────

export const SKINCARE_QUESTIONS: QuizQuestion[] = [
  {
    id: 'S1',
    area: 'SKINCARE',
    type: 'single',
    question: 'How does your skin feel by midday without any products?',
    required: true,
    options: [
      { value: 'oily_all', label: 'Oily all over', description: 'Shiny, enlarged pores, makeup slides off' },
      { value: 'oily_tzone', label: 'Oily T-zone only', description: 'Shiny forehead, nose and chin — dry cheeks' },
      { value: 'normal', label: 'Normal', description: 'Balanced — not too oily, not too dry' },
      { value: 'dry', label: 'Dry', description: 'Tight, dull, flakes occasionally' },
      { value: 'very_dry', label: 'Very dry', description: 'Tight, rough, cracks or peels' },
    ],
  },
  {
    id: 'S2',
    area: 'SKINCARE',
    type: 'single',
    question: 'How often do you experience breakouts?',
    options: [
      { value: 'rarely', label: 'Rarely', description: 'Once every few months or less' },
      { value: 'sometimes', label: 'Sometimes', description: 'Around my period or with stress' },
      { value: 'often', label: 'Often', description: 'Weekly or more' },
      { value: 'almost_always', label: 'Almost always', description: 'Persistent, hard to control' },
    ],
  },
  {
    id: 'S3',
    area: 'SKINCARE',
    type: 'single',
    question: 'How does your skin react to new products?',
    options: [
      { value: 'no_reaction', label: 'No reaction', description: 'I can use almost anything' },
      { value: 'mildly_sensitive', label: 'Mildly sensitive', description: 'Occasional redness or tingling' },
      { value: 'very_sensitive', label: 'Very sensitive', description: 'Reacts to fragrance, alcohol or certain actives' },
      { value: 'extremely_sensitive', label: 'Extremely sensitive', description: 'Reacts to most products' },
    ],
  },
  {
    id: 'S4',
    area: 'SKINCARE',
    type: 'multi',
    question: 'What are your top skin concerns?',
    subtext: 'Select all that apply',
    options: [
      { value: 'ACNE', label: 'Acne & breakouts' },
      { value: 'HYPERPIGMENTATION', label: 'Hyperpigmentation & dark spots' },
      { value: 'AGING', label: 'Fine lines & aging' },
      { value: 'DRYNESS', label: 'Dryness & flakiness' },
      { value: 'OILINESS', label: 'Excess oil & shine' },
      { value: 'REDNESS', label: 'Redness & rosacea' },
      { value: 'DULLNESS', label: 'Dullness & uneven tone' },
      { value: 'UNEVEN_TEXTURE', label: 'Uneven texture & pores' },
      { value: 'DARK_CIRCLES', label: 'Dark circles' },
      { value: 'PORES', label: 'Enlarged pores' },
      { value: 'DEHYDRATION', label: 'Dehydration' },
      { value: 'SENSITIVITY', label: 'Sensitivity & irritation' },
    ],
  },
  {
    id: 'S5',
    area: 'SKINCARE',
    type: 'single',
    question: 'Which best matches your natural skin tone?',
    subtext: 'Based on the Monk Skin Tone Scale — helps us recommend formulations that work with your complexion',
    required: true,
    options: [
      { value: '1',  label: 'MST 1',  description: 'Very light',        swatchColor: '#f6ede4' },
      { value: '2',  label: 'MST 2',  description: 'Light',             swatchColor: '#f3e7db' },
      { value: '3',  label: 'MST 3',  description: 'Light to medium',   swatchColor: '#f7ead0' },
      { value: '4',  label: 'MST 4',  description: 'Medium',            swatchColor: '#eadaba' },
      { value: '5',  label: 'MST 5',  description: 'Medium to tan',     swatchColor: '#d7bd96' },
      { value: '6',  label: 'MST 6',  description: 'Tan to rich',       swatchColor: '#a07e56' },
      { value: '7',  label: 'MST 7',  description: 'Deep brown',        swatchColor: '#825c43' },
      { value: '8',  label: 'MST 8',  description: 'Rich brown',        swatchColor: '#604134' },
      { value: '9',  label: 'MST 9',  description: 'Deep',              swatchColor: '#3a312a' },
      { value: '10', label: 'MST 10', description: 'Deepest',           swatchColor: '#292420' },
    ],
  },
]

// ── BODY ──────────────────────────────────────────────────────────────────

export const BODY_QUESTIONS: QuizQuestion[] = [
  {
    id: 'B1',
    area: 'BODY',
    type: 'single',
    question: 'How does the skin on your body feel in general?',
    options: [
      { value: 'very_dry', label: 'Very dry', description: 'Rough, flaky, tight — especially after showering' },
      { value: 'dry', label: 'Dry', description: 'Needs moisturizer daily' },
      { value: 'normal', label: 'Normal', description: 'Comfortable without daily moisturizer' },
      { value: 'oily', label: 'Oily', description: 'Prone to body breakouts' },
      { value: 'sensitive', label: 'Sensitive', description: 'Reacts to fragranced or harsh products' },
    ],
  },
  {
    id: 'B2',
    area: 'BODY',
    type: 'multi',
    question: 'What are your main body skin concerns?',
    subtext: 'Select all that apply',
    options: [
      { value: 'dryness', label: 'Dryness & rough patches' },
      { value: 'stretch_marks', label: 'Stretch marks' },
      { value: 'cellulite', label: 'Cellulite' },
      { value: 'keratosis_pilaris', label: 'Keratosis pilaris (bumpy skin on arms/thighs)' },
      { value: 'body_acne', label: 'Body acne (back, chest, shoulders)' },
      { value: 'uneven_tone', label: 'Uneven skin tone or hyperpigmentation' },
      { value: 'ingrown_hairs', label: 'Ingrown hairs' },
      { value: 'eczema', label: 'Eczema or psoriasis' },
      { value: 'dullness', label: 'Dull or ashy skin' },
    ],
  },
  {
    id: 'B3',
    area: 'BODY',
    type: 'single',
    question: 'Do you shave or wax regularly?',
    options: [
      { value: 'shave', label: 'I shave regularly' },
      { value: 'wax', label: 'I wax or thread' },
      { value: 'both', label: 'Both, depending on the area' },
      { value: 'neither', label: 'Neither' },
    ],
  },
  {
    id: 'B4',
    area: 'BODY',
    type: 'single',
    question: 'Do you prefer scented or fragrance-free body products?',
    options: [
      { value: 'love_fragrance', label: 'I love fragrance' },
      { value: 'light_scent', label: 'Light, natural scents only' },
      { value: 'fragrance_free', label: 'Fragrance-free only' },
      { value: 'no_preference', label: 'No preference' },
    ],
  },
]

// ── HAIR ──────────────────────────────────────────────────────────────────

export const HAIR_QUESTIONS: QuizQuestion[] = [
  {
    id: 'H1',
    area: 'HAIR',
    type: 'single',
    question: 'What is your hair texture?',
    options: [
      { value: 'fine', label: 'Fine', description: 'Strands are thin — can look flat or limp' },
      { value: 'medium', label: 'Medium', description: 'Average thickness' },
      { value: 'thick_coarse', label: 'Thick / Coarse', description: 'Dense, voluminous strands' },
    ],
  },
  {
    id: 'H2',
    area: 'HAIR',
    type: 'single',
    question: 'What is your natural curl pattern?',
    options: [
      { value: '1', label: 'Straight (Type 1)', description: 'No natural curl or wave', imageHint: 'hair-1' },
      { value: '2', label: 'Wavy (Type 2)', description: 'S-shaped waves, prone to frizz', imageHint: 'hair-2' },
      { value: '3', label: 'Curly (Type 3)', description: 'Defined spirals or ringlets', imageHint: 'hair-3' },
      { value: '4', label: 'Coily / Kinky (Type 4)', description: 'Tight coils or zigzag pattern', imageHint: 'hair-4' },
    ],
  },
  {
    id: 'H3',
    area: 'HAIR',
    type: 'single',
    question: 'How does your scalp feel between washes?',
    options: [
      { value: 'oily', label: 'Oily', description: 'Greasy within 1–2 days' },
      { value: 'normal', label: 'Normal', description: 'Comfortable for several days' },
      { value: 'dry', label: 'Dry', description: 'Tight, itchy' },
      { value: 'flaky', label: 'Flaky / Dandruff', description: 'Visible flaking' },
      { value: 'sensitive', label: 'Sensitive', description: 'Reacts to many products' },
    ],
  },
  {
    id: 'H4',
    area: 'HAIR',
    type: 'multi',
    question: 'What are your main hair concerns?',
    subtext: 'Select all that apply',
    options: [
      { value: 'frizz', label: 'Frizz & flyaways' },
      { value: 'breakage', label: 'Breakage & split ends' },
      { value: 'dandruff', label: 'Dandruff & flaking' },
      { value: 'thinning', label: 'Thinning & hair loss' },
      { value: 'dryness', label: 'Dryness & brittleness' },
      { value: 'curl_definition', label: 'Lack of curl definition' },
      { value: 'color_damage', label: 'Color damage' },
      { value: 'heat_damage', label: 'Heat damage' },
      { value: 'oily_scalp', label: 'Oily scalp' },
      { value: 'slow_growth', label: 'Slow growth' },
      { value: 'porosity', label: 'Product buildup / high porosity' },
    ],
  },
  {
    id: 'H5',
    area: 'HAIR',
    type: 'single',
    question: 'How often do you use heat styling tools?',
    options: [
      { value: 'never', label: 'Never' },
      { value: 'rarely', label: 'Rarely — a few times a month' },
      { value: 'sometimes', label: 'Sometimes — a few times a week' },
      { value: 'often', label: 'Often — almost every day' },
    ],
  },
  {
    id: 'H6',
    area: 'HAIR',
    type: 'multi',
    question: 'Is your hair chemically treated?',
    subtext: 'Select all that apply',
    options: [
      { value: 'none', label: 'None — my hair is natural' },
      { value: 'color', label: 'Color or highlights' },
      { value: 'bleach', label: 'Bleached' },
      { value: 'relaxer', label: 'Relaxer or perm' },
      { value: 'keratin', label: 'Keratin or Brazilian blowout' },
      { value: 'loc', label: 'Locs' },
    ],
  },
]

// ── MAKEUP ────────────────────────────────────────────────────────────────

export const MAKEUP_QUESTIONS: QuizQuestion[] = [
  {
    id: 'M1',
    area: 'MAKEUP',
    type: 'single',
    question: "What is your skin's undertone?",
    options: [
      { value: 'warm', label: 'Warm', description: 'Golden, peachy, or yellow hues' },
      { value: 'cool', label: 'Cool', description: 'Pink, red, or bluish hues' },
      { value: 'neutral', label: 'Neutral', description: 'A mix of both' },
      { value: 'unsure', label: "I'm not sure" },
    ],
  },
  {
    id: 'M2',
    area: 'MAKEUP',
    type: 'single',
    question: 'What coverage do you prefer for base products?',
    options: [
      { value: 'light', label: 'Light', description: 'Let skin show through — a natural finish' },
      { value: 'medium', label: 'Medium', description: 'Even out skin tone, hide minor blemishes' },
      { value: 'full', label: 'Full', description: 'Complete coverage, flawless finish' },
      { value: 'varies', label: 'Depends on the occasion' },
    ],
  },
  {
    id: 'M3',
    area: 'MAKEUP',
    type: 'single',
    question: 'What finish do you prefer?',
    options: [
      { value: 'matte', label: 'Matte', description: 'No shine, shine-controlled' },
      { value: 'satin', label: 'Natural / Satin', description: 'Soft, comfortable, slight sheen' },
      { value: 'dewy', label: 'Dewy', description: 'Glowy, luminous, skin-like' },
      { value: 'varies', label: 'Depends on the look' },
    ],
  },
  {
    id: 'M4',
    area: 'MAKEUP',
    type: 'multi',
    question: 'What skin concerns do you want your makeup to address?',
    subtext: 'Select all that apply',
    options: [
      { value: 'redness', label: 'Redness & rosacea' },
      { value: 'dark_circles', label: 'Dark circles' },
      { value: 'hyperpigmentation', label: 'Hyperpigmentation & dark spots' },
      { value: 'acne', label: 'Acne & blemishes' },
      { value: 'pores', label: 'Enlarged pores' },
      { value: 'uneven_texture', label: 'Uneven texture' },
      { value: 'dullness', label: 'Dullness' },
    ],
  },
  {
    id: 'M5',
    area: 'MAKEUP',
    type: 'single',
    question: 'How long do you need your makeup to last?',
    options: [
      { value: '4h', label: '4 hours', description: 'Quick meeting or event' },
      { value: '8h', label: '8 hours', description: 'A full workday' },
      { value: '12h', label: '12+ hours', description: 'All day and into the evening' },
    ],
  },
]

// ── FRAGRANCE ─────────────────────────────────────────────────────────────

export const FRAGRANCE_QUESTIONS: QuizQuestion[] = [
  {
    id: 'F1',
    area: 'FRAGRANCE',
    type: 'multi',
    question: 'Which scent families appeal to you?',
    subtext: 'Select all that apply',
    options: [
      { value: 'floral', label: 'Floral', description: 'Rose, jasmine, peony, lily' },
      { value: 'fresh_citrus', label: 'Fresh / Citrus', description: 'Lemon, bergamot, green, aquatic' },
      { value: 'woody_earthy', label: 'Woody / Earthy', description: 'Sandalwood, cedar, patchouli, vetiver' },
      { value: 'oriental_spicy', label: 'Oriental / Spicy', description: 'Vanilla, amber, oud, cinnamon' },
      { value: 'gourmand', label: 'Gourmand', description: 'Chocolate, caramel, sweet bakery notes' },
      { value: 'musky', label: 'Musky / Clean', description: 'Skin-like, soft, powdery' },
    ],
  },
  {
    id: 'F2',
    area: 'FRAGRANCE',
    type: 'multi',
    question: 'What occasions do you wear fragrance for?',
    options: [
      { value: 'daily', label: 'Everyday wear' },
      { value: 'work', label: 'Work / Professional' },
      { value: 'evening', label: 'Evening out' },
      { value: 'special', label: 'Special occasions' },
      { value: 'sport', label: 'Sport & outdoors' },
    ],
  },
  {
    id: 'F3',
    area: 'FRAGRANCE',
    type: 'single',
    question: 'How long do you want your fragrance to last?',
    options: [
      { value: 'light', label: 'Light & subtle — 2–4 hours' },
      { value: 'moderate', label: 'All day — 6–8 hours' },
      { value: 'long', label: 'Long-lasting — 10+ hours' },
    ],
  },
  {
    id: 'F4',
    area: 'FRAGRANCE',
    type: 'multi',
    question: 'Are there any notes you dislike?',
    subtext: 'Optional — helps us filter out scents you hate',
    options: [
      { value: 'floral', label: 'Heavy florals' },
      { value: 'sweet', label: 'Very sweet / sugary' },
      { value: 'smoky', label: 'Smoky or incense' },
      { value: 'fishy_marine', label: 'Marine / aquatic' },
      { value: 'musky', label: 'Heavy musk' },
      { value: 'none', label: 'No dislikes' },
    ],
  },
]

// ── NAILS ─────────────────────────────────────────────────────────────────

export const NAILS_QUESTIONS: QuizQuestion[] = [
  {
    id: 'N1',
    area: 'NAILS',
    type: 'multi',
    question: 'What is the condition of your nails?',
    options: [
      { value: 'brittle_breaking', label: 'Brittle & breaking' },
      { value: 'peeling', label: 'Peeling' },
      { value: 'ridged', label: 'Ridged or bumpy' },
      { value: 'soft_weak', label: 'Soft & weak' },
      { value: 'healthy', label: 'Healthy — no major concerns' },
    ],
  },
  {
    id: 'N2',
    area: 'NAILS',
    type: 'multi',
    question: 'What nail concerns do you have?',
    options: [
      { value: 'slow_growth', label: 'Slow growth' },
      { value: 'yellowing', label: 'Yellowing' },
      { value: 'dry_cuticles', label: 'Dry or ragged cuticles' },
      { value: 'white_spots', label: 'White spots' },
      { value: 'nail_fungus', label: 'Nail fungus' },
    ],
  },
  {
    id: 'N3',
    area: 'NAILS',
    type: 'single',
    question: 'Do you wear gel or acrylic enhancements?',
    options: [
      { value: 'gel', label: 'Gel' },
      { value: 'acrylic', label: 'Acrylic' },
      { value: 'both', label: 'Both' },
      { value: 'none', label: 'Natural nails only' },
    ],
  },
  {
    id: 'N4',
    area: 'NAILS',
    type: 'multi',
    question: "What are you looking for in nail products?",
    options: [
      { value: 'strengthening', label: 'Strengthening treatment' },
      { value: 'growth', label: 'Growth stimulation' },
      { value: 'color', label: 'Nail color' },
      { value: 'cuticle_care', label: 'Cuticle care' },
      { value: 'base_top', label: 'Base & top coat' },
      { value: 'repair', label: 'Repair & restoration' },
    ],
  },
]

// ── WELLNESS ──────────────────────────────────────────────────────────────

export const WELLNESS_QUESTIONS: QuizQuestion[] = [
  {
    id: 'W1',
    area: 'WELLNESS',
    type: 'multi',
    question: 'What are your primary wellness goals?',
    options: [
      { value: 'skin_health', label: 'Skin health & glow' },
      { value: 'hair_health', label: 'Hair health & growth' },
      { value: 'nail_health', label: 'Nail strength' },
      { value: 'energy', label: 'Energy & vitality' },
      { value: 'sleep', label: 'Better sleep' },
      { value: 'immunity', label: 'Immunity support' },
      { value: 'gut_health', label: 'Gut health' },
      { value: 'hormonal_balance', label: 'Hormonal balance' },
      { value: 'stress', label: 'Stress management' },
      { value: 'weight', label: 'Weight management' },
    ],
  },
  {
    id: 'W2',
    area: 'WELLNESS',
    type: 'multi',
    question: 'Do you follow any dietary restrictions?',
    options: [
      { value: 'none', label: 'None' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'gluten_free', label: 'Gluten-free' },
      { value: 'halal', label: 'Halal' },
      { value: 'kosher', label: 'Kosher' },
      { value: 'dairy_free', label: 'Dairy-free' },
      { value: 'nut_free', label: 'Nut-free' },
    ],
  },
  {
    id: 'W3',
    area: 'WELLNESS',
    type: 'single',
    question: 'Do you currently take any supplements?',
    subtext: 'Helps us avoid recommending duplicates',
    options: [
      { value: 'yes', label: 'Yes — several' },
      { value: 'some', label: 'Yes — a couple' },
      { value: 'no', label: 'No' },
    ],
  },
]

// ── SUN CARE ──────────────────────────────────────────────────────────────

export const SUN_CARE_QUESTIONS: QuizQuestion[] = [
  {
    id: 'SC1',
    area: 'SUN_CARE',
    type: 'single',
    question: 'How much time do you spend outdoors daily?',
    options: [
      { value: 'under_30', label: 'Under 30 minutes' },
      { value: '30_to_2h', label: '30 minutes – 2 hours' },
      { value: 'over_2h', label: 'Over 2 hours' },
    ],
  },
  {
    id: 'SC2',
    area: 'SUN_CARE',
    type: 'multi',
    question: 'What activities are you protecting your skin for?',
    options: [
      { value: 'daily_city', label: 'Daily city wear & commuting' },
      { value: 'outdoor_sports', label: 'Outdoor sports & exercise' },
      { value: 'beach_swimming', label: 'Beach or swimming' },
      { value: 'hiking_altitude', label: 'Hiking or high altitude' },
      { value: 'skiing', label: 'Skiing / Snow sports' },
      { value: 'driving', label: 'Long drives (window sun exposure)' },
    ],
  },
  {
    id: 'SC3',
    area: 'SUN_CARE',
    type: 'single',
    question: 'Do you prefer chemical or mineral SPF?',
    options: [
      { value: 'chemical', label: 'Chemical', description: 'Lightweight, invisible finish' },
      { value: 'mineral', label: 'Mineral', description: 'Zinc/titanium — better for sensitive skin' },
      { value: 'no_preference', label: 'No preference — just good protection' },
    ],
  },
  {
    id: 'SC4',
    area: 'SUN_CARE',
    type: 'single',
    question: 'What texture do you prefer for SPF?',
    options: [
      { value: 'fluid', label: 'Lightweight fluid or serum' },
      { value: 'cream', label: 'Cream' },
      { value: 'stick', label: 'Stick (easy reapplication)' },
      { value: 'spray', label: 'Spray' },
      { value: 'tinted', label: 'Tinted (doubles as coverage)' },
    ],
  },
  {
    id: 'SC5',
    area: 'SUN_CARE',
    type: 'single',
    question: 'Does your SPF need to layer well under makeup?',
    options: [
      { value: 'yes', label: 'Yes — I wear makeup over it daily' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'no', label: 'No — I wear it alone' },
    ],
  },
]

// ── LIP CARE ──────────────────────────────────────────────────────────────

export const LIP_QUESTIONS: QuizQuestion[] = [
  {
    id: 'L1',
    area: 'LIP_CARE',
    type: 'single',
    question: 'What is the condition of your lips?',
    options: [
      { value: 'very_dry_cracked', label: 'Very dry / cracked' },
      { value: 'dry_chapped', label: 'Dry & chapped' },
      { value: 'normal', label: 'Normal — comfortable most of the time' },
      { value: 'pigmented', label: 'Pigmented or uneven lip tone' },
    ],
  },
  {
    id: 'L2',
    area: 'LIP_CARE',
    type: 'multi',
    question: 'What do you need from a lip product?',
    options: [
      { value: 'hydration', label: 'Deep hydration' },
      { value: 'plumping', label: 'Plumping & volume' },
      { value: 'spf', label: 'SPF protection' },
      { value: 'tinted', label: 'Tint or color' },
      { value: 'healing', label: 'Healing & repair' },
      { value: 'overnight', label: 'Overnight treatment' },
      { value: 'exfoliation', label: 'Gentle exfoliation' },
    ],
  },
  {
    id: 'L3',
    area: 'LIP_CARE',
    type: 'single',
    question: 'Do you wear lipstick or lip gloss regularly?',
    options: [
      { value: 'daily', label: 'Daily' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'rarely', label: 'Rarely' },
      { value: 'never', label: 'Never' },
    ],
  },
]

// ── EYE & BROW CARE ───────────────────────────────────────────────────────

export const EYE_QUESTIONS: QuizQuestion[] = [
  {
    id: 'E1',
    area: 'EYE_CARE',
    type: 'multi',
    question: 'What are your eye area concerns?',
    options: [
      { value: 'dark_circles', label: 'Dark circles' },
      { value: 'puffiness', label: 'Puffiness & bags' },
      { value: 'fine_lines', label: 'Fine lines & crow\'s feet' },
      { value: 'sparse_lashes', label: 'Sparse or thinning lashes' },
      { value: 'sparse_brows', label: 'Sparse or patchy brows' },
      { value: 'dryness', label: 'Dryness & crepiness' },
      { value: 'drooping', label: 'Hooded or drooping lids' },
    ],
  },
  {
    id: 'E2',
    area: 'EYE_CARE',
    type: 'single',
    question: 'Do you wear contact lenses?',
    options: [
      { value: 'yes_daily', label: 'Yes — daily' },
      { value: 'yes_sometimes', label: 'Yes — occasionally' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'E3',
    area: 'EYE_CARE',
    type: 'single',
    question: 'Do you wear eye makeup regularly?',
    options: [
      { value: 'daily', label: 'Daily' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'rarely', label: 'Rarely' },
    ],
  },
]

// ── SHARED (asked once regardless of areas selected) ──────────────────────

export const SHARED_QUESTIONS: QuizQuestion[] = [
  {
    id: 'SH0',
    area: 'SHARED',
    type: 'single',
    question: 'What is your age range?',
    subtext: 'Helps us match formulations and active ingredients appropriate for your skin\'s stage',
    required: true,
    options: [
      { value: 'under_18', label: 'Under 18', description: 'Gentle, non-active-heavy formulations' },
      { value: '18_24', label: '18 – 24', description: 'Prevention, balancing, early care' },
      { value: '25_34', label: '25 – 34', description: 'Early prevention, antioxidants, hydration' },
      { value: '35_44', label: '35 – 44', description: 'Targeted actives, firming, pigmentation' },
      { value: '45_54', label: '45 – 54', description: 'Richer formulations, retinoids, collagen support' },
      { value: '55_64', label: '55 – 64', description: 'Intensive nourishment, barrier repair' },
      { value: '65_plus', label: '65+', description: 'Gentle yet potent, barrier-focused' },
    ],
  },
  {
    id: 'SH1',
    area: 'SHARED',
    type: 'location',
    question: 'What city do you live in?',
    subtext: 'Enter your city, country code (NG), state code (NY), or airport code (LOS). We use this to match products to your climate.',
    required: true,
  },
  {
    id: 'SH2A',
    area: 'SHARED',
    type: 'single',
    question: 'How would you like your recommendations?',
    required: true,
    options: [
      { value: 'SINGLE', label: 'Single product', description: "I'm looking for one specific product" },
      { value: 'ROUTINE', label: 'Full routine', description: 'I want a complete multi-step routine' },
    ],
  },
  {
    id: 'SH2B',
    area: 'SHARED',
    type: 'multi',
    question: 'Which product categories do you want included?',
    subtext: 'We\'ve pre-selected based on your concerns — adjust as you like',
    // options are built dynamically by quiz-engine based on brand focus + selected areas
    options: [],
  },
  {
    id: 'SH3',
    area: 'SHARED',
    type: 'single',
    question: 'How much are you looking to spend?',
    // copy and options built dynamically based on SH2A answer
    options: [],
  },
  {
    id: 'SH4',
    area: 'SHARED',
    type: 'unit_select',
    question: 'How much water do you drink daily?',
    units: [
      {
        unit: 'L',
        label: 'Litres (L)',
        options: [
          { value: '500', label: 'Less than 1L' },
          { value: '1250', label: '1L – 1.5L' },
          { value: '1750', label: '1.5L – 2L' },
          { value: '2250', label: '2L – 2.5L' },
          { value: '3000', label: 'More than 2.5L' },
        ],
      },
      {
        unit: 'gal',
        label: 'Gallons (gal)',
        options: [
          { value: '500', label: 'Less than ¼ gal' },
          { value: '1250', label: '¼ – ½ gal' },
          { value: '1750', label: '½ – ¾ gal' },
          { value: '2250', label: '¾ – 1 gal' },
          { value: '3000', label: 'More than 1 gal' },
        ],
      },
      {
        unit: 'ml',
        label: 'Millilitres (ml)',
        options: [
          { value: '500', label: 'Less than 1,000 ml' },
          { value: '1250', label: '1,000 – 1,500 ml' },
          { value: '1750', label: '1,500 – 2,000 ml' },
          { value: '2250', label: '2,000 – 2,500 ml' },
          { value: '3000', label: 'More than 2,500 ml' },
        ],
      },
    ],
  },
  {
    id: 'SH5',
    area: 'SHARED',
    type: 'single',
    question: 'How many hours of sleep do you typically get?',
    options: [
      { value: '4', label: 'Under 5 hours' },
      { value: '6', label: '5 – 7 hours' },
      { value: '8', label: '7 – 9 hours' },
      { value: '9.5', label: 'Over 9 hours' },
    ],
  },
  {
    id: 'SH6',
    area: 'SHARED',
    type: 'scale',
    question: 'How would you rate your stress level?',
    subtext: '1 = very calm · 5 = very stressed',
    scaleMin: 'Very calm',
    scaleMax: 'Very stressed',
    scaleSteps: 5,
  },
]

// ── Question map by area ───────────────────────────────────────────────────

export const QUESTIONS_BY_AREA: Record<string, QuizQuestion[]> = {
  SKINCARE: SKINCARE_QUESTIONS,
  BODY: BODY_QUESTIONS,
  HAIR: HAIR_QUESTIONS,
  MAKEUP: MAKEUP_QUESTIONS,
  FRAGRANCE: FRAGRANCE_QUESTIONS,
  NAILS: NAILS_QUESTIONS,
  WELLNESS: WELLNESS_QUESTIONS,
  SUN_CARE: SUN_CARE_QUESTIONS,
  LIP_CARE: LIP_QUESTIONS,
  EYE_CARE: EYE_QUESTIONS,
}
