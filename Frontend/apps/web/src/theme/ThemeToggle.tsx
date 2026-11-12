import { Icon } from '../components/Icon'
import { useLanguage } from '../i18n/context'
import { useTheme } from './context'

export function ThemeToggle({ className = 'icon-btn' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-label={dark ? t('theme.light') : t('theme.dark')}
      title={dark ? t('theme.light') : t('theme.dark')}
    >
      <Icon name={dark ? 'sun' : 'moon'} size={18} />
    </button>
  )
}
