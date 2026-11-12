import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import friends from '../assets/about-friends.webp'
import jumping from '../assets/about-jumping.webp'
import { useLanguage } from '../i18n/context'
import { usePrivacy } from '../privacy/context'

export function AboutPage() {
  const { t } = useLanguage()
  const { openSettings } = usePrivacy()
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  return (
    <div className="container">
      <header className="page-head grid grid-cols-[1.1fr_0.9fr] items-center gap-10 max-[900px]:grid-cols-1 max-[900px]:gap-6">
        <div>
          <h1>{t('about.title')}</h1>
          <p className="m-0">{t('about.text')}</p>
        </div>
        <img src={friends} width={640} height={582} alt="" className="message-enter mx-auto h-auto w-full max-w-[460px]" />
      </header>

      <div className="space-y-4">
        <section className="reveal grid grid-cols-[1.1fr_0.9fr] items-center gap-10 max-[900px]:grid-cols-1 max-[900px]:gap-6" aria-labelledby="privacy">
          <div className="card">
            <h2 id="privacy">{t('footer.privacy')}</h2>
            <p>{t('about.privacy')}</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={openSettings}>
              {t('home.manageCookies')}
            </button>
          </div>
          <img src={jumping} width={640} height={469} alt="" loading="lazy" className="mx-auto h-auto w-full max-w-[460px]" />
        </section>

        <section className="reveal card" aria-labelledby="terms">
          <h2 id="terms">{t('footer.terms')}</h2>
          <p>{t('about.terms1')}</p>
          <p>{t('about.terms2')}</p>
          <p>{t('about.terms3')}</p>
        </section>
      </div>
    </div>
  )
}
