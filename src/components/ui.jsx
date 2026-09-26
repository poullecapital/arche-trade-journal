import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// Brand mark — same artwork as public/favicon.svg.
export function LogoMark({ className = '' }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} role="img" aria-label="Arche">
      <defs>
        <linearGradient id="arche-logo" x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6660f0" />
          <stop offset="1" stopColor="#4038cc" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#arche-logo)" />
      <path d="M8.5 24 16 8l7.5 16" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m11.5 19.5 3-2.5 2 1.5 4-3.5" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Card({ children, className = '', tilt = false, ...props }) {
  const ref = useRef(null)

  function handleMove(e) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateY(-3px)`
  }

  function handleLeave() {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <div
      ref={ref}
      className={`card-3d ${tilt ? 'tilt' : ''} ${className}`}
      onMouseMove={tilt ? handleMove : undefined}
      onMouseLeave={tilt ? handleLeave : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="font-display text-[1.65rem] leading-tight text-[var(--ink)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--ink-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="inset inline-flex self-start max-w-full overflow-x-auto gap-1 p-1 rounded-full">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            value === t.id
              ? 'btn-3d'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Stat({ label, value, sub, tone = 'default' }) {
  const toneClass =
    tone === 'positive' ? 'text-[var(--accent)]' : tone === 'negative' ? 'text-[var(--red)]' : 'text-[var(--ink)]'
  return (
    <Card tilt className="p-5 flex flex-col gap-1.5">
      <div className="text-sm text-[var(--ink-muted)]">{label}</div>
      <div className={`tabular text-[1.75rem] leading-none font-semibold ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--ink-faint)]">{sub}</div>}
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
    <span className={`inline-flex items-center text-xs font-medium capitalize px-2.5 py-0.5 rounded-full ${toneMap[tone]}`}>
      {children}
    </span>
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'btn-3d',
    secondary: 'raised text-[var(--ink)] hover:-translate-y-px active:translate-y-px transition-transform',
    ghost: 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]',
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
    <Card className="p-10 flex flex-col items-center text-center gap-2">
      <div className="font-display text-lg text-[var(--ink)]">{title}</div>
      <div className="text-sm text-[var(--ink-muted)] max-w-sm">{description}</div>
      {action && <div className="mt-3">{action}</div>}
    </Card>
  )
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-[var(--ink-muted)] text-xs font-medium">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'inset rounded-xl px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] w-full'

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0b0e2a]/40 backdrop-blur-md p-4 py-10">
      <Card className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-6 relative !bg-[var(--surface-solid)]`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg text-[var(--ink)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-full text-[var(--ink-faint)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
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
