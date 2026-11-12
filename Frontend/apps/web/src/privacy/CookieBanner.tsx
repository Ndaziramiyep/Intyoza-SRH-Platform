import { Icon } from '../components/Icon'
import { useLanguage } from '../i18n/context'
import { ACCEPT_ALL, ESSENTIAL_ONLY } from '../lib/privacy/consent'
import { usePrivacy } from './context'

export function CookieBanner() {
  const { t } = useLanguage()
  const { saveChoice, openSettings } = usePrivacy()

  return (
    <section
      aria-labelledby="cookie-title"
      className="fixed bottom-4 left-4 z-80 max-[700px]:bottom-[76px] w-[min(calc(100%-32px),420px)] rounded-[22px] border border-line bg-surface px-[18px] pt-[18px] pb-3.5"
    >
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Icon name="cookie" size={20} />
        </span>
        <div>
          <h2 id="cookie-title" className="mb-0.5 text-[1.05rem]">
            {t('privacy.bannerTitle')}
          </h2>
          <p className="m-0 text-muted">{t('privacy.bannerText')}</p>
        </div>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-primary" onClick={() => saveChoice(ACCEPT_ALL)}>
          {t('privacy.acceptRemember')}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => saveChoice(ESSENTIAL_ONLY)}>
          {t('privacy.essentialOnly')}
        </button>
      </div>
      <button type="button" className="link-inline mx-auto mt-2.5 block text-[0.9rem] font-semibold" onClick={openSettings}>
        {t('privacy.choose')}
      </button>
    </section>
  )
}
