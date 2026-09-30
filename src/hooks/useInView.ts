import { useEffect, useState, type RefObject } from 'react'

type Options = {
  initial?: boolean
  once?: boolean
  threshold?: number
  rootMargin?: string
}

export function useInView(
  ref: RefObject<Element | null>,
  { initial = false, once = false, threshold = 0, rootMargin = '0px' }: Options = {},
) {
  const [inView, setInView] = useState(initial)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (once && entry.isIntersecting) observer.disconnect()
      },
      { threshold, rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, once, threshold, rootMargin])

  return inView
}
