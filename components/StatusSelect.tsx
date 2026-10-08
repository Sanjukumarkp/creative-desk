'use client'

import { useTransition } from 'react'
import { setAssetStatus, setConceptStatus } from '@/app/actions'
import { ASSET_STATUSES, CONCEPT_STATUSES } from '@/lib/types'

export default function StatusSelect({ kind, id, value }: { kind: 'concept' | 'asset'; id: string; value: string }) {
  const [pending, start] = useTransition()
  const list = kind === 'concept' ? CONCEPT_STATUSES : ASSET_STATUSES
  return (
    <select
      aria-label="Status"
      value={value}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value
        start(() => (kind === 'concept' ? setConceptStatus(id, v) : setAssetStatus(id, v)))
      }}
    >
      {list.map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </select>
  )
}
