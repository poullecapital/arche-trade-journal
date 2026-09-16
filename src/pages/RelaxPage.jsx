import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Plus, RotateCcw, Trash2, Volume2, VolumeX } from 'lucide-react'
import { useCreateStickyNote, useDeleteStickyNote, useStickyNotes, useUpdateStickyNote } from '../hooks/useStickyNotes'
import { Button, Card, PageHeader } from '../components/ui'

export function RelaxPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Recovery" title="Relax" />
      <div className="grid md:grid-cols-3 gap-5">
        <Clock />
        <FocusTimer />
        <BreathingGuide />
      </div>
      <AmbientPlayer />
      <BubbleWrap />
      <StickyNotes />
    </div>
  )
}

const BREATH_PHASES = [
  { label: 'Breathe in', duration: 4000, scale: 1 },
  { label: 'Hold', duration: 4000, scale: 1 },
  { label: 'Breathe out', duration: 4000, scale: 0.55 },
  { label: 'Hold', duration: 4000, scale: 0.55 },
]

function BreathingGuide() {
  const [active, setActive] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)

  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => setPhaseIndex((i) => (i + 1) % BREATH_PHASES.length), BREATH_PHASES[phaseIndex].duration)
    return () => clearTimeout(timer)
  }, [active, phaseIndex])

  const phase = BREATH_PHASES[phaseIndex]

  return (
    <Card className="p-6 flex flex-col items-center justify-center gap-4">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--accent) 25%, transparent)',
            transform: `scale(${active ? phase.scale : 0.55})`,
            transition: `transform ${active ? phase.duration : 300}ms ease-in-out`,
          }}
        />
        <div className="relative text-sm font-medium text-center px-2">{active ? phase.label : 'Box breathing'}</div>
      </div>
      <Button
        variant={active ? 'secondary' : 'primary'}
        onClick={() => {
          setActive((a) => !a)
          setPhaseIndex(0)
        }}
      >
        {active ? 'Stop' : 'Start'}
      </Button>
    </Card>
  )
}

const BUBBLE_COUNT = 70

function BubbleWrap() {
  const [popped, setPopped] = useState(() => new Set())
  const audioCtxRef = useRef(null)

  function playPop() {
    const ctx = audioCtxRef.current || (audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)())
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(220, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  }

  function pop(i) {
    if (popped.has(i)) return
    setPopped((prev) => new Set(prev).add(i))
    playPop()
  }

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Bubble wrap</h2>
        <Button variant="secondary" onClick={() => setPopped(new Set())} disabled={popped.size === 0}>
          <RotateCcw size={14} /> Reset
        </Button>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(26px, 1fr))' }}>
        {Array.from({ length: BUBBLE_COUNT }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => pop(i)}
            aria-label={popped.has(i) ? 'popped bubble' : 'pop bubble'}
            className="aspect-square rounded-full transition-transform duration-150"
            style={{
              background: popped.has(i)
                ? 'color-mix(in srgb, var(--ink) 8%, var(--surface-2))'
                : 'color-mix(in srgb, var(--accent) 30%, var(--surface))',
              boxShadow: popped.has(i) ? 'inset 0 1px 3px rgba(0,0,0,.25)' : 'var(--shadow)',
              transform: popped.has(i) ? 'scale(0.8)' : 'scale(1)',
              cursor: popped.has(i) ? 'default' : 'pointer',
            }}
          />
        ))}
      </div>
      {popped.size === BUBBLE_COUNT && <p className="text-xs text-[var(--ink-faint)]">All popped. Nicely done.</p>}
    </Card>
  )
}

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <Card className="p-6 flex flex-col items-center justify-center gap-1">
      <div className="tabular font-display text-5xl font-semibold">
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-sm text-[var(--ink-muted)]">
        {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
    </Card>
  )
}

const PRESETS = [
  { label: 'Focus 25', seconds: 25 * 60 },
  { label: 'Short break 5', seconds: 5 * 60 },
  { label: 'Long break 15', seconds: 15 * 60 },
]

function FocusTimer() {
  const [seconds, setSeconds] = useState(PRESETS[0].seconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setRunning(false)
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <Card className="p-6 flex flex-col items-center justify-center gap-4">
      <div className="tabular font-display text-5xl font-semibold">
        {mm}:{ss}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => setRunning((r) => !r)}>
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setRunning(false)
            setSeconds(PRESETS[0].seconds)
          }}
        >
          <RotateCcw size={15} />
        </Button>
      </div>
      <div className="flex gap-1.5 flex-wrap justify-center">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setRunning(false)
              setSeconds(p.seconds)
            }}
            className="text-xs px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            {p.label}
          </button>
        ))}
      </div>
    </Card>
  )
}

const SOUNDS = [
  { id: 'off', label: 'Off' },
  { id: 'brown', label: 'Deep rumble' },
  { id: 'rain', label: 'Soft rain' },
  { id: 'drone', label: 'Warm drone' },
]

function AmbientPlayer() {
  const [sound, setSound] = useState('off')
  const [volume, setVolume] = useState(0.4)
  const audioRef = useRef({})

  useEffect(() => {
    stopAll()
    if (sound !== 'off') startSound(sound, volume)
    return stopAll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound])

  useEffect(() => {
    if (audioRef.current.gain) audioRef.current.gain.gain.value = volume
  }, [volume])

  function stopAll() {
    const ctx = audioRef.current.ctx
    if (ctx) {
      ctx.close()
      audioRef.current = {}
    }
  }

  function startSound(kind, vol) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const gain = ctx.createGain()
    gain.gain.value = vol
    gain.connect(ctx.destination)

    if (kind === 'brown' || kind === 'rain') {
      const bufferSize = 2 * ctx.sampleRate
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      let lastOut = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        lastOut = (lastOut + 0.02 * white) / 1.02
        data[i] = lastOut * (kind === 'brown' ? 6 : 3.5)
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      noise.loop = true
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = kind === 'brown' ? 300 : 1200
      noise.connect(filter)
      filter.connect(gain)
      noise.start()
      audioRef.current = { ctx, gain, nodes: [noise] }
    } else if (kind === 'drone') {
      const freqs = [98, 147, 196]
      const nodes = freqs.map((f, i) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = f
        const oscGain = ctx.createGain()
        oscGain.gain.value = i === 0 ? 0.5 : 0.25
        osc.connect(oscGain)
        oscGain.connect(gain)
        osc.start()
        return osc
      })
      audioRef.current = { ctx, gain, nodes }
    }
  }

  return (
    <Card className="p-5 flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold">Ambient sound</h2>
      <div className="flex flex-wrap gap-2">
        {SOUNDS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSound(s.id)}
            className={`text-sm px-3 py-1.5 rounded-full border ${
              sound === s.id
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        {volume === 0 ? <VolumeX size={15} className="text-[var(--ink-faint)]" /> : <Volume2 size={15} className="text-[var(--ink-faint)]" />}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-40"
        />
      </div>
      <p className="text-xs text-[var(--ink-faint)]">Generated locally — no audio files, nothing to license.</p>
    </Card>
  )
}

const COLORS = ['amber', 'accent', 'red', 'default']

function StickyNotes() {
  const { data: notes = [] } = useStickyNotes()
  const create = useCreateStickyNote()
  const update = useUpdateStickyNote()
  const remove = useDeleteStickyNote()

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold">Sticky notes</h2>
        <Button
          variant="secondary"
          onClick={() => create.mutate({ content: '', color: COLORS[notes.length % COLORS.length] })}
        >
          <Plus size={15} /> New note
        </Button>
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-[var(--ink-faint)]">Jot something down — reminders, ideas, anything off the books.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((note) => (
            <StickyNote key={note.id} note={note} onSave={(content) => update.mutate({ id: note.id, content })} onDelete={() => remove.mutate(note.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function StickyNote({ note, onSave, onDelete }) {
  const [content, setContent] = useState(note.content)
  const toneMap = {
    amber: 'bg-[var(--amber-soft)]',
    accent: 'bg-[var(--accent-soft)]',
    red: 'bg-[var(--red-soft)]',
    default: 'bg-[var(--surface-2)]',
  }
  return (
    <div className={`rounded-xl p-4 flex flex-col gap-2 ${toneMap[note.color] || toneMap.default}`}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => onSave(content)}
        rows={4}
        placeholder="Write something…"
        className="bg-transparent resize-none outline-none text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)]"
      />
      <button onClick={onDelete} className="self-end text-[var(--ink-faint)] hover:text-[var(--red)]">
        <Trash2 size={13} />
      </button>
    </div>
  )
}
