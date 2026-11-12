// Drawings made from the app's three colours, so they follow light and dark and cost almost no data.
// All are decoration: the text next to them says the same thing.

const TINT = { fill: 'color-mix(in srgb, var(--brand) 22%, var(--base))' }

export type SpotName = 'ask' | 'services' | 'community' | 'learn' | 'myths' | 'privacy'

/** Small picture for one part of the app. */
export function Spot({ name, className = 'size-16' }: { name: SpotName; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {name === 'ask' && (
        <>
          <path d="M8 12a8 8 0 0 1 8-8h26a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8H24l-11 9v-9.400A8 8 0 0 1 8 30z" className="fill-brand" />
          <g className="spot-pulse fill-surface">
            <circle cx="20" cy="21" r="3" />
            <circle cx="29" cy="21" r="3" />
            <circle cx="38" cy="21" r="3" />
          </g>
          <path d="M36 42a6 6 0 0 1 6-6h10a6 6 0 0 1 6 6v6a6 6 0 0 1-3 5.200V60l-7-6H42a6 6 0 0 1-6-6z" className="fill-fg" />
        </>
      )}
      {name === 'services' && (
        <>
          <ellipse cx="32" cy="55" rx="20" ry="6" style={TINT} />
          <g className="spot-hop">
            <path d="M32 4C20 4 11 13 11 25c0 15 21 31 21 31s21-16 21-31C53 13 44 4 32 4z" className="fill-brand" />
            <circle cx="32" cy="25" r="11" className="fill-surface" />
            <path d="M32 19v12M26 25h12" className="stroke-brand" strokeWidth="3.500" strokeLinecap="round" />
          </g>
        </>
      )}
      {name === 'community' && (
        <>
          <g className="fill-fg">
            <circle cx="14" cy="24" r="8" />
            <path d="M1 52c0-13 5-20 13-20s13 7 13 20z" />
            <circle cx="50" cy="24" r="8" />
            <path d="M37 52c0-13 5-20 13-20s13 7 13 20z" />
          </g>
          <g className="spot-hop fill-brand">
            <circle cx="32" cy="20" r="10" />
            <path d="M15 58c0-17 7-26 17-26s17 9 17 26z" />
          </g>
        </>
      )}
      {name === 'learn' && (
        <>
          <path d="M32 16C25 9 14 8 4 10v40c10-2 21-1 28 6z" className="fill-brand" />
          <path d="M32 16c7-7 18-8 28-6v40c-10-2-21-1-28 6z" className="fill-fg" />
          <g className="spot-pulse stroke-surface" strokeWidth="2.500" strokeLinecap="round">
            <path d="M12 20c5 0 9 1 13 3M12 30c5 0 9 1 13 3" />
            <path d="M52 20c-5 0-9 1-13 3M52 30c-5 0-9 1-13 3" />
          </g>
        </>
      )}
      {name === 'myths' && (
        <g className="spot-tilt">
          <circle cx="27" cy="27" r="21" className="fill-surface stroke-brand" strokeWidth="6" />
          <path d="M43 43l15 15" className="stroke-fg" strokeWidth="8" strokeLinecap="round" />
          <path d="M20 21a7.500 7.500 0 1 1 11 7c-3 2-4 3-4 6" fill="none" className="stroke-brand" strokeWidth="4" strokeLinecap="round" />
          <circle cx="27" cy="41" r="2.500" className="fill-brand" />
        </g>
      )}
      {name === 'privacy' && (
        <>
          <path d="M32 3l24 9v18c0 15-10 26-24 31C18 56 8 45 8 30V12z" className="fill-brand" />
          <path d="M21 32l8 8 15-16" fill="none" className="stroke-surface spot-draw" strokeWidth="5.500" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}
