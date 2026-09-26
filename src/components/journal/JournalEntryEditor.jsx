import { useState } from 'react'
import { Star } from 'lucide-react'
import { useJournalEntry, useSaveJournalEntry } from '../../hooks/useDailyJournal'
import { Field, Textarea } from '../ui'

const TEXT_FIELDS = {
  plan: {
    label: 'Pre-market plan',
    placeholder: 'Market bias, key levels, setups you will take, what would make you sit out…',
  },
  review: {
    label: 'End-of-day review',
    placeholder: 'What happened versus the plan? What did you do well, and where did you slip?',
  },
  lessons: {
    label: 'Lessons for tomorrow',
    placeholder: 'One or two things to carry into the next session.',
  },
}

// Edits the parts of one day's journal named in `fields` (any of plan, review,
// lessons, rating). Text saves when the box loses focus.
export function JournalEntryEditor({ date, fields }) {
  const { data: entry, isLoading } = useJournalEntry(date)
  const save = useSaveJournalEntry()

  if (isLoading) return <div className="h-32 rounded-xl bg-[var(--surface-2)] animate-pulse" />

  const persist = (patch) => save.mutate({ date, ...patch })

  return (
    <div className="flex flex-col gap-4">
      {fields
        .filter((f) => f in TEXT_FIELDS)
        .map((f) => (
          <SavedTextarea
            key={`${date}:${f}`}
            label={TEXT_FIELDS[f].label}
            placeholder={TEXT_FIELDS[f].placeholder}
            initial={entry?.[f] ?? ''}
            onSave={(value) => persist({ [f]: value })}
          />
        ))}
      {fields.includes('rating') && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--ink-muted)]">Day rating</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} of 5`}
                  onClick={() => persist({ day_rating: entry?.day_rating === n ? null : n })}
                  className="p-0.5 text-[var(--amber)]"
                >
                  <Star size={18} fill={n <= (entry?.day_rating ?? 0) ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--ink-muted)]">Followed the plan?</span>
            {[
              [true, 'Yes'],
              [false, 'No'],
            ].map(([value, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => persist({ followed_plan: entry?.followed_plan === value ? null : value })}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  entry?.followed_plan === value ? 'btn-3d' : 'bg-[var(--surface-2)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {save.isError && <p className="text-xs text-[var(--red)]">Couldn't save: {save.error.message}</p>}
    </div>
  )
}

function SavedTextarea({ label, placeholder, initial, onSave }) {
  const [value, setValue] = useState(initial)
  const [savedValue, setSavedValue] = useState(initial)

  return (
    <Field label={label}>
      <Textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value === savedValue) return
          setSavedValue(value)
          onSave(value)
        }}
      />
    </Field>
  )
}
