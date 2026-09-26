import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button, Card, Field, Input, LogoMark } from '../components/ui'

export function LoginPage() {
  const { signIn } = useAuth()
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const ok = await signIn(user, password)
    if (!ok) {
      setError('Incorrect user or password.')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="flex items-center gap-2.5 font-display text-xl mb-1">
          <LogoMark className="w-8 h-8" />
          Arche
        </div>
        <p className="text-sm text-[var(--ink-muted)] mb-5">Sign in to continue.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="User">
            <Input autoFocus autoComplete="username" required value={user} onChange={(e) => setUser(e.target.value)} />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-[var(--red)]">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
