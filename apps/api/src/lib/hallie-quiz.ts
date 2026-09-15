import type { BeautyArea } from '@halite/db'

/**
 * Hallie's preference quizzes, asked from a brand's storefront.
 *
 * A shopper who reaches a brand without a Hallie profile has nothing to
 * connect. Rather than turn them away, Connect offers the same preference
 * quiz Hallie asks — scoped to the categories that brand actually sells, so
 * a skincare-and-body brand asks the skincare and body questions and nothing
 * else. The answers create a real Hallie profile the shopper owns and
 * carries onward; the brand is simply where they happened to fill it in.
 *
 * Question keys and option values are lifted verbatim from Hallie's own
 * preference_responses rows. They must stay verbatim: Hallie reads these
 * back by key, and a value it does not recognise is a profile it cannot use.
 */

export type HallieCategory = 'skin_care' | 'body_care' | 'hair_care' | 'makeup' | 'perfume'

/** Halite's beauty areas onto the five categories Hallie's quizzes cover. */
export const AREA_TO_HALLIE: Record<BeautyArea, HallieCategory> = {
  SKINCARE: 'skin_care',
  BODY: 'body_care',
  HAIR: 'hair_care',
  MAKEUP: 'makeup',
  FRAGRANCE: 'perfume',
  // Hallie has no quiz of its own for these yet; they fold into the nearest
  // one so a brand selling them still gets a usable profile.
  NAILS: 'makeup',
  WELLNESS: 'body_care',
  SUN_CARE: 'skin_care',
  LIP_CARE: 'makeup',
  EYE_CARE: 'skin_care',
}

export interface QuizOption { value: string; label: string }
export interface QuizQuestion {
  key: string
  category: HallieCategory
  prompt: string
  help?: string
  multi: boolean
  optional?: boolean
  options: QuizOption[]
}

const opt = (pairs: Array<[string, string]>): QuizOption[] =>
  pairs.map(([value, label]) => ({ value, label }))

// The Monk Skin Tone scale. Hallie stores mst<n>; the live rows only span
// 4-9 because of who has answered so far, not because the scale is shorter.
const MONK = opt([
  ['mst1', 'Lightest'], ['mst2', 'Very light'], ['mst3', 'Light'],
  ['mst4', 'Light medium'], ['mst5', 'Medium'], ['mst6', 'Medium tan'],
  ['mst7', 'Tan'], ['mst8', 'Deep tan'], ['mst9', 'Deep'], ['mst10', 'Deepest'],
])

const USAGE = opt([
  ['very_little', 'Very little'], ['a_little', 'A little'],
  ['moderate_amount', 'A moderate amount'], ['a_lot', 'A lot'],
  ['a_very_large_amount', 'A very large amount'],
])

const QUESTIONS: Record<HallieCategory, QuizQuestion[]> = {
  skin_care: [
    { key: 'face_type', category: 'skin_care', prompt: 'How would you describe your skin?', multi: false,
      options: opt([['dry','Dry'],['oily','Oily'],['combination','Combination'],['normal','Normal'],['sensitive','Sensitive']]) },
    { key: 'primary_face_concern', category: 'skin_care', prompt: 'What are you most trying to change?', multi: false,
      options: opt([['acne','Breakouts'],['hyperpigmentation','Dark marks'],['aging','Fine lines'],['dullness','Dullness'],['texture','Texture'],['pores','Pores'],['redness','Redness']]) },
    { key: 'secondary_face_concerns', category: 'skin_care', prompt: 'Anything else on your mind?', multi: true, optional: true,
      options: opt([['dehydration','Dehydration'],['acne','Breakouts'],['hyperpigmentation','Dark marks'],['aging','Fine lines'],['dullness','Dullness'],['texture','Texture'],['pores','Pores'],['redness','Redness'],['none','Nothing else']]) },
    { key: 'sensitivity', category: 'skin_care', prompt: 'Does your skin react easily?', multi: false,
      options: opt([['yes','Yes'],['somewhat','Sometimes'],['no','No']]) },
    { key: 'monk_skin_tone', category: 'skin_care', prompt: 'Your skin tone', multi: false, options: MONK },
    { key: 'routine_complexity', category: 'skin_care', prompt: 'How involved is your routine?', multi: false,
      options: opt([['minimal','Minimal — a few steps'],['moderate','Moderate'],['extensive','Extensive']]) },
    { key: 'usage_intensity', category: 'skin_care', prompt: 'How much product do you get through?', multi: false, options: USAGE },
    { key: 'budget', category: 'skin_care', prompt: 'What do you usually spend per product?', multi: false,
      options: opt([['under_25','Under $25'],['25_50','$25–50'],['50_100','$50–100'],['100_plus','$100+']]) },
  ],
  body_care: [
    { key: 'skin_type', category: 'body_care', prompt: 'How would you describe your body skin?', multi: false,
      options: opt([['dry','Dry'],['normal','Normal'],['oily','Oily'],['sensitive','Sensitive']]) },
    { key: 'primary_body_concern', category: 'body_care', prompt: 'What are you most trying to change?', multi: false,
      options: opt([['dryness','Dryness'],['keratosis_pilaris','Bumps (keratosis pilaris)'],['ingrown_hairs','Ingrown hairs'],['uneven_tone','Uneven tone'],['firmness','Firmness'],['none','Nothing in particular']]) },
    { key: 'secondary_body_concerns', category: 'body_care', prompt: 'Anything else?', multi: true, optional: true,
      options: opt([['dryness','Dryness'],['keratosis_pilaris','Bumps'],['ingrown_hairs','Ingrown hairs'],['uneven_tone','Uneven tone'],['firmness','Firmness'],['none','Nothing else']]) },
    { key: 'texture_preference', category: 'body_care', prompt: 'What texture do you reach for?', multi: false,
      options: opt([['lotion','Lotion'],['cream','Cream'],['butter','Butter'],['oil','Oil']]) },
    { key: 'scent_preference', category: 'body_care', prompt: 'How scented do you like it?', multi: false,
      options: opt([['unscented','Unscented'],['lightly_scented','Lightly scented'],['strongly_scented','Strongly scented']]) },
    { key: 'monk_skin_tone', category: 'body_care', prompt: 'Your skin tone', multi: false, options: MONK },
    { key: 'usage_intensity', category: 'body_care', prompt: 'How much product do you get through?', multi: false, options: USAGE },
    { key: 'budget', category: 'body_care', prompt: 'What do you usually spend per product?', multi: false,
      options: opt([['under_15','Under $15'],['15_30','$15–30'],['30_60','$30–60'],['60_plus','$60+']]) },
  ],
  hair_care: [
    { key: 'hair_type', category: 'hair_care', prompt: 'What is your hair type?', multi: false,
      options: opt([['1a','1A — straight, fine'],['1b','1B — straight'],['1c','1C — straight, coarse'],['2a','2A — wavy'],['2b','2B — wavy'],['3a','3A — curly'],['3c','3C — curly, tight'],['4a','4A — coily'],['4b','4B — coily'],['4c','4C — coily, tight']]) },
    { key: 'hair_porosity', category: 'hair_care', prompt: 'How quickly does your hair absorb water?', help: 'High porosity soaks it up fast; low porosity resists it.', multi: false,
      options: opt([['low','Slowly (low)'],['normal','Normally'],['high','Quickly (high)']]) },
    { key: 'primary_hair_concern', category: 'hair_care', prompt: 'What are you most trying to change?', multi: false,
      options: opt([['dryness','Dryness'],['damage','Damage'],['frizz','Frizz'],['scalp','Scalp'],['thinning','Thinning'],['color_treated','Colour-treated care'],['none','Nothing in particular']]) },
    { key: 'secondary_hair_concerns', category: 'hair_care', prompt: 'Anything else?', multi: true, optional: true,
      options: opt([['dryness','Dryness'],['damage','Damage'],['frizz','Frizz'],['scalp','Scalp'],['oiliness','Oiliness'],['thinning','Thinning'],['color_treated','Colour-treated'],['none','Nothing else']]) },
    { key: 'wash_frequency', category: 'hair_care', prompt: 'How often do you wash?', multi: false,
      options: opt([['daily','Daily'],['every_other_day','Every other day'],['2_3_week','2–3 times a week'],['weekly','Weekly'],['biweekly','Every two weeks'],['monthly','Monthly']]) },
    { key: 'heat_styling', category: 'hair_care', prompt: 'How often do you use heat?', multi: false,
      options: opt([['never','Never'],['rarely','Rarely'],['few_times_week','A few times a week'],['daily','Daily']]) },
    { key: 'hair_wear', category: 'hair_care', prompt: 'How do you usually wear it?', multi: true, optional: true,
      options: opt([['natural','Natural'],['braids','Braids'],['locs','Locs'],['wig','Wig'],['blow_out','Blow out'],['silk_press','Silk press'],['plaits','Plaits']]) },
    { key: 'usage_intensity', category: 'hair_care', prompt: 'How much product do you get through?', multi: false,
      options: opt([['very_little','Very little'],['a_little','A little'],['moderate_amount','A moderate amount'],['a_lot','A lot']]) },
    { key: 'budget', category: 'hair_care', prompt: 'What do you usually spend per product?', multi: false,
      options: opt([['under_20','Under $20'],['20_40','$20–40'],['40_80','$40–80']]) },
  ],
  makeup: [
    { key: 'monk_skin_tone', category: 'makeup', prompt: 'Your skin tone', multi: false, options: MONK },
    { key: 'undertone', category: 'makeup', prompt: 'Your undertone', multi: false,
      options: opt([['cool','Cool'],['neutral','Neutral'],['warm','Warm'],['olive','Olive']]) },
    { key: 'coverage_preference', category: 'makeup', prompt: 'How much coverage do you like?', multi: false,
      options: opt([['sheer','Sheer'],['light','Light'],['medium','Medium'],['full','Full']]) },
    { key: 'finish_preference', category: 'makeup', prompt: 'What finish?', multi: false,
      options: opt([['matte','Matte'],['natural','Natural'],['satin','Satin'],['dewy','Dewy']]) },
    { key: 'concerns', category: 'makeup', prompt: 'Anything you want your base to handle?', multi: true, optional: true,
      options: opt([['oiliness','Oiliness'],['dryness','Dryness'],['large_pores','Large pores'],['redness','Redness'],['dark_spots','Dark spots'],['fine_lines','Fine lines'],['none','Nothing in particular']]) },
    { key: 'usage_intensity', category: 'makeup', prompt: 'How much product do you get through?', multi: false,
      options: opt([['very_little','Very little'],['a_little','A little'],['moderate_amount','A moderate amount'],['a_lot','A lot']]) },
    { key: 'budget', category: 'makeup', prompt: 'What do you usually spend per product?', multi: false,
      options: opt([['under_20','Under $20'],['20_40','$20–40'],['40_80','$40–80'],['80_plus','$80+']]) },
  ],
  perfume: [
    { key: 'scent_families', category: 'perfume', prompt: 'Which scents pull you in?', multi: true,
      options: opt([['floral','Floral'],['gourmand_sweet','Sweet, gourmand'],['woody','Woody'],['fresh_citrus','Fresh, citrus'],['aquatic','Aquatic'],['oriental_spicy','Oriental, spicy'],['spicy_ambery','Spicy amber']]) },
    { key: 'intensity', category: 'perfume', prompt: 'How strong do you wear it?', multi: false,
      options: opt([['light','Light'],['moderate','Moderate'],['strong','Strong']]) },
    { key: 'longevity', category: 'perfume', prompt: 'How should it wear through the day?', multi: false,
      options: opt([['consistent','Stay the same'],['evolves','Evolve as it wears'],['no_preference','No preference']]) },
    { key: 'when_worn', category: 'perfume', prompt: 'When do you wear fragrance?', multi: true,
      options: opt([['everyday_work','Everyday'],['date_night','Date night'],['special_occasion','Special occasions'],['at_home','At home'],['bedtime','Bedtime'],['all_occasions','Everything']]) },
    { key: 'usage_intensity', category: 'perfume', prompt: 'How much do you get through?', multi: false, options: USAGE },
    { key: 'budget', category: 'perfume', prompt: 'What do you usually spend per bottle?', multi: false,
      options: opt([['under_50','Under $50'],['50_100','$50–100'],['100_200','$100–200'],['200_plus','$200+']]) },
  ],
}

/** The categories a brand's areas map to, de-duplicated, order preserved. */
export function hallieCategoriesFor(areas: BeautyArea[]): HallieCategory[] {
  const out: HallieCategory[] = []
  for (const a of areas) {
    const c = AREA_TO_HALLIE[a]
    if (c && !out.includes(c)) out.push(c)
  }
  return out
}

/**
 * The questions to ask a shopper on this brand's storefront.
 *
 * Shared keys are asked per category because their options genuinely differ
 * — a body budget band is not a fragrance one. The exception is skin tone,
 * which is the same scale everywhere, so it is asked once and the answer
 * copied into each category on submission.
 */
export function quizFor(areas: BeautyArea[]): { categories: HallieCategory[]; questions: QuizQuestion[] } {
  const categories = hallieCategoriesFor(areas)
  const questions: QuizQuestion[] = []
  let askedSkinTone = false

  for (const c of categories) {
    for (const q of QUESTIONS[c]) {
      if (q.key === 'monk_skin_tone') {
        if (askedSkinTone) continue
        askedSkinTone = true
      }
      questions.push(q)
    }
  }
  return { categories, questions }
}

/**
 * Folds a flat answer map back into one `answers` object per category, in
 * the shape Hallie stores. Every value is an array, including single-select
 * ones — that is how Hallie's own rows are written.
 */
export function groupAnswers(
  areas: BeautyArea[],
  answers: Record<string, string[]>,
): Array<{ category: HallieCategory; answers: Record<string, string[]> }> {
  const categories = hallieCategoriesFor(areas)
  const skinTone = answers['monk_skin_tone']

  return categories.map(category => {
    const out: Record<string, string[]> = {}
    for (const q of QUESTIONS[category]) {
      const given = q.key === 'monk_skin_tone' ? skinTone : answers[q.key]
      if (!given || given.length === 0) continue
      // Drop anything outside this question's vocabulary rather than writing
      // a value Hallie cannot read back.
      const allowed = new Set(q.options.map(o => o.value))
      const kept = given.filter(v => allowed.has(v))
      if (kept.length) out[q.key] = q.multi ? kept : [kept[0]!]
    }
    return { category, answers: out }
  }).filter(r => Object.keys(r.answers).length > 0)
}

export { QUESTIONS }
