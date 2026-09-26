import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useCreateStickyNote, useDeleteStickyNote, useStickyNotes, useUpdateStickyNote } from '../hooks/useStickyNotes'
import { Button } from './ui'

const COLORS = ['amber', 'accent', 'red', 'default']

export function StickyNotes() {
  const { data: notes = [] } = useStickyNotes()
  const create = useCreateStickyNote()
  const update = useUpdateStickyNote()
  const remove = useDeleteStickyNote()

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-base">Sticky notes</h2>
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
