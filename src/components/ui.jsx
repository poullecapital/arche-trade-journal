import { useEffect } from 'react'
import { X } from 'lucide-react'

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow)] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function PageHeader({ eyebrow, title, action }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5 pb-3 border-b border-[var(--border)]">
      <div>
        {eyebrow && (
          <div className="font-mono text-[.66rem] uppercase tracking-[.12em] text-[var(--accent)] mb-0.5">{eyebrow}</div>
        )}
        <h1 className="font-display text-xl text-[var(--ink)]">{title}</h1>
      </div>
      {action}
    </div>
  )
}

export function Stat({ label, value, sub, tone = 'default' }) {
  const toneClass =
    tone === 'positive' ? 'text-[var(--accent)]' : tone === 'negative' ? 'text-[var(--red)]' : 'text-[var(--ink)]'
  return (
    <Card className="p-3 flex flex-col gap-0.5">
      <div className="text-[.68rem] text-[var(--ink-muted)] font-mono uppercase tracking-wide">{label}</div>
      <div className={`tabular text-xl font-semibold ${toneClass}`}>{value}</div>
      {sub && <div className="text-[.7rem] text-[var(--ink-faint)] font-mono">{sub}</div>}
    </Card>
  )
}

export function Pill({ children, tone = 'default' }) {
  const toneMap = {
    default: 'bg-[var(--surface-2)] text-[var(--ink-muted)]',
    accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
    amber: 'bg-[var(--amber-soft)] text-[var(--amber)]',
    red: 'bg-[var(--red-soft)] text-[var(--red)]',
  }
  return (
    <span className={`inline-flex items-center font-mono text-[.66rem] uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${toneMap[tone]}`}>
      {children}
    </span>
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-sm text-sm font-medium px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90',
    secondary: 'bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--border)]',
    ghost: 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
    danger: 'bg-[var(--red-soft)] text-[var(--red)] hover:opacity-80',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <Card className="p-8 flex flex-col items-center text-center gap-2">
      <div className="font-display text-base text-[var(--ink)]">{title}</div>
      <div className="text-sm text-[var(--ink-muted)] max-w-sm">{description}</div>
      {action && <div className="mt-2">{action}</div>}
    </Card>
  )
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--ink-muted)] text-[.7rem] font-mono uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'bg-[var(--bg)] border border-[var(--border)] rounded-sm px-2.5 py-1.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] w-full'

export function Input({ className = '', ...props }) {
  return <input className={`${inputClass} ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`${inputClass} resize-y ${className}`} {...props} />
}

export function Select({ children, className = '', ...props }) {
  return (
    <select className={`${inputClass} ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10">
      <Card className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-5 relative`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base text-[var(--ink)]">{title}</h2>
          <button onClick={onClose} className="text-[var(--ink-faint)] hover:text-[var(--ink)]">
            <X size={18} />
          </button>
        </div>
        {children}
      </Card>
    </div>
  )
}

export function formatCurrency(value, currency = 'INR') {
  const n = Number(value ?? 0)
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

export function formatNumber(value, digits = 2) {
  const n = Number(value ?? 0)
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(n)
}
