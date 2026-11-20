import { useEffect, useRef, useState } from 'react'
import { fuzzyFilter } from './fuzzy'

export type Command = { id: string; label: string; group: string; run: () => void }

type Props = { commands: Command[]; onClose: () => void }

// Editor-style command palette: type to filter, ↑↓ to move, enter to run, esc to close
export default function CommandPalette({ commands, onClose }: Props) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const list = useRef<HTMLUListElement>(null)
  const shown = fuzzyFilter(commands, q, c => `${c.group}: ${c.label}`)
  const active = Math.min(sel, Math.max(0, shown.length - 1))

  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, q])

  const run = (c?: Command) => { if (!c) return; onClose(); c.run() }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((active + 1) % Math.max(1, shown.length)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((active - 1 + shown.length) % Math.max(1, shown.length)) }
    else if (e.key === 'Enter') { e.preventDefault(); run(shown[active]) }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); onClose() }
  }

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-label="comandos" onMouseDown={e => e.stopPropagation()}>
        <input autoFocus value={q} placeholder="busca un comando…" aria-label="buscar comando"
          role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={shown[active] ? `cmd-${shown[active].id}` : undefined}
          onChange={e => { setQ(e.target.value); setSel(0) }} onKeyDown={onKey} />
        <ul id="palette-list" role="listbox" ref={list}>
          {shown.map((c, i) => (
            <li key={c.id} id={`cmd-${c.id}`} role="option" aria-selected={i === active}
              onMouseMove={() => setSel(i)} onClick={() => run(c)}>
              <span>{c.label}</span><small>{c.group}</small>
            </li>
          ))}
          {!shown.length && <li className="empty">sin resultados</li>}
        </ul>
        <div className="palette-foot"><kbd>↑↓</kbd> mover <kbd>enter</kbd> ejecutar <kbd>esc</kbd> cerrar</div>
      </div>
    </div>
  )
}
