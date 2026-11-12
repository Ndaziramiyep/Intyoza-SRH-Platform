import { useCallback, useEffect, useRef } from 'react'

// Close enough to the end to count as reading the newest message.
const NEAR_END_PX = 64
// Room left above an answer when it is brought into view.
const ANSWER_GAP_PX = 8

/** How far down a scrolling area an element sits. Not thrown off by the element's arrival animation. */
function offsetWithin(element: HTMLElement, area: HTMLElement) {
  let top = 0
  for (let at: HTMLElement | null = element; at && at !== area; at = at.offsetParent as HTMLElement | null) top += at.offsetTop
  return top
}

/**
 * Keeps a scrolling area at its newest content when `change` changes, unless the person
 * scrolled up to read. `resetKey` (the open chat) starts following again when it changes.
 * With `startOf` (a selector, inside a positioned area), the last match is shown from its first
 * line rather than its end, so a long answer is read from the top.
 */
export function useStickToBottom<T extends HTMLElement>(change: unknown, resetKey: unknown, startOf?: string | null) {
  const ref = useRef<T>(null)
  const following = useRef(true)
  const lastTop = useRef(0)

  const onScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    // Only moving up stops it: a smooth scroll on its way down is also "far from the end".
    if (distance <= NEAR_END_PX) following.current = true
    else if (el.scrollTop < lastTop.current) following.current = false
    lastTop.current = el.scrollTop
  }, [])

  /** Follows again, for when the person sends something themselves. */
  const stick = useCallback(() => {
    following.current = true
  }, [])

  useEffect(() => {
    following.current = true
  }, [resetKey])

  useEffect(() => {
    const el = ref.current
    if (!el || !following.current) return
    const end = el.scrollHeight - el.clientHeight
    const matches = startOf ? el.querySelectorAll<HTMLElement>(startOf) : null
    const start = matches?.[matches.length - 1]
    const top = start ? offsetWithin(start, el) - ANSWER_GAP_PX : end
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ top: Math.min(top, end), behavior: calm ? 'auto' : 'smooth' })
  }, [change, resetKey, startOf])

  return { ref, onScroll, stick, following }
}
