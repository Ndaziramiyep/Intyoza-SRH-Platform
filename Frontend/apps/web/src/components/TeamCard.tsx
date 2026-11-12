import { initials, type TeamMember } from '../lib/team'
import { Icon, type IconName } from './Icon'

const SOCIALS: { key: keyof NonNullable<TeamMember['links']>; icon: IconName; label: string }[] = [
  { key: 'github', icon: 'github', label: 'GitHub' },
  { key: 'linkedin', icon: 'linkedin', label: 'LinkedIn' },
  { key: 'email', icon: 'mail', label: 'Email' },
]

const socialClass = 'grid size-9 place-items-center rounded-full border border-line text-muted'

export function TeamCard({ member }: { member: TeamMember }) {
  return (
    <li className="team-card flex flex-col rounded-[14px] border border-line bg-surface p-2.5 text-center">
      <div className="aspect-square overflow-hidden rounded-[10px] bg-brand-soft max-[480px]:aspect-[4/3]">
        {member.photo ? (
          <img
            src={member.photo}
            alt={member.name}
            width={400}
            height={400}
            loading="lazy"
            className="team-photo size-full object-cover object-top"
          />
        ) : (
          <span className="team-photo grid size-full place-items-center font-display text-[clamp(3rem,6vw,4.5rem)] font-bold text-brand" aria-hidden="true">
            {initials(member.name)}
          </span>
        )}
      </div>
      <h3 className="mt-4 mb-0.5 text-[1.05rem]">{member.name}</h3>
      <p className="m-0 text-[0.85rem] text-muted">{member.role}</p>
      <div className="mt-auto flex justify-center gap-2 pt-4 pb-2">
        {SOCIALS.map(({ key, icon, label }) => {
          const href = member.links?.[key]
          return href ? (
            <a key={key} href={href} target="_blank" rel="noreferrer" aria-label={`${member.name}: ${label}`} className={`team-social ${socialClass}`}>
              <Icon name={icon} size={16} />
            </a>
          ) : (
            // Greyed out until team.ts has this person's link.
            <span key={key} className={`${socialClass} opacity-40`} aria-hidden="true">
              <Icon name={icon} size={16} />
            </span>
          )
        })}
      </div>
    </li>
  )
}
