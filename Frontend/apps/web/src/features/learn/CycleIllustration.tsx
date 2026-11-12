import { useLanguage } from '../../i18n/context'
import type { TKey } from '@intyoza/shared/i18n/translations'

// A lightweight (under 2 KB) diagram of the menstrual cycle.
const PHASES: { label: TKey; days: TKey; color: string; start: number; end: number }[] = [
  { label: 'cycle.period', days: 'cycle.days1', color: 'var(--brand)', start: 0, end: 5 },
  { label: 'cycle.eggGrows', days: 'cycle.days2', color: 'color-mix(in srgb, var(--ink) 35%, var(--base))', start: 5, end: 13 },
  { label: 'cycle.ovulation', days: 'cycle.days3', color: 'var(--ink)', start: 13, end: 15 },
  { label: 'cycle.liningWaits', days: 'cycle.days4', color: 'color-mix(in srgb, var(--ink) 65%, var(--base))', start: 15, end: 28 },
]

const R = 80
const C = 2 * Math.PI * R

export function CycleIllustration() {
  const { t } = useLanguage()
  return (
    <figure className="mb-6 flex flex-wrap items-center gap-6 rounded-[14px] bg-surface-2 p-5 [&_p]:m-0">
      <svg viewBox="0 0 220 220" width="220" height="220" role="img" aria-label={t('cycle.aria')}>
        <g transform="rotate(-90 110 110)">
          {PHASES.map((p) => (
            <circle
              key={p.label}
              cx="110"
              cy="110"
              r={R}
              fill="none"
              stroke={p.color}
              strokeWidth="26"
              strokeDasharray={`${((p.end - p.start) / 28) * C - 2} ${C}`}
              strokeDashoffset={-(p.start / 28) * C}
            />
          ))}
        </g>
        <text x="110" y="104" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">
          {t('cycle.length')}
        </text>
        <text x="110" y="124" textAnchor="middle" fontSize="13" fill="currentColor" opacity="0.7">
          {t('cycle.example')}
        </text>
      </svg>
      <figcaption className="min-w-[200px] flex-1">
        <ul className="mb-2 !list-none !pl-0 text-[0.95rem]">
          {PHASES.map((p) => (
            <li key={p.label} className="flex items-center gap-2 py-[3px]">
              <span className="size-3.5 shrink-0 rounded" style={{ background: p.color }} />
              <strong>{t(p.label)}</strong> <span className="text-muted">{t(p.days)}</span>
            </li>
          ))}
        </ul>
        <p className="text-[0.85rem] text-muted">{t('cycle.note')}</p>
      </figcaption>
    </figure>
  )
}
