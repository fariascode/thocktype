import { t } from './i18n'
import { useEffect, useRef, useState } from 'react'

const MAX_TAGS = 20
type Props = {
  tags: string[]; active: string[]; open: boolean
  onOpen: (open: boolean) => void; onChange: (tags: string[], active: string[]) => void
}

// Active tags sit above the words; the popover creates, toggles and deletes them. Every saved test carries its active tags.
export default function TagPicker({ tags, active, open, onOpen, onChange }: Props) {
  const [name, setName] = useState('')
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) onOpen(false) }
    document.addEventListener('mousedown', out)
    return () => document.removeEventListener('mousedown', out)
  }, [open, onOpen])

  const toggle = (t: string) => onChange(tags, active.includes(t) ? active.filter(x => x !== t) : [...active, t])
  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const t = name.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 20)
    if (!t) return
    setName('')
    if (tags.includes(t)) { if (!active.includes(t)) toggle(t); return }
    if (tags.length >= MAX_TAGS) return
    onChange([...tags, t], [...active, t]) // a new tag starts active
  }
  const remove = (t: string) => onChange(tags.filter(x => x !== t), active.filter(x => x !== t))

  return (
    <div className="tags" ref={box}>
      {active.map(t => <span key={t} className="tag-chip">#{t}</span>)}
      <button className="tag-btn" onClick={() => onOpen(!open)} aria-expanded={open} title={t('etiqueta tus tests para comparar situaciones')}>
        {active.length ? '＃' : `＃ ${t('etiquetas')}`}
      </button>
      {open && (
        <div className="tag-pop card" role="dialog" aria-label={t('etiquetas')} onKeyDown={e => e.key === 'Escape' && onOpen(false)}>
          <small>{t('etiquetas activas · se guardan en tus próximos tests')}</small>
          {tags.length > 0 && (
            <ul className="tag-list">
              {tags.map(tag => (
                <li key={tag}>
                  <button role="switch" aria-checked={active.includes(tag)} className={active.includes(tag) ? 'on' : ''} onClick={() => toggle(tag)}>#{tag}</button>
                  <button className="tag-del" onClick={() => remove(tag)} aria-label={t('borrar etiqueta {tag}', { tag })}>✕</button>
                </li>
              ))}
            </ul>
          )}
          <form className="set-row" onSubmit={add}>
            <input className="set-input" autoFocus placeholder={t('nueva, p. ej. teclado nuevo')} maxLength={20} aria-label={t('nueva etiqueta')}
              value={name} onChange={e => setName(e.target.value)} />
            <button className="on" type="submit" disabled={!name.trim() || (tags.length >= MAX_TAGS && !tags.includes(name.trim().toLowerCase()))}>{t('crear')}</button>
          </form>
          <small className="set-help">{t('compara cómo rindes con cada etiqueta en tu historial')}</small>
        </div>
      )}
    </div>
  )
}
