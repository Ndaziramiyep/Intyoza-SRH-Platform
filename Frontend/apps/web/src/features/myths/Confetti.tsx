import { useEffect, useRef } from 'react'

// Brand purple, its soft tint, and the text colour: the page's own colours, nothing new.
const COLOURS = ['var(--brand)', 'color-mix(in srgb, var(--brand) 45%, transparent)', 'color-mix(in srgb, var(--text) 35%, transparent)']
const PIECES = 48

/** Confetti falling over the whole screen for about two seconds. Skipped when the device asks for less motion. */
export function Confetti() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const box = ref.current
    if (!box || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const width = window.innerWidth
    const height = window.innerHeight
    const animations = Array.from(box.children).map((el, i) => {
      const startX = Math.random() * width
      const drift = (Math.random() - 0.5) * 240
      const spin = (Math.random() - 0.5) * 1080
      return (el as HTMLElement).animate(
        [
          { transform: `translate(${startX}px, -40px) rotate(0deg)`, opacity: 1 },
          { transform: `translate(${startX + drift}px, ${height + 40}px) rotate(${spin}deg)`, opacity: 0.9 },
        ],
        { duration: 1600 + Math.random() * 1200, delay: (i % 12) * 60, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)', fill: 'forwards' },
      )
    })
    return () => animations.forEach((a) => a.cancel())
  }, [])

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: PIECES }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 left-0 block opacity-0"
          style={{
            width: i % 3 === 0 ? 8 : 10,
            height: i % 3 === 0 ? 8 : 5,
            borderRadius: i % 3 === 0 ? '50%' : 2,
            background: COLOURS[i % COLOURS.length],
          }}
        />
      ))}
    </div>
  )
}
