import { useEffect, useState } from 'react'

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  suffix?: string
  options?: number[]
}

/** Pole liczbowe zatwierdzane Enterem lub po wyjściu z pola (żeby nie tworzyć kroku cofania na każdą cyfrę). */
export function NumberField({ label, value, onChange, step = 1, min, suffix = 'cm', options }: Props) {
  const [text, setText] = useState(String(round(value)))
  useEffect(() => setText(String(round(value))), [value])
  const listId = options ? `opts-${label.replace(/\W/g, '')}` : undefined
  const commit = () => {
    const v = parseFloat(text.replace(',', '.'))
    if (!Number.isFinite(v) || (min !== undefined && v < min)) return setText(String(round(value)))
    if (v !== value) onChange(v)
  }
  return (
    <label className="field">
      <span>{label}</span>
      <span className="field-input">
        <input
          type="number"
          step={step}
          value={text}
          list={listId}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            e.stopPropagation()
          }}
        />
        {suffix && <em>{suffix}</em>}
      </span>
      {options && (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </label>
  )
}

const round = (v: number) => Math.round(v * 10) / 10
