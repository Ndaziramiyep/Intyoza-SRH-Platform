import { Link } from 'react-router-dom'
import logoDark from '../assets/logo-dark.png'
import logo from '../assets/logo.png'
import { useLanguage } from '../i18n/context'

// Logo in the brand purple of each theme (#6C4AB6 light, #B39DDB dark).
const logoClass = 'h-10 w-auto sm:h-12'

export function Brand() {
  const { t } = useLanguage()
  return (
    <Link to="/" aria-label={t('brand.home')} className="inline-flex shrink-0 items-center">
      <img src={logo} width={305} height={127} alt="" className={`${logoClass} dark:hidden`} />
      <img src={logoDark} width={305} height={127} alt="" className={`${logoClass} hidden dark:block`} />
    </Link>
  )
}
