import { IngredientLab } from '@/components/intelligence/IngredientLab'

interface Props { params: Promise<{ slug: string }> }

export default async function IngredientsPage({ params }: Props) {
  const { slug } = await params
  return (
    <div className="px-7 py-6">
      <div className="mb-6">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
          Intelligence
        </p>
        <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Ingredients</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Ingredient intelligence index, coverage gaps & concern mapping
        </p>
      </div>
      <IngredientLab />
    </div>
  )
}
