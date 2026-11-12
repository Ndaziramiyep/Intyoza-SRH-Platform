import { useEffect } from 'react'

/** Fades in each .reveal section as it scrolls into view. Runs again when the page changes. */
export function useReveal(page: string) {
  useEffect(() => {
    const sections = document.querySelectorAll('.reveal:not(.in)')
    if (!('IntersectionObserver' in window)) {
      sections.forEach((el) => el.classList.add('in'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('in')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [page])
}
