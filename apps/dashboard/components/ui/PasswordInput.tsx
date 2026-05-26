'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  id?: string
  name?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  autoComplete?: string
  disabled?: boolean
  inputClassName?: string
  inputStyle?: React.CSSProperties
  iconColor?: string
}

export function PasswordInput({
  id, name, value, onChange, placeholder, required, autoComplete, disabled,
  inputClassName, inputStyle, iconColor,
}: Props) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        disabled={disabled}
        className={inputClassName}
        style={inputStyle}
      />
      <button
        type="button"
        onClick={() => setShow(p => !p)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
        style={{ opacity: 0.35, color: iconColor ?? 'inherit' }}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}
