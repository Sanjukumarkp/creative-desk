import type { Brand } from '@/lib/types'

export default function BrandFields({ brand, compact }: { brand?: Partial<Brand>; compact?: boolean }) {
  const b = brand ?? {}
  return (
    <div className="form-grid" style={compact ? { gridTemplateColumns: '1fr' } : undefined}>
      <label className="field">
        Brand name
        <input type="text" name="name" defaultValue={b.name} required />
      </label>
      <label className="field">
        Website
        <input type="text" name="website" defaultValue={b.website} placeholder="brand.com" />
      </label>
      <label className="field full">
        Product
        <small>What it is, the hero SKU, price, what's in it.</small>
        <textarea name="product" defaultValue={b.product} rows={2} />
      </label>
      <label className="field">
        Audience
        <small>Who buys it and what they're struggling with.</small>
        <textarea name="audience" defaultValue={b.audience} rows={3} />
      </label>
      <label className="field">
        Voice
        <small>How the brand sounds on camera.</small>
        <textarea name="voice" defaultValue={b.voice} rows={3} />
      </label>
      <label className="field">
        Proof points
        <small>Reviews, numbers, ingredients, guarantees. One per line.</small>
        <textarea name="proof_points" defaultValue={b.proof_points} rows={4} />
      </label>
      <label className="field">
        Approved claims
        <small>The exact claims the brand can substantiate. One per line.</small>
        <textarea name="allowed_claims" defaultValue={b.allowed_claims} rows={4} />
      </label>
      <label className="field">
        Never say
        <small>Words or claims to flag in every script. One per line.</small>
        <textarea name="banned_claims" defaultValue={b.banned_claims} rows={3} />
      </label>
      <label className="field">
        Notes
        <textarea name="notes" defaultValue={b.notes} rows={3} />
      </label>
    </div>
  )
}
