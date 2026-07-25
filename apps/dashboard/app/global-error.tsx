'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Root error:', error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1A0A12',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 384,
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
              background: '#ffffff',
              border: '1px solid #E8DDD0',
            }}
          >
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4, color: '#450F2A' }}>
              Halite Intelligence
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#1A0A12' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, marginBottom: 24, color: '#8B6575' }}>
              The app hit an unexpected error. Reloading usually fixes it.
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: 'white',
                background: '#450F2A',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
