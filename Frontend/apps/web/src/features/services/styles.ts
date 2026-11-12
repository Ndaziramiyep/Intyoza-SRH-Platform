// Tailwind class strings shared by the Youth Health Connect screens.

export const openBadge = (open: boolean) =>
  `inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-[3px] text-[0.8rem] font-bold ${
    open ? 'bg-surface-2 text-fg' : 'bg-surface-2 text-muted'
  }`

/** Service name + cost rows, with dashed separators. */
export const serviceList =
  'grid gap-x-4 gap-y-1.5 [&_li]:flex [&_li]:items-center [&_li]:justify-between [&_li]:gap-2 [&_li]:border-b [&_li]:border-dashed [&_li]:border-line [&_li]:py-1.5 [&_li]:text-[0.92rem]'

/** Checklist with brand-coloured check icons. */
export const plainList =
  'mb-2 [&_li]:flex [&_li]:items-start [&_li]:gap-2 [&_li]:py-1 [&_svg]:mt-1 [&_svg]:shrink-0 [&_svg]:text-brand'
