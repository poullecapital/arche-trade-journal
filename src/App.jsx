import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [text, setText] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimeout = useRef(null)

  useEffect(() => {
    supabase
      .from('note')
      .select('content')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        setText(data?.content ?? '')
        setLoaded(true)
      })
  }, [])

  async function save(value) {
    setSaving(true)
    await supabase.from('note').update({ content: value, updated_at: new Date().toISOString() }).eq('id', 1)
    setSaving(false)
  }

  function handleChange(e) {
    const value = e.target.value
    setText(value)

    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => save(value), 500)
  }

  function handleSaveClick() {
    clearTimeout(saveTimeout.current)
    save(text)
  }

  return (
    <div className="min-h-screen bg-black relative">
      <textarea
        autoFocus
        value={text}
        onChange={handleChange}
        placeholder={loaded ? 'Type…' : ''}
        className="w-full min-h-screen resize-none bg-black text-white text-4xl leading-relaxed p-8 outline-none border-none placeholder:text-neutral-700"
      />
      <button
        type="button"
        onClick={handleSaveClick}
        disabled={saving}
        className="fixed bottom-4 right-4 px-3 py-1 text-xs font-medium rounded-md bg-[#238636] hover:bg-[#2ea043] disabled:opacity-60 text-white transition-colors"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

export default App
