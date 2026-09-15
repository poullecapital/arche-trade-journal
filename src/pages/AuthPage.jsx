import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Card, Field, Input } from '../components/ui'

export function AuthPage() {
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setInfo('Account created. Check your email to confirm, then sign in.')
        setMode('sign-in')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <Card className="w-full max-w-sm p-7">
        <div className="font-display italic font-bold text-3xl text-[var(--ink)] mb-1">
          Arch<span className="text-[var(--accent)]">e</span>
        </div>
        <p className="text-sm text-[var(--ink-muted)] mb-6">Poulle Capital — sign in to the firm's books.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <div className="text-sm text-[var(--red)]">{error}</div>}
          {info && <div className="text-sm text-[var(--accent)]">{info}</div>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
        <button
          className="mt-4 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] underline underline-offset-2"
          onClick={() => {
            setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'))
            setError(null)
            setInfo(null)
          }}
        >
          {mode === 'sign-in' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
        </button>
      </Card>
    </div>
  )
}
