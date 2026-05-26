'use client'

import { Check, X } from 'lucide-react'

export const PASSWORD_RULES = [
  { re: /.{10,}/,       label: 'At least 10 characters' },
  { re: /[A-Z]/,        label: 'One uppercase letter' },
  { re: /[a-z]/,        label: 'One lowercase letter' },
  { re: /[0-9]/,        label: 'One number' },
  { re: /[^A-Za-z0-9]/, label: 'One special character (e.g. !@#$)' },
]

export function isPasswordValid(pw: string): boolean {
  return PASSWORD_RULES.every(r => r.re.test(pw))
}

interface Props {
  password: string
  visible?: boolean
}

export function PasswordStrength({ password, visible = true }: Props) {
  if (!visible || password.length === 0) return null

  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map(rule => {
        const met = rule.re.test(password)
        return (
          <li key={rule.label} className="flex items-center gap-2">
            <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{
              background: met ? 'var(--sage-light)' : 'var(--porcelain-2)',
            }}>
              {met
                ? <Check size={8} style={{ color: 'var(--sage)' }} strokeWidth={3} />
                : <X size={8} style={{ color: 'var(--ink-3)' }} strokeWidth={3} />
              }
            </span>
            <span className="text-[11px]" style={{ color: met ? 'var(--sage)' : 'var(--ink-3)' }}>
              {rule.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
