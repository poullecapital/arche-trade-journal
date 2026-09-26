const BAR_W = 46
const DEPTH = 22
const MAX_H = 150
const MIN_H = 10

// Isometric bar built from three skewed faces (front, right side, top) so it
// needs no WebGL — just CSS transforms.
function Bar({ height, hue, delay }) {
  const face = { position: 'absolute' }
  return (
    <div
      className="relative"
      style={{
        width: BAR_W,
        height,
        marginRight: DEPTH,
        animation: 'bar-rise 0.7s cubic-bezier(.2,.8,.2,1) both',
        animationDelay: `${delay}ms`,
        transformOrigin: 'bottom',
      }}
    >
      <div
        style={{
          ...face,
          inset: 0,
          borderRadius: '3px 3px 0 0',
          background: `linear-gradient(180deg, ${hue.front[0]}, ${hue.front[1]})`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)',
        }}
      />
      <div
        style={{
          ...face,
          left: '100%',
          top: 0,
          width: DEPTH,
          height: '100%',
          transformOrigin: 'left top',
          transform: 'skewY(-45deg)',
          background: `linear-gradient(180deg, ${hue.side[0]}, ${hue.side[1]})`,
        }}
      />
      <div
        style={{
          ...face,
          left: 0,
          bottom: '100%',
          width: '100%',
          height: DEPTH,
          transformOrigin: 'left bottom',
          transform: 'skewX(-45deg)',
          background: hue.top,
        }}
      />
    </div>
  )
}

const HUES = [
  { front: ['#8b8cff', '#5b5ce6'], side: ['#4a4bcc', '#33349a'], top: '#b5b6ff' },
  { front: ['#3fd9a5', '#0b9b6b'], side: ['#0a7f58', '#075a3f'], top: '#8ff0cd' },
  { front: ['#ffb066', '#f0801f'], side: ['#c96410', '#8f470a'], top: '#ffd3a1' },
  { front: ['#ff8fa0', '#dc3b4a'], side: ['#b02a37', '#7e1d27'], top: '#ffc0c9' },
]

export function Bars3D({ items, format }) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="flex items-end justify-center gap-6 pt-6 pb-2 min-h-[240px] overflow-x-auto">
      {items.map((item, i) => {
        const height = Math.max(MIN_H, (Math.max(item.value, 0) / max) * MAX_H)
        return (
          <div key={item.label} className="flex flex-col items-center gap-3 shrink-0">
            <div className="tabular text-sm font-semibold" style={{ marginBottom: DEPTH - 6 }}>
              {format(item.value)}
            </div>
            <Bar height={height} hue={HUES[i % HUES.length]} delay={i * 90} />
            <div className="text-xs text-[var(--ink-muted)] max-w-[110px] truncate text-center pt-1">{item.label}</div>
          </div>
        )
      })}
    </div>
  )
}
