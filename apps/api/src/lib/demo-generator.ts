import bcrypt from 'bcryptjs'
import { prisma } from '@halite/db'
import { generateRoutine } from './routine-generator.js'
import { runAgentWorkflow } from './agent-runner.js'
import type { PurchaseMatrix } from './purchase-history-processor.js'

// ── Pre-built workflow definitions ────────────────────────────────────────────

const PREBUILT_WORKFLOWS = [
  {
    name: 'Routine Outcome Agent',
    description: 'Analyses consumer profiles, ingredient interactions, and check-in trajectories to predict routine efficacy and recommend adaptive changes.',
    type: 'ROUTINE_OUTCOME' as const,
    isPrebuilt: true,
    config: {
      trigger: 'scheduled_weekly',
      dataSources: ['consumers', 'checkIns', 'products', 'routines'],
      objectivePrompt: `You are a beauty intelligence agent for {{brand_name}}.
Analyse the following consumer profiles, their assigned routines, and check-in outcome data.

Identify:
1. Which routine configurations are producing the best skin rating improvements (week-over-week)
2. Any ingredient combinations that correlate with negative outcomes (irritation, REDNESS, BREAKOUT symptoms)
3. Consumer segments where efficacy is below average, with specific hypotheses for why
4. Three concrete routine modifications the brand should make, ranked by projected impact

Consumer data: {{consumer_profiles}}
Routine data: {{routine_assignments}}
Check-in outcomes: {{recent_check_ins}}
Product catalog: {{product_catalog}}`,
      outputSchema: { type: 'insight_cards', maxCards: 5, includeRecommendations: true },
      filters: { minCheckIns: 3 },
    },
  },
  {
    name: 'Churn & Dissatisfaction Prediction',
    description: 'Monitors engagement signals, compliance drops, and sentiment changes to predict at-risk consumers before they abandon their routine.',
    type: 'CHURN_PREDICTION' as const,
    isPrebuilt: true,
    config: {
      trigger: 'scheduled_daily',
      dataSources: ['consumers', 'checkIns', 'routines'],
      objectivePrompt: `You are a retention intelligence agent for {{brand_name}}.
Analyse consumer check-in patterns, compliance rates, and skin rating trajectories.

Identify consumers at elevated churn risk using these signals:
- Declining skin ratings over last 3 check-ins
- Compliance dropping below 50% in the last 2 weeks
- Negative symptom frequency increasing (BREAKOUT, IRRITATION, REDNESS)
- No check-in in the last 14 days

For each at-risk segment, provide:
1. Risk level (HIGH / MEDIUM)
2. Most likely root cause (product mismatch, over-exfoliation, wrong routine for climate, etc.)
3. Specific intervention: product swap, routine simplification, or educational message
4. Expected retention lift if intervention is applied

Consumer data: {{consumer_profiles}}
Check-in history: {{recent_check_ins}}`,
      outputSchema: { type: 'risk_alerts', includeInterventions: true },
      filters: { minCheckIns: 2 },
    },
  },
  {
    name: 'Product Intelligence Agent',
    description: 'Aggregates outcome patterns, ingredient correlations, and cohort performance to surface formulation opportunities and white space.',
    type: 'PRODUCT_INTELLIGENCE' as const,
    isPrebuilt: true,
    config: {
      trigger: 'scheduled_weekly',
      dataSources: ['products', 'checkIns', 'consumers'],
      objectivePrompt: `You are a product intelligence agent for {{brand_name}}.
Analyse consumer outcomes correlated with product usage and ingredient profiles.

Surface:
1. Which specific ingredients are consistently correlated with positive outcomes across which skin concern cohorts
2. Any formulation weaknesses — ingredients or combinations that appear in routines with below-average outcomes
3. Unmet needs: consumer concern segments that are underserved by the current catalog
4. One formulation opportunity: a specific ingredient pairing or product gap with estimated consumer addressable market size

Product catalog: {{product_catalog}}
Consumer profiles: {{consumer_profiles}}
Check-in outcomes: {{recent_check_ins}}`,
      outputSchema: { type: 'insight_cards', maxCards: 4, includeOpportunities: true },
      filters: {},
    },
  },
  {
    name: 'Personalized Conversion Agent',
    description: 'For a given consumer profile, predicts best-fit products and likelihood of routine success using longitudinal cohort data.',
    type: 'CONVERSION' as const,
    isPrebuilt: true,
    config: {
      trigger: 'manual',
      dataSources: ['consumers', 'products', 'checkIns'],
      objectivePrompt: `You are a personalized recommendation agent for {{brand_name}}.
Given a consumer's profile, identify the top 3 product combinations most likely to produce positive outcomes.

For each recommendation:
1. State the confidence level (%) based on how similar consumers have responded
2. Explain the ingredient rationale for this consumer's specific profile
3. Flag any risk factors (e.g. "retinol not recommended for sensitive skin consumers in dry climates")
4. Predict the outcome trajectory over 4–6 weeks if the routine is followed

Consumer profile: {{consumer_profiles}}
Available products: {{product_catalog}}
Cohort benchmark data: {{recent_check_ins}}`,
      outputSchema: { type: 'product_recommendations', maxItems: 3, includeConfidence: true },
      filters: {},
    },
  },
  {
    name: 'Executive Intelligence Agent',
    description: 'Autonomous weekly scan of the full consumer base — surfaces risks, opportunities, anomalies, and strategic recommendations for leadership.',
    type: 'EXECUTIVE_INTELLIGENCE' as const,
    isPrebuilt: true,
    config: {
      trigger: 'scheduled_weekly',
      dataSources: ['consumers', 'checkIns', 'products', 'routines'],
      objectivePrompt: `You are an executive intelligence agent for {{brand_name}}.
Produce a strategic briefing from this week's consumer data.

Your briefing must cover:
1. RETENTION: Any notable shifts in compliance, check-in frequency, or rating trends this week
2. PRODUCT PERFORMANCE: Top performer and underperformer, with data rationale
3. CONSUMER COHORTS: Any emerging segment showing unusual patterns (positive or negative)
4. RISK SIGNAL: One concrete risk the brand should act on in the next 7 days
5. OPPORTUNITY: One data-backed opportunity to improve consumer outcomes or revenue

Be specific. Use numbers. Reference actual product names and concern types.
Write in a direct, executive-briefing tone — no fluff.

Full brand data snapshot: {{full_brand_snapshot}}`,
      outputSchema: { type: 'executive_briefing', sections: 5 },
      filters: {},
    },
  },
]

// ── Name banks for synthetic consumers ───────────────────────────────────────

const FIRST_NAMES = [
  'Aisha','Brianna','Chloe','Danielle','Elena','Fatima','Grace','Hannah','Imani','Jade',
  'Kezia','Layla','Maya','Nadia','Olivia','Priya','Quinn','Rachel','Sofia','Tara',
  'Uma','Victoria','Wendy','Xara','Yasmin','Zoe','Amara','Beth','Camille','Diana',
  'Esther','Fiona','Gabi','Hana','Iris','Jess','Kira','Leila','Mia','Nia',
  'Obi','Phoebe','Rosa','Sage','Tina','Ursula','Vera','Wren','Xena','Yara',
  'Aaliyah','Bianca','Carmen','Deja','Emilia','Fatou','Geneva','Harmony','India','Jasmine',
  'Kendra','Lola','Maria','Naomi','Octavia','Pearl','Raina','Sasha','Talia','Unique',
]

const LAST_NAMES = [
  'Adams','Baker','Carter','Davis','Evans','Foster','Garcia','Harris','Iyer','Jones',
  'Kim','Lopez','Martin','Nguyen','Osei','Patel','Quinn','Rivera','Smith','Taylor',
  'Ueda','Vargas','Walker','Xu','Young','Zhang','Adeyemi','Brooks','Chen','Diaz',
  'Edwards','Franklin','Green','Hill','Johnson','King','Lee','Moore','Nelson','Owen',
  'Parker','Reed','Scott','Thomas','Underwood','Vasquez','Williams','Xavier','Yamamoto','Zander',
]

const US_CITIES = [
  'New York, NY','Los Angeles, CA','Chicago, IL','Houston, TX','Phoenix, AZ',
  'Philadelphia, PA','San Antonio, TX','San Diego, CA','Dallas, TX','San Jose, CA',
  'Atlanta, GA','Austin, TX','Jacksonville, FL','Fort Worth, TX','Columbus, OH',
  'Charlotte, NC','Indianapolis, IN','San Francisco, CA','Seattle, WA','Denver, CO',
  'Washington, DC','Nashville, TN','Oklahoma City, OK','El Paso, TX','Boston, MA',
  'Portland, OR','Miami, FL','Las Vegas, NV','Memphis, TN','Louisville, KY',
  'Baltimore, MD','Milwaukee, WI','Sacramento, CA','Kansas City, MO','Cleveland, OH',
  'New Orleans, LA','Minneapolis, MN','Tampa, FL','Honolulu, HI','Arlington, TX',
  'Raleigh, NC','Omaha, NE','Colorado Springs, CO','Richmond, VA','Fresno, CA',
  'Tucson, AZ','Oakland, CA','Pittsburgh, PA','Cincinnati, OH','St. Louis, MO',
]

const AGE_RANGES = ['18_24','25_34','25_34','35_44','35_44','45_54','55_64']
const SKIN_TYPES = ['DRY','OILY','COMBINATION','COMBINATION','NORMAL','SENSITIVE']
const CONCERN_POOL = ['ACNE','HYPERPIGMENTATION','AGING','SENSITIVITY','DRYNESS','OILINESS','REDNESS','DULLNESS','UNEVEN_TEXTURE','PORES','DEHYDRATION']
const HAIR_TYPES = ['straight','wavy','curly','coily','kinky']
const HAIR_CONCERNS = ['DRYNESS','BREAKAGE','FRIZZ','SCALP_ISSUES','THINNING','LACK_OF_VOLUME','COLOR_TREATED']

function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]! }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function randomSlug4() {
  return Math.random().toString(36).slice(2, 6)
}

// ── Synthetic product catalog ─────────────────────────────────────────────────

interface ProductTemplate {
  name: string
  category: string
  area: string
  concerns: string[]
  skinTypes: string[]
  keyIngredients: string[]
  price: number
  description: string
}

const PRODUCT_TEMPLATES: ProductTemplate[] = [
  // SKINCARE
  { name: 'Gentle Hydrating Cleanser', category: 'CLEANSER', area: 'SKINCARE', concerns: ['DRYNESS','SENSITIVITY'], skinTypes: ['DRY','SENSITIVE','NORMAL'], keyIngredients: ['Ceramides','Aloe Vera','Glycerin'], price: 24, description: 'Sulfate-free cleanser that maintains the skin moisture barrier.' },
  { name: 'Purifying Foam Cleanser', category: 'CLEANSER', area: 'SKINCARE', concerns: ['ACNE','OILINESS','PORES'], skinTypes: ['OILY','COMBINATION'], keyIngredients: ['Salicylic Acid','Tea Tree','Niacinamide'], price: 22, description: 'Deep-cleansing foam that clears pores and controls excess oil.' },
  { name: 'Brightening Cleansing Balm', category: 'CLEANSER', area: 'SKINCARE', concerns: ['DULLNESS','HYPERPIGMENTATION'], skinTypes: ['DRY','NORMAL','COMBINATION'], keyIngredients: ['Vitamin C','Jojoba Oil','Rosehip'], price: 32, description: 'Melts away makeup and impurities while brightening the complexion.' },
  { name: 'Micellar Cleansing Water', category: 'CLEANSER', area: 'SKINCARE', concerns: ['SENSITIVITY'], skinTypes: ['SENSITIVE','NORMAL','DRY'], keyIngredients: ['Micellar Technology','Panthenol','Rose Water'], price: 18, description: 'No-rinse micellar water that gently removes all traces of makeup.' },
  { name: 'Hydrating Toner', category: 'TONER', area: 'SKINCARE', concerns: ['DRYNESS','DEHYDRATION'], skinTypes: ['DRY','NORMAL','SENSITIVE'], keyIngredients: ['Hyaluronic Acid','Rose Water','Glycerin'], price: 28, description: 'Alcohol-free toner that floods skin with lasting hydration.' },
  { name: 'AHA Exfoliating Toner', category: 'TONER', area: 'SKINCARE', concerns: ['DULLNESS','UNEVEN_TEXTURE','PORES'], skinTypes: ['OILY','COMBINATION','NORMAL'], keyIngredients: ['Glycolic Acid','Lactic Acid','Panthenol'], price: 34, description: 'Chemical exfoliant toner that smooths texture and refines pores.' },
  { name: 'Brightening Essence', category: 'TONER', area: 'SKINCARE', concerns: ['HYPERPIGMENTATION','DULLNESS'], skinTypes: ['NORMAL','COMBINATION','DRY'], keyIngredients: ['Tranexamic Acid','Niacinamide','Vitamin C'], price: 36, description: 'Lightweight essence that fades dark spots and evens skin tone.' },
  { name: 'Vitamin C Brightening Serum', category: 'SERUM', area: 'SKINCARE', concerns: ['HYPERPIGMENTATION','DULLNESS','AGING'], skinTypes: ['NORMAL','DRY','COMBINATION'], keyIngredients: ['Vitamin C','Vitamin E','Ferulic Acid'], price: 68, description: 'Potent antioxidant serum that fades dark spots and boosts radiance.' },
  { name: 'Niacinamide + Zinc Serum', category: 'SERUM', area: 'SKINCARE', concerns: ['PORES','OILINESS','ACNE'], skinTypes: ['OILY','COMBINATION'], keyIngredients: ['Niacinamide','Zinc','Hyaluronic Acid'], price: 44, description: 'Minimises pores, controls shine, and smooths skin texture.' },
  { name: 'Retinol Renewal Serum', category: 'SERUM', area: 'SKINCARE', concerns: ['AGING','UNEVEN_TEXTURE','DULLNESS'], skinTypes: ['NORMAL','COMBINATION','DRY'], keyIngredients: ['Retinol','Peptides','Squalane'], price: 72, description: 'Accelerates cell turnover to reduce fine lines and improve skin clarity.' },
  { name: 'Hyaluronic Acid Plumping Serum', category: 'SERUM', area: 'SKINCARE', concerns: ['DRYNESS','DEHYDRATION','AGING'], skinTypes: ['DRY','NORMAL','SENSITIVE'], keyIngredients: ['Hyaluronic Acid','Sodium PCA','Centella Asiatica'], price: 54, description: 'Multi-weight hyaluronic complex delivers instant and sustained hydration.' },
  { name: 'Azelaic Acid Clarity Serum', category: 'SERUM', area: 'SKINCARE', concerns: ['REDNESS','ACNE','HYPERPIGMENTATION'], skinTypes: ['SENSITIVE','OILY','COMBINATION'], keyIngredients: ['Azelaic Acid','Niacinamide','Allantoin'], price: 48, description: 'Targets blemishes, redness, and uneven skin tone without irritation.' },
  { name: 'Peptide Firming Serum', category: 'SERUM', area: 'SKINCARE', concerns: ['AGING','DULLNESS'], skinTypes: ['NORMAL','DRY','COMBINATION'], keyIngredients: ['Matrixyl','Argireline','Hyaluronic Acid'], price: 62, description: 'Peptide complex that firms, lifts, and reduces the appearance of wrinkles.' },
  { name: 'Ceramide Barrier Moisturizer', category: 'MOISTURIZER', area: 'SKINCARE', concerns: ['SENSITIVITY','DRYNESS','REDNESS'], skinTypes: ['DRY','SENSITIVE','NORMAL'], keyIngredients: ['Ceramides','Cholesterol','Fatty Acids'], price: 56, description: 'Restores the skin protective barrier and reduces sensitivity.' },
  { name: 'Oil-Free Hydrating Gel', category: 'MOISTURIZER', area: 'SKINCARE', concerns: ['OILINESS','ACNE','PORES'], skinTypes: ['OILY','COMBINATION'], keyIngredients: ['Hyaluronic Acid','Aloe Vera','Niacinamide'], price: 42, description: 'Lightweight, non-comedogenic gel that hydrates without clogging pores.' },
  { name: 'Rich Repair Night Cream', category: 'MOISTURIZER', area: 'SKINCARE', concerns: ['AGING','DRYNESS','DULLNESS'], skinTypes: ['DRY','NORMAL'], keyIngredients: ['Retinol','Peptides','Ceramides','Rosehip Oil'], price: 78, description: 'Intensive overnight treatment that repairs and renews skin while you sleep.' },
  { name: 'Soothing Recovery Cream', category: 'MOISTURIZER', area: 'SKINCARE', concerns: ['REDNESS','SENSITIVITY'], skinTypes: ['SENSITIVE','DRY','NORMAL'], keyIngredients: ['Centella Asiatica','Madecassoside','Oat Extract'], price: 48, description: 'Calming cream for reactive skin prone to redness and irritation.' },
  { name: 'Brightening Eye Cream', category: 'EYE_CREAM', area: 'SKINCARE', concerns: ['DARK_CIRCLES','AGING','DULLNESS'], skinTypes: ['NORMAL','DRY','COMBINATION'], keyIngredients: ['Caffeine','Vitamin C','Peptides'], price: 62, description: 'Visibly reduces dark circles and fine lines around the delicate eye area.' },
  { name: 'Firming Eye Gel', category: 'EYE_CREAM', area: 'SKINCARE', concerns: ['AGING','DARK_CIRCLES'], skinTypes: ['OILY','COMBINATION','NORMAL'], keyIngredients: ['Caffeine','Hyaluronic Acid','Collagen Peptides'], price: 58, description: 'Tightening eye gel that depuffs and firms the eye contour.' },
  { name: 'Mineral SPF 50 Sunscreen', category: 'SPF', area: 'SKINCARE', concerns: ['SENSITIVITY','AGING'], skinTypes: ['SENSITIVE','DRY','NORMAL'], keyIngredients: ['Zinc Oxide','Titanium Dioxide','Niacinamide'], price: 38, description: 'Broad-spectrum mineral protection gentle on sensitive skin.' },
  { name: 'Lightweight SPF 30 Fluid', category: 'SPF', area: 'SKINCARE', concerns: ['AGING','OILINESS'], skinTypes: ['OILY','COMBINATION','NORMAL'], keyIngredients: ['Avobenzone','Niacinamide','Hyaluronic Acid'], price: 34, description: 'Daily UV protection with a matte, weightless finish.' },
  { name: 'Enzyme Radiance Mask', category: 'MASK', area: 'SKINCARE', concerns: ['DULLNESS','UNEVEN_TEXTURE'], skinTypes: ['NORMAL','COMBINATION','DRY'], keyIngredients: ['Papaya Enzyme','Pineapple Enzyme','Kaolin'], price: 46, description: 'Enzymatic mask that reveals brighter, smoother skin.' },
  { name: 'Clay Purifying Mask', category: 'MASK', area: 'SKINCARE', concerns: ['ACNE','PORES','OILINESS'], skinTypes: ['OILY','COMBINATION'], keyIngredients: ['Kaolin','Bentonite','Salicylic Acid'], price: 36, description: 'Deep-cleansing clay mask that draws out impurities and clears congested pores.' },
  { name: 'Squalane Facial Oil', category: 'FACIAL_OIL', area: 'SKINCARE', concerns: ['DRYNESS','AGING','SENSITIVITY'], skinTypes: ['DRY','SENSITIVE','NORMAL'], keyIngredients: ['Squalane','Rosehip Oil','Vitamin E'], price: 52, description: 'Lightweight, non-greasy facial oil that nourishes and protects.' },
  { name: 'Blemish Spot Treatment', category: 'SPOT_TREATMENT', area: 'SKINCARE', concerns: ['ACNE'], skinTypes: ['OILY','COMBINATION','NORMAL'], keyIngredients: ['Salicylic Acid','Benzoyl Peroxide','Zinc'], price: 18, description: 'Fast-acting spot treatment that targets and shrinks blemishes overnight.' },
  { name: 'AHA/BHA Exfoliant', category: 'EXFOLIANT', area: 'SKINCARE', concerns: ['UNEVEN_TEXTURE','PORES','DULLNESS'], skinTypes: ['OILY','COMBINATION','NORMAL'], keyIngredients: ['Glycolic Acid','Salicylic Acid','Lactic Acid'], price: 42, description: 'Dual-action exfoliant that smooths texture and clears congestion.' },
  // BODY
  { name: 'Creamy Body Wash', category: 'BODY_WASH', area: 'BODY', concerns: ['DRYNESS','SENSITIVITY'], skinTypes: ['DRY','SENSITIVE'], keyIngredients: ['Shea Butter','Glycerin','Aloe Vera'], price: 26, description: 'Nourishing body wash that leaves skin soft and hydrated.' },
  { name: 'Energising Citrus Body Wash', category: 'BODY_WASH', area: 'BODY', concerns: ['DULLNESS'], skinTypes: ['NORMAL','COMBINATION'], keyIngredients: ['Vitamin C','Citrus Extract','Caffeine'], price: 24, description: 'Brightening body wash that awakens and energises the skin.' },
  { name: 'Firming Body Lotion', category: 'BODY_MOISTURIZER', area: 'BODY', concerns: ['AGING','DRYNESS'], skinTypes: ['DRY','NORMAL'], keyIngredients: ['Caffeine','Retinol','Peptides'], price: 44, description: 'Body lotion with firming actives that improve skin elasticity.' },
  { name: 'Shea Body Butter', category: 'BODY_MOISTURIZER', area: 'BODY', concerns: ['DRYNESS'], skinTypes: ['DRY','SENSITIVE'], keyIngredients: ['Shea Butter','Cocoa Butter','Vitamin E'], price: 32, description: 'Rich, ultra-nourishing body butter for very dry skin.' },
  { name: 'Brightening Body Serum', category: 'BODY_TREATMENT', area: 'BODY', concerns: ['HYPERPIGMENTATION','DULLNESS'], skinTypes: ['NORMAL','DRY','COMBINATION'], keyIngredients: ['Vitamin C','Niacinamide','Alpha Arbutin'], price: 48, description: 'Lightweight body serum that evens skin tone and boosts glow.' },
  { name: 'Coffee Sugar Body Scrub', category: 'BODY_SCRUB', area: 'BODY', concerns: ['DULLNESS','UNEVEN_TEXTURE'], skinTypes: ['NORMAL','COMBINATION','DRY'], keyIngredients: ['Coffee Grounds','Sugar','Coconut Oil','Caffeine'], price: 28, description: 'Exfoliating body scrub that polishes skin to silky smoothness.' },
  { name: 'Body SPF 50 Spray', category: 'BODY_SPF', area: 'BODY', concerns: ['AGING'], skinTypes: ['NORMAL','OILY'], keyIngredients: ['Zinc Oxide','Aloe Vera','Vitamin E'], price: 36, description: 'Easy-apply SPF 50 spray for full-body sun protection.' },
  // HAIR
  { name: 'Moisture Boost Shampoo', category: 'SHAMPOO', area: 'HAIR', concerns: ['DRYNESS'], skinTypes: [], keyIngredients: ['Argan Oil','Keratin','Shea Butter'], price: 28, description: 'Intensely hydrating shampoo for dry, brittle hair.' },
  { name: 'Scalp Balancing Shampoo', category: 'SHAMPOO', area: 'HAIR', concerns: ['OILINESS'], skinTypes: [], keyIngredients: ['Zinc Pyrithione','Tea Tree','Salicylic Acid'], price: 26, description: 'Regulates scalp sebum production without stripping moisture.' },
  { name: 'Curl Enhancing Shampoo', category: 'SHAMPOO', area: 'HAIR', concerns: ['DRYNESS','UNEVEN_TEXTURE'], skinTypes: [], keyIngredients: ['Flaxseed','Aloe Vera','Glycerin'], price: 30, description: 'Sulfate-free shampoo that cleanses curls while preserving definition.' },
  { name: 'Deep Moisture Conditioner', category: 'CONDITIONER', area: 'HAIR', concerns: ['DRYNESS'], skinTypes: [], keyIngredients: ['Shea Butter','Hyaluronic Acid','Argan Oil'], price: 30, description: 'Deeply penetrating conditioner for soft, manageable hair.' },
  { name: 'Frizz Control Conditioner', category: 'CONDITIONER', area: 'HAIR', concerns: ['UNEVEN_TEXTURE'], skinTypes: [], keyIngredients: ['Keratin','Silk Proteins','Argan Oil'], price: 28, description: 'Smooths the cuticle and tames frizz for sleek results.' },
  { name: 'Intensive Repair Hair Mask', category: 'HAIR_MASK', area: 'HAIR', concerns: ['DRYNESS','UNEVEN_TEXTURE'], skinTypes: [], keyIngredients: ['Biotin','Keratin','Castor Oil','Honey'], price: 42, description: 'Weekly treatment mask that rebuilds damaged hair from within.' },
  { name: 'Scalp Revitalising Serum', category: 'SCALP_TREATMENT', area: 'HAIR', concerns: ['OILINESS','DULLNESS'], skinTypes: [], keyIngredients: ['Caffeine','Niacinamide','Biotin','Peptides'], price: 58, description: 'Targeted scalp serum that stimulates growth and reduces flakiness.' },
  { name: 'Curl Defining Leave-In Cream', category: 'LEAVE_IN', area: 'HAIR', concerns: ['DRYNESS','UNEVEN_TEXTURE'], skinTypes: [], keyIngredients: ['Shea Butter','Aloe Vera','Coconut Oil'], price: 26, description: 'Leave-in conditioner that defines curls and controls frizz.' },
  { name: 'Argan Shine Hair Oil', category: 'HAIR_OIL', area: 'HAIR', concerns: ['DRYNESS','UNEVEN_TEXTURE'], skinTypes: [], keyIngredients: ['Argan Oil','Vitamin E','Jojoba Oil'], price: 38, description: 'Lightweight hair oil that adds mirror shine and reduces breakage.' },
  { name: 'Heat Protectant Spray', category: 'STYLING', area: 'HAIR', concerns: ['UNEVEN_TEXTURE'], skinTypes: [], keyIngredients: ['Keratin','Quinoa','Panthenol'], price: 22, description: 'Thermal protection spray for styling up to 230°C.' },
  { name: 'Curl Defining Cream', category: 'STYLING', area: 'HAIR', concerns: ['DRYNESS','UNEVEN_TEXTURE'], skinTypes: [], keyIngredients: ['Castor Oil','Flaxseed Gel','Shea Butter'], price: 26, description: 'Defines and elongates curls for bouncy, frizz-free styles.' },
  // MAKEUP
  { name: 'Luminous Skin Tint SPF 25', category: 'FOUNDATION', area: 'MAKEUP', concerns: [], skinTypes: ['NORMAL','DRY'], keyIngredients: ['Hyaluronic Acid','Vitamin C','Zinc Oxide'], price: 44, description: 'Sheer, buildable coverage with a natural-glow finish.' },
  { name: 'Full Coverage Foundation', category: 'FOUNDATION', area: 'MAKEUP', concerns: ['ACNE','HYPERPIGMENTATION'], skinTypes: ['OILY','COMBINATION'], keyIngredients: ['Niacinamide','Salicylic Acid'], price: 52, description: 'Long-wear foundation with a soft-matte finish.' },
  { name: 'Brightening Concealer', category: 'CONCEALER', area: 'MAKEUP', concerns: ['DARK_CIRCLES'], skinTypes: ['NORMAL','DRY','COMBINATION'], keyIngredients: ['Vitamin C','Caffeine','Hyaluronic Acid'], price: 36, description: 'Lightweight concealer that covers and brightens dark circles.' },
  { name: 'Smoothing Pore Primer', category: 'PRIMER', area: 'MAKEUP', concerns: ['PORES','OILINESS'], skinTypes: ['OILY','COMBINATION'], keyIngredients: ['Niacinamide','Silica','Zinc'], price: 38, description: 'Blurs pores and creates a smooth canvas for makeup.' },
  { name: 'Satin Blush & Bronzer', category: 'BLUSH_BRONZER', area: 'MAKEUP', concerns: [], skinTypes: ['OILY','COMBINATION','NORMAL'], keyIngredients: ['Vitamin E','Jojoba','Rice Powder'], price: 42, description: 'Buildable powder for sculpted definition and natural flush.' },
  { name: 'Volume Boost Mascara', category: 'EYE_MAKEUP', area: 'MAKEUP', concerns: [], skinTypes: [], keyIngredients: ['Biotin','Keratin','Beeswax'], price: 28, description: 'Volumising mascara that lifts and lengthens for dramatic lashes.' },
  { name: 'Hydrating Lip Tint', category: 'LIP_COLOR', area: 'MAKEUP', concerns: [], skinTypes: ['DRY','NORMAL','SENSITIVE'], keyIngredients: ['Hyaluronic Acid','Shea Butter','Vitamin E'], price: 24, description: 'Buildable lip tint with moisturising actives for comfortable color.' },
  { name: 'All-Day Setting Mist', category: 'SETTING_SPRAY', area: 'MAKEUP', concerns: [], skinTypes: ['OILY','COMBINATION','NORMAL'], keyIngredients: ['Aloe Vera','Glycerin','Green Tea'], price: 26, description: 'Locks makeup in place and controls shine throughout the day.' },
  // WELLNESS
  { name: 'Beauty Collagen Peptides', category: 'COLLAGEN', area: 'WELLNESS', concerns: ['AGING','DRYNESS'], skinTypes: [], keyIngredients: ['Hydrolysed Collagen','Vitamin C','Biotin'], price: 54, description: 'Hydrolysed collagen supplement that supports skin elasticity and hydration.' },
  { name: 'Glow Skin Vitamins', category: 'SUPPLEMENT', area: 'WELLNESS', concerns: ['DULLNESS','AGING'], skinTypes: [], keyIngredients: ['Vitamin C','Zinc','Selenium','Biotin'], price: 38, description: 'Daily vitamins formulated to support radiant skin from within.' },
  { name: 'Clear Skin Complex', category: 'SUPPLEMENT', area: 'WELLNESS', concerns: ['ACNE'], skinTypes: [], keyIngredients: ['Zinc','Vitamin A','Evening Primrose'], price: 36, description: 'Nutritional supplement targeting the root causes of breakouts.' },
  // LIP CARE
  { name: 'Honey & Shea Lip Balm', category: 'LIP_BALM', area: 'LIP_CARE', concerns: ['DRYNESS','SENSITIVITY'], skinTypes: ['DRY','SENSITIVE'], keyIngredients: ['Honey','Shea Butter','Vitamin E'], price: 14, description: 'Intensely nourishing lip balm for long-lasting softness.' },
  { name: 'Peptide Plumping Lip Treatment', category: 'LIP_TREATMENT', area: 'LIP_CARE', concerns: ['AGING','DRYNESS'], skinTypes: ['DRY','NORMAL'], keyIngredients: ['Peptides','Hyaluronic Acid','Ceramides'], price: 28, description: 'Anti-ageing lip treatment that smooths lines and plumps the lip border.' },
  // EYE CARE
  { name: 'Lash Strengthening Serum', category: 'LASH_SERUM', area: 'EYE_CARE', concerns: ['AGING'], skinTypes: [], keyIngredients: ['Biotin','Peptides','Panthenol'], price: 64, description: 'Clinical-strength serum that promotes longer, fuller lashes.' },
  { name: 'Brow Growth Serum', category: 'BROW_SERUM', area: 'EYE_CARE', concerns: [], skinTypes: [], keyIngredients: ['Biotin','Castor Oil','Peptides'], price: 52, description: 'Fills and defines sparse brows with regular use.' },
  { name: 'Reviving Eye Patches', category: 'EYE_PATCHES', area: 'EYE_CARE', concerns: ['DARK_CIRCLES','AGING'], skinTypes: [], keyIngredients: ['Collagen','Gold','Caffeine','Hyaluronic Acid'], price: 32, description: 'Hydrogel patches that depuff and brighten the under-eye area.' },
]

async function generateSyntheticCatalog(
  brandId: string,
  focusAreas: string[],
  productCount: number,
): Promise<void> {
  // Map HAIR focus area to HAIR area in templates
  const areaMap: Record<string, string> = { HAIR: 'HAIR', SKINCARE: 'SKINCARE', BODY: 'BODY', MAKEUP: 'MAKEUP', WELLNESS: 'WELLNESS', LIP_CARE: 'LIP_CARE', EYE_CARE: 'EYE_CARE' }
  const targetAreas = focusAreas.map(a => areaMap[a]).filter(Boolean)

  let pool = targetAreas.length > 0
    ? PRODUCT_TEMPLATES.filter(t => targetAreas.includes(t.area))
    : PRODUCT_TEMPLATES.filter(t => t.area === 'SKINCARE')

  if (pool.length === 0) pool = PRODUCT_TEMPLATES.filter(t => t.area === 'SKINCARE')

  const shuffled = shuffle(pool)
  const selected = shuffled.slice(0, Math.min(productCount, shuffled.length))

  for (const tmpl of selected) {
    await prisma.product.create({
      data: {
        brandId,
        name: tmpl.name,
        description: tmpl.description,
        category: tmpl.category as any,
        beautyArea: tmpl.area as any,
        concerns: tmpl.concerns as any,
        skinTypes: tmpl.skinTypes as any,
        keyIngredients: tmpl.keyIngredients,
        ingredients: tmpl.keyIngredients,
        price: tmpl.price + (Math.random() * 6 - 3), // ±$3 variation
        currency: 'USD',
        inStock: Math.random() > 0.1,
        monkSkinTones: [],
      },
    })
  }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export interface DemoProvisionParams {
  prospectName: string
  createdByAdminId: string
  focusAreas: string[]
  consumerCount: number
  productCount?: number
  historyMonths?: number
  hasCatalog?: boolean
  hasCustomerProfiles?: boolean
  hasQuizResults?: boolean
  purchaseMatrix?: PurchaseMatrix | undefined
  existingBrandId?: string | undefined
}

export interface DemoProvisionResult {
  brandId: string
  slug: string
  loginUrl: string
  email: string
  password: string
  expiresAt: Date
  stats: {
    products: number
    consumers: number
    routines: number
    checkIns: number
  }
}

export async function provisionDemoEnvironment(
  params: DemoProvisionParams,
): Promise<DemoProvisionResult> {
  const {
    prospectName, createdByAdminId, focusAreas, consumerCount,
    productCount = 20, historyMonths = 12,
    hasCatalog = false, hasCustomerProfiles = false, hasQuizResults = false,
    purchaseMatrix, existingBrandId,
  } = params

  let slug: string
  let brand: { id: string; slug: string }

  if (existingBrandId) {
    const existing = await prisma.brand.findUnique({ where: { id: existingBrandId }, select: { id: true, slug: true } })
    if (!existing) throw new Error(`Brand ${existingBrandId} not found`)
    brand = existing
    slug = existing.slug
  } else {
    slug = `${slugify(prospectName)}-demo-${randomSlug4()}`
    const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    brand = await prisma.brand.create({
      data: {
        name: prospectName,
        slug,
        isDemo: true,
        demoProspectName: prospectName,
        demoCreatedBy: createdByAdminId,
        demoLinkExpiresAt: expiresAt,
        focusAreas: focusAreas as any,
        primaryColor: '#C17A47',
        active: true,
      },
    })
  }

  const email = `admin@${slug}.halite`
  const password = `demo-${slug}`
  const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)

  // 2. Create BrandAdmin login (skip if already exists)
  const existingAdmin = await prisma.brandAdmin.findFirst({ where: { brandId: brand.id } })
  if (!existingAdmin) {
    const hashedPw = await bcrypt.hash(password, 12)
    await prisma.brandAdmin.create({
      data: {
        brandId: brand.id,
        email,
        password: hashedPw,
        name: `${prospectName} Demo`,
        role: 'OWNER',
      },
    })
  }

  // 3. QuizConfig (upsert)
  await prisma.quizConfig.upsert({
    where: { brandId: brand.id },
    update: { enabledAreas: focusAreas as any },
    create: {
      brandId: brand.id,
      enabledAreas: focusAreas as any,
      questionOverrides: {},
      customQuestions: [],
    },
  })

  // 4. Generate synthetic catalog if none was uploaded
  const existingProductCount = await prisma.product.count({ where: { brandId: brand.id } })
  if (existingProductCount === 0) {
    await generateSyntheticCatalog(brand.id, focusAreas, productCount)
  }

  // 5. Get ingested products
  const products = await prisma.product.findMany({
    where: { brandId: brand.id },
    select: {
      id: true, name: true, category: true, beautyArea: true,
      concerns: true, skinTypes: true, monkSkinTones: true,
      price: true, currency: true, keyIngredients: true,
      externalId: true,
    },
  })

  // 6. Analyse product catalog to calibrate consumer profiles
  const catalogProfile = analyzeProductCatalog(products)

  // 7. Build purchase frequency
  const count = Math.min(Math.max(consumerCount, 50), 1000)
  const effectiveMatrix = purchaseMatrix ?? generateSyntheticPurchaseMatrix(products, count)
  const productFreq = buildProductFrequency(effectiveMatrix, products)

  // 8. Import a random subset (20–50%) of identified consumers from other demo brands.
  //    These carry the same Consumer.id, name, email, and quiz profile — populating cross-brand identity.
  const sharedConsumerIds = await importSharedConsumers(brand.id, count, focusAreas)

  // 8b. Generate fresh consumers for the remainder
  const freshCount = Math.max(0, count - sharedConsumerIds.length)
  const freshConsumerIds = freshCount > 0
    ? await generateConsumers(brand.id, freshCount, catalogProfile, productFreq, focusAreas)
    : []

  const consumerIds = [...sharedConsumerIds, ...freshConsumerIds]

  // 9. Generate routines (batched 10 at a time, cap at 200 to keep runtime reasonable)
  const routineCount = await generateRoutines(brand.id, consumerIds, focusAreas)

  // 10. Generate check-ins based on historyMonths (convert to weeks, capped at 104 weeks / 2 years)
  const historyWeeks = historyMonths > 0 ? Math.min(Math.ceil(historyMonths * 4.33), 104) : 8
  const checkInCount = await generateCheckIns(brand.id, consumerIds, historyWeeks, catalogProfile, productFreq)

  // 11. Seed consumer identity records for fresh consumers only (imported ones are already linked)
  await seedConsumerIdentities(brand.id, freshConsumerIds)

  // 12. Seed pre-built agent workflows
  await seedAgentWorkflows(brand.id)

  // 13. Create catalog upload records (AI-generated ones only for data not provided by user)
  const uploadData: Array<{
    brandId: string; fileName: string; fileUrl: string; format: string;
    source: string; status: string; rowCount: number | null; errorLog?: object
  }> = []

  if (!hasCatalog) {
    uploadData.push({ brandId: brand.id, fileName: 'Synthetic Product Catalog.xlsx', fileUrl: '', format: 'XLSX', source: 'AI_GENERATED', status: 'DONE', rowCount: products.length })
  }
  if (!hasCustomerProfiles) {
    uploadData.push({ brandId: brand.id, fileName: 'Synthetic Customer Profiles.xlsx', fileUrl: '', format: 'XLSX', source: 'AI_GENERATED', status: 'DONE', rowCount: consumerIds.length })
  }
  if (!hasQuizResults) {
    uploadData.push({ brandId: brand.id, fileName: 'Synthetic Quiz Results.xlsx', fileUrl: '', format: 'XLSX', source: 'AI_GENERATED', status: 'DONE', rowCount: consumerIds.length })
  }

  // Purchase history and check-in/routine files are always AI-generated (user-uploaded purchase file is stored separately)
  if (historyMonths > 0 && !purchaseMatrix) {
    const purchaseRowCount = Object.keys(effectiveMatrix).length
    uploadData.push({ brandId: brand.id, fileName: 'Synthetic Purchase History.xlsx', fileUrl: '', format: 'XLSX', source: 'AI_GENERATED', status: 'DONE', rowCount: purchaseRowCount, errorLog: { historyMonths } })
  } else if (historyMonths > 0 && purchaseMatrix) {
    // User uploaded purchase history but we should still add the AI generated purchase record with historyMonths for download date range
    // (the user uploaded one already has a record — just update the purchase history download metadata on the AI record)
    uploadData.push({ brandId: brand.id, fileName: 'Synthetic Purchase History.xlsx', fileUrl: '', format: 'XLSX', source: 'AI_GENERATED', status: 'DONE', rowCount: Object.keys(effectiveMatrix).length, errorLog: { historyMonths } })
  }

  uploadData.push({ brandId: brand.id, fileName: 'Synthetic Check-in History.xlsx', fileUrl: '', format: 'XLSX', source: 'AI_GENERATED', status: 'DONE', rowCount: checkInCount })
  uploadData.push({ brandId: brand.id, fileName: 'Synthetic Routine Assignments.xlsx', fileUrl: '', format: 'XLSX', source: 'AI_GENERATED', status: 'DONE', rowCount: routineCount })

  await prisma.catalogUpload.createMany({ data: uploadData as any })

  const finalExpiry = existingBrandId
    ? (await prisma.brand.findUnique({ where: { id: brand.id }, select: { demoLinkExpiresAt: true } }))?.demoLinkExpiresAt ?? expiresAt
    : expiresAt

  return {
    brandId: brand.id,
    slug,
    loginUrl: `${process.env.DASHBOARD_URL ?? 'https://portal.haliteintelligence.com'}/${slug}/login`,
    email,
    password,
    expiresAt: finalExpiry,
    stats: {
      products: products.length,
      consumers: consumerIds.length,
      routines: routineCount,
      checkIns: checkInCount,
    },
  }
}

// ── Catalog analysis ──────────────────────────────────────────────────────────

interface CatalogProfile {
  dominantConcerns: string[]
  hasAntiAging: boolean
  hasAcne: boolean
  hasPigmentation: boolean
  hasSensitivity: boolean
  areas: string[]
}

function analyzeProductCatalog(products: Array<{ concerns: string[]; beautyArea: string; category: string }>): CatalogProfile {
  const concernFreq: Record<string, number> = {}
  for (const p of products) {
    for (const c of p.concerns) concernFreq[c] = (concernFreq[c] ?? 0) + 1
  }
  const dominantConcerns = Object.entries(concernFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c]) => c)

  return {
    dominantConcerns,
    hasAntiAging: !!concernFreq['AGING'],
    hasAcne: !!concernFreq['ACNE'],
    hasPigmentation: !!concernFreq['HYPERPIGMENTATION'],
    hasSensitivity: !!concernFreq['SENSITIVITY'],
    areas: [...new Set(products.map(p => p.beautyArea))],
  }
}

function buildProductFrequency(
  matrix: PurchaseMatrix,
  products: Array<{ id: string; name: string; externalId: string | null }>,
): Record<string, number> {
  const freq: Record<string, number> = {}
  for (const purchases of Object.values(matrix)) {
    for (const [pid, qty] of Object.entries(purchases)) {
      const product = products.find(p =>
        p.externalId === pid || p.name.toLowerCase() === pid.toLowerCase()
      )
      const key = product?.id ?? pid
      freq[key] = (freq[key] ?? 0) + qty
    }
  }
  return freq
}

function generateSyntheticPurchaseMatrix(
  products: Array<{ id: string; name: string; externalId: string | null }>,
  consumerCount: number,
): PurchaseMatrix {
  if (products.length === 0) return {}

  const shuffled = shuffle(products)
  const weights = shuffled.map((_, i) => 1 / Math.pow(i + 1, 0.8))
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  const cdf: number[] = []
  let cumulative = 0
  for (const w of weights) {
    cumulative += w / totalWeight
    cdf.push(cumulative)
  }

  function sampleProduct() {
    const r = Math.random()
    const idx = cdf.findIndex(c => r <= c)
    return shuffled[Math.max(0, idx)]!
  }

  const matrix: PurchaseMatrix = {}
  const buyerCount = Math.round(consumerCount * 0.6)
  for (let i = 0; i < buyerCount; i++) {
    const customerId = `buyer-${i + 1}`
    const purchaseCount = randomInt(1, 5)
    const purchases: Record<string, number> = {}
    for (let j = 0; j < purchaseCount; j++) {
      const product = sampleProduct()
      const key = product.name
      purchases[key] = (purchases[key] ?? 0) + randomInt(1, 3)
    }
    matrix[customerId] = purchases
  }
  return matrix
}

// ── Cross-brand consumer import ───────────────────────────────────────────────
// Imports a random subset of consumers from other demo brands so the identity
// intelligence page shows real cross-brand signals. Two-pass approach:
//   Pass 1 — Consumers already linked via consumerId (recent demos)
//   Pass 2 — Raw EndUsers at older demos with no Consumer record yet (retroactively links them)

const BP_SELECT = {
  city: true, country: true, countryCode: true,
  ageRange: true, skinType: true, skinConcerns: true, monkSkinTone: true,
  sleepHours: true, stressLevel: true, waterIntakeMl: true,
  hairProfile: true, completedAreas: true,
} as const

async function importSharedConsumers(
  brandId: string,
  targetCount: number,
  focusAreas: string[],
): Promise<string[]> {
  const targetImport = Math.round(targetCount * (0.25 + Math.random() * 0.2)) // 25–45%
  const hasHair = focusAreas.includes('HAIR')
  const ids: string[] = []

  // ── Pass 1: Consumers already linked across brands ──────────────────────────
  const consumerPool = await prisma.consumer.findMany({
    where: {
      endUsers: {
        some: {
          brand: { isDemo: true, id: { not: brandId } },
          beautyProfile: { isNot: null },
          firstName: { not: null },
        },
      },
      NOT: { endUsers: { some: { brandId } } },
    },
    include: {
      endUsers: {
        where: { brand: { isDemo: true }, beautyProfile: { isNot: null }, firstName: { not: null } },
        include: { beautyProfile: { select: BP_SELECT } },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
    take: 2000,
  })

  for (const consumer of shuffle(consumerPool).slice(0, Math.min(targetImport, consumerPool.length))) {
    const source = consumer.endUsers[0]
    if (!source?.beautyProfile) continue
    const bp = source.beautyProfile
    try {
      const endUser = await prisma.endUser.create({
        data: { brandId, consumerId: consumer.id, email: source.email, firstName: source.firstName, lastName: source.lastName },
      })
      const completedAreas = [...new Set([
        ...((bp.completedAreas ?? []) as string[]),
        ...(bp.skinType ? ['SKINCARE'] : []),
        ...(bp.hairProfile && hasHair ? ['HAIR'] : []),
      ])]
      await prisma.userBeautyProfile.create({
        data: {
          endUserId: endUser.id, ageRange: bp.ageRange,
          skinType: bp.skinType as any, skinConcerns: (bp.skinConcerns ?? []) as any,
          monkSkinTone: bp.monkSkinTone ?? randomInt(1, 10),
          completedAreas: completedAreas as any,
          city: bp.city ?? null, country: bp.country ?? 'United States', countryCode: bp.countryCode ?? 'US',
          sleepHours: bp.sleepHours ?? randomItem([6, 6.5, 7, 7.5, 8]),
          stressLevel: bp.stressLevel ?? randomInt(1, 5),
          waterIntakeMl: bp.waterIntakeMl ?? randomInt(1000, 3000),
          ...(hasHair && bp.hairProfile ? { hairProfile: bp.hairProfile as any } : {}),
        },
      })
      ids.push(endUser.id)
    } catch { /* skip on constraint violation */ }
  }

  // ── Pass 2: legacy EndUsers with no Consumer record (retroactively link them) ─
  const remaining = Math.max(0, targetImport - ids.length)
  if (remaining > 0) {
    const rawPool = await prisma.endUser.findMany({
      where: {
        brand: { isDemo: true, id: { not: brandId }, active: true },
        consumerId: null,
        beautyProfile: { isNot: null },
        firstName: { not: null },
        email: { not: null },
      },
      select: { id: true, email: true, firstName: true, lastName: true, beautyProfile: { select: BP_SELECT } },
      take: 2000,
    })

    for (const sourceUser of shuffle(rawPool).slice(0, Math.min(remaining, rawPool.length))) {
      const bp = sourceUser.beautyProfile
      if (!bp || !sourceUser.email) continue
      try {
        const consumer = await prisma.consumer.create({
          data: { email: sourceUser.email, prefillAnswers: {} as any },
          select: { id: true },
        })
        // Retroactively link the source EndUser so it becomes cross-brand
        await prisma.endUser.update({ where: { id: sourceUser.id }, data: { consumerId: consumer.id } }).catch(() => {})
        const endUser = await prisma.endUser.create({
          data: { brandId, consumerId: consumer.id, email: sourceUser.email, firstName: sourceUser.firstName, lastName: sourceUser.lastName },
        })
        const completedAreas = [...new Set([
          ...((bp.completedAreas ?? []) as string[]),
          ...(bp.skinType ? ['SKINCARE'] : []),
          ...(bp.hairProfile && hasHair ? ['HAIR'] : []),
        ])]
        await prisma.userBeautyProfile.create({
          data: {
            endUserId: endUser.id, ageRange: bp.ageRange,
            skinType: bp.skinType as any, skinConcerns: (bp.skinConcerns ?? []) as any,
            monkSkinTone: bp.monkSkinTone ?? randomInt(1, 10),
            completedAreas: completedAreas as any,
            city: bp.city ?? null, country: bp.country ?? 'United States', countryCode: bp.countryCode ?? 'US',
            sleepHours: bp.sleepHours ?? randomItem([6, 6.5, 7, 7.5, 8]),
            stressLevel: bp.stressLevel ?? randomInt(1, 5),
            waterIntakeMl: bp.waterIntakeMl ?? randomInt(1000, 3000),
            ...(hasHair && bp.hairProfile ? { hairProfile: bp.hairProfile as any } : {}),
          },
        })
        ids.push(endUser.id)
      } catch { /* skip */ }
    }
  }

  return ids
}

// ── Consumer generation ───────────────────────────────────────────────────────

async function generateConsumers(
  brandId: string,
  count: number,
  catalog: CatalogProfile,
  productFreq: Record<string, number>,
  focusAreas: string[],
): Promise<string[]> {
  const usedNames = new Set<string>()
  const ids: string[] = []

  const ageWeights = catalog.hasAntiAging
    ? ['25_34','35_44','35_44','45_54','45_54','55_64','18_24']
    : ['18_24','25_34','25_34','35_44','45_54','55_64']

  const hasHair = focusAreas.includes('HAIR')

  for (let i = 0; i < count; i++) {
    let firstName: string, lastName: string, fullName: string
    do {
      firstName = randomItem(FIRST_NAMES)
      lastName = randomItem(LAST_NAMES)
      fullName = `${firstName} ${lastName}`
    } while (usedNames.has(fullName))
    usedNames.add(fullName)

    const emailSuffix = ['gmail.com','yahoo.com','outlook.com','icloud.com','hotmail.com']
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1,99)}@${randomItem(emailSuffix)}`

    const ageRange = randomItem(ageWeights)
    const skinType = randomItem(SKIN_TYPES)
    const numConcerns = randomInt(2, 4)
    const weightedPool = [...catalog.dominantConcerns, ...catalog.dominantConcerns, ...CONCERN_POOL]
    const concerns = shuffle([...new Set(weightedPool)]).slice(0, numConcerns)
    const monkTone = randomInt(1, 10)
    const city = randomItem(US_CITIES)
    const [cityName, countryCode] = city.split(', ')

    const endUser = await prisma.endUser.create({
      data: { brandId, email, firstName, lastName },
    })

    const hairProfile = hasHair ? {
      hairType: randomItem(HAIR_TYPES),
      hairConcerns: shuffle(HAIR_CONCERNS).slice(0, randomInt(1, 3)),
      porosity: randomItem(['low','medium','high']),
      scalpType: randomItem(['normal','oily','dry','sensitive']),
    } : undefined

    await prisma.userBeautyProfile.create({
      data: {
        endUserId: endUser.id,
        ageRange,
        skinType: skinType as any,
        skinConcerns: concerns as any,
        monkSkinTone: monkTone,
        completedAreas: catalog.areas as any,
        sleepHours: randomItem([6, 6.5, 7, 7.5, 8, 8.5]),
        stressLevel: randomInt(1, 5),
        waterIntakeMl: randomInt(1000, 3000),
        city: cityName ?? null,
        country: 'United States',
        countryCode: 'US',
        ...(hairProfile ? { hairProfile: hairProfile as any } : {}),
      },
    })

    ids.push(endUser.id)
  }

  return ids
}

// ── Routine generation ────────────────────────────────────────────────────────

async function generateRoutines(
  brandId: string,
  consumerIds: string[],
  focusAreas: string[],
): Promise<number> {
  const sessionMap: Record<string, string> = {}

  // Only generate routines for up to 200 consumers (Claude calls are expensive)
  const routineConsumers = consumerIds.slice(0, 200)

  for (const userId of routineConsumers) {
    try {
      const profile = await prisma.userBeautyProfile.findUnique({
        where: { endUserId: userId },
        select: { skinType: true, skinConcerns: true, ageRange: true, monkSkinTone: true },
      })

      const answers: Record<string, unknown> = {
        __area_select: focusAreas,
        SH0: profile?.ageRange ?? '25_34',
        S1: profile?.skinType?.toLowerCase() ?? 'combination',
        S4: profile?.skinConcerns ?? [],
        S5: String(profile?.monkSkinTone ?? 5),
      }

      const session = await prisma.quizSession.create({
        data: {
          brandId,
          endUserId: userId,
          selectedAreas: focusAreas as any,
          answers: answers as any,
          completed: true,
          completedAt: new Date(Date.now() - randomInt(7, 60) * 24 * 60 * 60 * 1000),
        },
      })
      sessionMap[userId] = session.id
    } catch { /* skip user if session creation fails — they will get check-ins but no routine */ }
  }

  let routineCount = 0
  const BATCH_SIZE = 10

  for (let i = 0; i < routineConsumers.length; i += BATCH_SIZE) {
    const batch = routineConsumers.slice(i, i + BATCH_SIZE)
    await Promise.allSettled(
      batch.map(async userId => {
        const sessionId = sessionMap[userId]
        if (!sessionId) return
        const profile = await prisma.userBeautyProfile.findUnique({
          where: { endUserId: userId },
          select: { skinType: true, skinConcerns: true, ageRange: true, monkSkinTone: true },
        })

        const answers: Record<string, unknown> = {
          __area_select: focusAreas,
          SH0: profile?.ageRange ?? '25_34',
          S1: profile?.skinType?.toLowerCase() ?? 'combination',
          S4: profile?.skinConcerns ?? [],
          S5: String(profile?.monkSkinTone ?? 5),
        }

        for (const area of focusAreas) {
          try {
            await generateRoutine(userId, brandId, sessionId, area, answers)
            routineCount++
          } catch { /* skip if product catalog too sparse for this area */ }
        }
      })
    )
  }

  return routineCount
}

// ── Check-in generation ───────────────────────────────────────────────────────

const NEGATIVE_SYMPTOMS = ['BREAKOUT','DRYNESS','REDNESS','IRRITATION','PURGING','OILINESS','DULLNESS']
const POSITIVE_SYMPTOMS = ['IMPROVEMENT','GLOW','HYDRATED','TEXTURE_SMOOTH']

async function generateCheckIns(
  brandId: string,
  consumerIds: string[],
  weeks: number,
  catalog: CatalogProfile,
  productFreq: Record<string, number> = {},
): Promise<number> {
  let totalCheckIns = 0
  const now = Date.now()

  const freqValues = Object.values(productFreq)
  const maxFreq = freqValues.length > 0 ? Math.max(...freqValues) : 1

  for (const userId of consumerIds) {
    try {
      const routine = await prisma.routine.findFirst({
        where: { endUserId: userId, activeTo: null },
        include: { steps: { include: { product: true } } },
      })

      const dropOffWeek = Math.random() < 0.15 ? randomInt(3, 5) : weeks + 1

      for (let w = 0; w < weeks; w++) {
        if (w >= dropOffWeek) continue

        const checkInDate = new Date(now - (weeks - w) * 7 * 24 * 60 * 60 * 1000)
        checkInDate.setDate(checkInDate.getDate() + randomInt(-2, 2))

        const baseRating = 2.5 + (w / weeks) * 1.5
        const skinRating = Math.min(5, Math.max(1, Math.round(baseRating + (Math.random() - 0.5))))

        const complianceProbability = w < 3 ? 0.9 : w < 5 ? 0.75 : 0.85
        const compliant = Math.random() < complianceProbability

        const negativeWeight = Math.max(0, 0.6 - (w / weeks) * 0.5)
        const symptoms: string[] = []
        if (Math.random() < negativeWeight && catalog.dominantConcerns.length > 0) {
          const neg = catalog.dominantConcerns.find(c => NEGATIVE_SYMPTOMS.includes(c))
          if (neg) symptoms.push(neg)
        }
        if (Math.random() < 0.3 + (w / weeks) * 0.4) {
          symptoms.push(randomItem(POSITIVE_SYMPTOMS))
        }

        const checkInProducts: Array<{ productId: string; used: boolean; reaction?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' }> = []
        if (routine) {
          const seen = new Set<string>()
          for (const step of routine.steps) {
            if (seen.has(step.productId)) continue
            seen.add(step.productId)

            const used = compliant || Math.random() > 0.3
            const freqBoost = (productFreq[step.productId] ?? 0) / maxFreq
            const positiveThreshold = 0.75 - freqBoost * 0.2
            const reactionRoll = Math.random()
            const reaction: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | undefined = used
              ? reactionRoll > positiveThreshold ? 'POSITIVE' : reactionRoll > 0.25 ? 'NEUTRAL' : 'NEGATIVE'
              : undefined

            checkInProducts.push({ productId: step.productId, used, ...(reaction !== undefined ? { reaction } : {}) })
          }
        }

        try {
          await prisma.checkIn.create({
            data: {
              endUserId: userId,
              date: checkInDate,
              skinRating,
              symptoms: symptoms.filter(Boolean) as any,
              compliant,
              products: {
                create: checkInProducts.map(p => ({
                  product: { connect: { id: p.productId } },
                  used: p.used,
                  ...(p.reaction !== undefined ? { reaction: p.reaction } : {}),
                })),
              },
            },
          })
          totalCheckIns++
        } catch { /* skip this week's check-in on constraint error */ }
      }
    } catch { /* skip consumer entirely if routine lookup fails */ }
  }

  return totalCheckIns
}

// ── Consumer identity seeding ─────────────────────────────────────────────────

async function seedConsumerIdentities(brandId: string, endUserIds: string[]): Promise<void> {
  if (endUserIds.length === 0) return

  // Guard: skip any that were already linked during import
  const alreadyLinked = await prisma.endUser.findMany({
    where: { id: { in: endUserIds }, consumerId: { not: null } },
    select: { id: true },
  })
  const linkedSet = new Set(alreadyLinked.map(u => u.id))
  const freshIds = endUserIds.filter(id => !linkedSet.has(id))
  if (freshIds.length === 0) return

  const shuffled = shuffle(freshIds)
  const identifiedCount = Math.round(shuffled.length * 0.65)
  const identifiedIds = shuffled.slice(0, identifiedCount)

  const otherDemoBrands = await prisma.brand.findMany({
    where: { isDemo: true, active: true, id: { not: brandId } },
    select: { id: true },
    take: 5,
  })

  // Guarantee at least 25–35% of identified consumers appear at other demo brands
  const crossBrandCount = otherDemoBrands.length > 0 ? Math.round(identifiedCount * 0.30) : 0
  const crossBrandSet = new Set(shuffle(identifiedIds).slice(0, crossBrandCount))

  const profiles = await prisma.userBeautyProfile.findMany({
    where: { endUserId: { in: identifiedIds } },
    select: { endUserId: true, skinType: true, skinConcerns: true, ageRange: true, monkSkinTone: true },
  })
  const profileMap = new Map(profiles.map(p => [p.endUserId, p]))

  const endUsers = await prisma.endUser.findMany({
    where: { id: { in: identifiedIds } },
    select: { id: true, email: true },
  })
  const emailMap = new Map(endUsers.map(u => [u.id, u.email]))

  for (const endUserId of identifiedIds) {
    const email = emailMap.get(endUserId) ?? null
    const profile = profileMap.get(endUserId)

    const prefillAnswers: Record<string, unknown> = {}
    if (profile) {
      if (profile.ageRange) prefillAnswers['SH0'] = profile.ageRange
      if (profile.skinType) prefillAnswers['S1'] = profile.skinType.toLowerCase()
      if (profile.skinConcerns?.length) prefillAnswers['S4'] = profile.skinConcerns
      if (profile.monkSkinTone) prefillAnswers['S5'] = String(profile.monkSkinTone)
    }

    let consumer: { id: string }
    try {
      consumer = await prisma.consumer.create({
        data: { email: email ?? null, prefillAnswers: prefillAnswers as any },
        select: { id: true },
      })
    } catch {
      consumer = await prisma.consumer.create({
        data: { prefillAnswers: prefillAnswers as any },
        select: { id: true },
      })
    }

    await prisma.endUser.update({
      where: { id: endUserId },
      data: { consumerId: consumer.id },
    })

    if (crossBrandSet.has(endUserId)) {
      // Seed to 1–3 other demo brands for richer cross-brand signals
      const brandsToSeed = shuffle(otherDemoBrands).slice(0, randomInt(1, Math.min(3, otherDemoBrands.length)))
      for (const otherBrand of brandsToSeed) {
        await prisma.endUser.create({
          data: { brandId: otherBrand.id, consumerId: consumer.id, email: email ?? null },
        }).catch(() => {})
      }
    }
  }
}

// ── Agent workflow seeding ────────────────────────────────────────────────────

async function seedAgentWorkflows(brandId: string): Promise<void> {
  const workflows = await Promise.all(
    PREBUILT_WORKFLOWS.map(wf =>
      prisma.agentWorkflow.create({
        data: {
          brandId,
          name: wf.name,
          description: wf.description,
          type: wf.type,
          config: wf.config as any,
          isActive: true,
          isPrebuilt: wf.isPrebuilt,
        },
      })
    )
  )

  await Promise.allSettled(
    workflows.map(wf => runAgentWorkflow(wf, brandId).catch(console.error))
  )
}
