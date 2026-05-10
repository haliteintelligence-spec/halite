import { cn } from './utils'

interface Props {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

export function Badge({ children, variant = 'default', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variant === 'default' && 'bg-neutral-100 text-neutral-700',
        variant === 'success' && 'bg-green-50 text-green-700',
        variant === 'warning' && 'bg-yellow-50 text-yellow-700',
        variant === 'danger' && 'bg-red-50 text-red-700',
        className
      )}
    >
      {children}
    </span>
  )
}
