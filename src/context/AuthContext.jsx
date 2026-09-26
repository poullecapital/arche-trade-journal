import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)
const STORAGE_KEY = 'arche-session'

// SHA-256 of the lowercased user name and of the password. This is a single,
// fixed login for the UI only — it keeps the app out of casual view but is not
// server-side security (the Supabase API itself is still open).
const USER_HASH = '192ac06fa5c2a6d66606d3a607868b9cec53a3058dea1779e4bc99e61108db7e'
const PASSWORD_HASH = 'b1ab1e892617f210425f658cf1d361b5489028c8771b56d845fe1c62c1fbc8b0'

async function sha256(text) {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function AuthProvider({ children }) {
  const [signedIn, setSignedIn] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  async function signIn(user, password) {
    const [userHash, passwordHash] = await Promise.all([sha256(user.trim().toLowerCase()), sha256(password)])
    const ok = userHash === USER_HASH && passwordHash === PASSWORD_HASH
    if (ok) {
      try {
        localStorage.setItem(STORAGE_KEY, '1')
      } catch {
        // storage unavailable — session just lasts until reload
      }
      setSignedIn(true)
    }
    return ok
  }

  function signOut() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // nothing to clear
    }
    setSignedIn(false)
  }

  return <AuthContext.Provider value={{ signedIn, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
