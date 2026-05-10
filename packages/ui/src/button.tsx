import type { ButtonHTMLAttributes } from 'react'
import { cn } from './utils'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        variant === 'primary' && 'bg-neutral-900 text-white hover:bg-neutral-800',
        variant === 'secondary' && 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
        variant === 'ghost' && 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
        className
      )}
    />
  )
}
