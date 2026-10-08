import type { Concept } from '@/lib/types'
import { AWARENESS, FORMATS } from '@/lib/types'

export default function ConceptFields({ concept, compact }: { concept?: Partial<Concept>; compact?: boolean }) {
  const c = concept ?? {}
  return (
    <div className="form-grid" style={compact ? { gridTemplateColumns: '1fr' } : undefined}>
      <label className="field">
        Working title
        <input type="text" name="title" defaultValue={c.title} required />
      </label>
      <label className="field">
        Format
        <input type="text" name="format" defaultValue={c.format} list="formats" />
        <datalist id="formats">
          {FORMATS.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </label>
      <label className="field full">
        Hook
        <small>The literal first line, spoken or on screen, in the first two seconds.</small>
        <textarea name="hook" defaultValue={c.hook} rows={2} />
      </label>
      <label className="field full">
        Angle
        <small>What belief this shifts, and why it should work.</small>
        <textarea name="angle" defaultValue={c.angle} rows={3} />
      </label>
      <label className="field">
        Awareness stage
        <select name="awareness" defaultValue={c.awareness ?? ''}>
          <option value="">Not set</option>
          {AWARENESS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Persona
        <input type="text" name="persona" defaultValue={c.persona} placeholder="Who's on camera, who it speaks to" />
      </label>
      <label className="field full">
        Notes
        <textarea name="notes" defaultValue={c.notes} rows={3} />
      </label>
    </div>
  )
}
