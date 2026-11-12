import { useState } from 'react'
import { AGE_OPTIONS, GENDER_OPTIONS, PROVINCES } from '@intyoza/shared/chat/about'
import type { AboutYou, UserProfile } from '@intyoza/shared/chat/types'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'

const label = 'mt-3 mb-1.5 text-[0.85rem] font-semibold'
const chip = 'chip min-h-8 px-3 py-1 text-[0.85rem]'

type Props = {
  profile: UserProfile
  onSave: (about: AboutYou) => void
  /** Shown when the form is offered once; left out where it can be changed any time. */
  onSkip?: () => void
  /** Text of the save button (defaults to "Save"). */
  submitLabel?: string
}

/** Optional age, sex and province. Nothing here is required, and it never stands in the way of asking something. */
export function AboutYouForm({ profile, onSave, onSkip, submitLabel }: Props) {
  const { t } = useLanguage()
  const [ageBand, setAgeBand] = useState(profile.ageBand)
  const [gender, setGender] = useState(profile.gender ?? 'PREFER_NOT_TO_SAY')
  const [province, setProvince] = useState(profile.province ?? '')
  const [saved, setSaved] = useState(false)

  return (
    <form
      className="text-left"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ ageBand, gender, province: province || undefined })
        setSaved(true)
      }}
    >
      <h3 className={label}>{t('ask.ageRange')}</h3>
      <div className="chip-row">
        {AGE_OPTIONS.map((o) => (
          <button key={o.value} type="button" className={chip} aria-pressed={ageBand === o.value} onClick={() => setAgeBand(o.value)}>
            {o.label ?? t('ask.ratherNotSay')}
          </button>
        ))}
      </div>

      <h3 className={label}>{t('profile.gender')}</h3>
      <div className="chip-row">
        {GENDER_OPTIONS.map((o) => (
          <button key={o.value} type="button" className={chip} aria-pressed={gender === o.value} onClick={() => setGender(o.value)}>
            {t(o.label)}
          </button>
        ))}
      </div>

      <label className={`${label} block`} htmlFor="about-province">
        {t('profile.province')}
      </label>
      <select id="about-province" className="select" value={province} onChange={(e) => setProvince(e.target.value)}>
        <option value="">{t('ask.ratherNotSay')}</option>
        {PROVINCES.map((p) => (
          <option key={p.value} value={p.value}>
            {t(p.label)}
          </option>
        ))}
      </select>

      <p className="mt-3 mb-0 flex items-start gap-1.5 text-[0.8rem] text-muted">
        <Icon name="lock" size={14} className="mt-0.5 shrink-0" /> {t('profile.note')}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-sm btn-primary">
          {submitLabel ?? t('profile.save')}
        </button>
        {onSkip && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={onSkip}>
            {t('profile.skip')}
          </button>
        )}
        {saved && !onSkip && (
          <span role="status" className="inline-flex items-center gap-1 text-[0.85rem] font-semibold text-brand">
            <Icon name="check" size={14} /> {t('profile.saved')}
          </span>
        )}
      </div>
    </form>
  )
}
