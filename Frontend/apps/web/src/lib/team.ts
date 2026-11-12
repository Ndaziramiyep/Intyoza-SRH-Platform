export type TeamMember = {
  name: string
  role: string
  /** Image path, e.g. /team/justine.jpg for a file in public/team. Without one, large initials show. */
  photo?: string
  /** Full links (https://..., mailto:...). A missing one shows greyed out. */
  links?: { github?: string; linkedin?: string; email?: string }
}

/** The people building Intyoza, shown on the home page and in the footer. */
export const TEAM: TeamMember[] = [
  { name: 'Justine Neema', role: 'Backend & API' },
  { name: 'Patrick Ndaziramiye', role: 'AI model' },
  { name: 'Tuyishime Evode', role: 'AI service (ML)' },
  { name: 'Florence Uwineza', role: 'Frontend (web & mobile)', photo: '/team/florence.webp' },
]

export const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
