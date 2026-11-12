import expectingParents from '../../assets/community/expecting-parents.webp'
import gbvSurvivors from '../../assets/community/gbv-survivors.webp'
import menstrualReproductive from '../../assets/community/menstrual-reproductive.webp'
import parentingChildcare from '../../assets/community/parenting-childcare.webp'
import relationshipsWellbeing from '../../assets/community/relationships-wellbeing.webp'
import youngMothersFathers from '../../assets/community/young-mothers-fathers.webp'
import { Icon } from '../../components/Icon'
import type { Community } from '@intyoza/shared/community/types'

// Pictures by group id, 640x400. A group without one shows its icon until a picture is added.
const IMAGES: Record<string, string> = {
  'expecting-parents': expectingParents,
  'gbv-survivors': gbvSurvivors,
  'menstrual-reproductive': menstrualReproductive,
  'parenting-childcare': parentingChildcare,
  'relationships-wellbeing': relationshipsWellbeing,
  'young-mothers-fathers': youngMothersFathers,
}

// Pictures whose license requires a visible credit.
const CREDITS: Record<string, { text: string; source: string; license: string; licenseUrl: string }> = {
  'menstrual-reproductive': {
    text: 'meghan, Wikimedia Commons (cropped)',
    source: 'https://commons.wikimedia.org/wiki/File:Sanitary_napkin.JPG',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
}

/** The credit under a group's picture, when its license requires one. */
export function CommunityImageCredit({ community }: { community: Community }) {
  const credit = CREDITS[community.id]
  if (!credit) return null
  return (
    <p className="m-0 mt-1 text-[0.72rem] text-muted">
      <a href={credit.source} target="_blank" rel="noreferrer">
        {credit.text}
      </a>
      {' · '}
      <a href={credit.licenseUrl} target="_blank" rel="noreferrer" className="whitespace-nowrap">
        {credit.license}
      </a>
    </p>
  )
}

/** The red ribbon, drawn here: the universal symbol of HIV awareness, on a soft background in either theme. */
function RedRibbon() {
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className="community-image block size-full bg-brand-soft" aria-hidden="true">
      <g fill="none" strokeWidth="11">
        <path d="M80 15C66 15 62 29 69 40L105 90" stroke="#9f1320" />
        <path d="M80 15C94 15 98 29 91 40L55 90" stroke="#d3202f" />
      </g>
    </svg>
  )
}

/** A group's picture, filling its frame. Decoration only: the group's name is always next to it. */
export function CommunityImage({ community }: { community: Community }) {
  if (community.id === 'living-with-hiv') return <RedRibbon />
  const src = community.imageUrl ?? IMAGES[community.id]
  return src ? (
    <img src={src} width={640} height={400} alt="" loading="lazy" className="community-image size-full object-cover" />
  ) : (
    <span className="community-image grid size-full place-items-center bg-brand-soft text-brand">
      <Icon name={community.icon} size={56} className="max-h-[60%] max-w-[60%]" />
    </span>
  )
}
