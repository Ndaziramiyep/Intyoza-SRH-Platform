import { useCallback, useLayoutEffect, useRef, useState } from 'react'

type Pill = { left: number; top: number; width: number; height: number }

/** Tracks where a background pill should sit: over the item named `target`, inside a positioned `area`. */
export function useGlidePill(target: string | null) {
  const areaRef = useRef<HTMLElement | null>(null)
  const items = useRef(new Map<string, HTMLElement>())
  const [pill, setPill] = useState<Pill | null>(null)

  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el || !target) return
    const place = () => {
      const item = items.current.get(target)
      if (item) setPill({ left: item.offsetLeft, top: item.offsetTop, width: item.offsetWidth, height: item.offsetHeight })
    }
    place()
    // Item widths change with the language and when the font arrives.
    const observer = new ResizeObserver(place)
    observer.observe(el)
    return () => observer.disconnect()
  }, [target])

  const setArea = useCallback((el: HTMLElement | null) => {
    areaRef.current = el
  }, [])

  const register = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) items.current.set(key, el)
      else items.current.delete(key)
    },
    [],
  )

  return { areaRef, setArea, pill, register }
}
