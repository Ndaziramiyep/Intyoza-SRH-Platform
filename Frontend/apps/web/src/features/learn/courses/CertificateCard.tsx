import { useState } from 'react'
import { fill } from '@intyoza/shared/i18n/translations'
import type { Certificate } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../../components/Icon'
import { useLanguage } from '../../../i18n/context'

// A course certificate. In the app it names the course; the picture the learner can save says only
// "Intyoza Health Learning", the date and the code, so a phone's photo gallery never shows what the
// course was about (most learners are under 18 and the subjects are sensitive).

const WIDTH = 1200
const HEIGHT = 800

function formatDate(iso: string, lang: string) {
  try {
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
  } catch {
    return new Date(iso).toDateString()
  }
}

export function CertificateCard({ certificate, courseTitle }: { certificate: Certificate; courseTitle: string }) {
  const { t, lang } = useLanguage()
  const [saving, setSaving] = useState(false)
  const date = formatDate(certificate.issuedAt, lang)

  const save = async () => {
    setSaving(true)
    try {
      const blob = await drawCertificate({
        name: t('complete.certName'),
        of: t('complete.certOf'),
        date: fill(t('complete.certDate'), { date }),
        code: fill(t('complete.certCode'), { code: certificate.code }),
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `intyoza-certificate-${certificate.code}.png`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="cert-title" className="flex flex-col gap-3">
      <h2 id="cert-title" className="m-0 text-[1.1rem]">
        {t('complete.certificate')}
      </h2>
      <div className="relative overflow-hidden rounded-[18px] border-2 border-brand/40 bg-surface p-8 text-center max-sm:p-6">
        <span className="absolute -top-16 -right-16 size-48 rounded-full border-[18px] border-brand opacity-[0.07]" aria-hidden="true" />
        <span className="absolute -bottom-20 -left-12 size-48 rounded-full border-[18px] border-brand opacity-[0.06]" aria-hidden="true" />
        <span className="relative mx-auto mb-3 grid size-14 place-items-center rounded-full bg-brand text-on-brand" aria-hidden="true">
          <Icon name="flag" size={24} />
        </span>
        <p className="relative m-0 text-[0.8rem] font-bold tracking-[0.08em] text-brand uppercase">{t('complete.certName')}</p>
        <p className="relative mt-1 mb-3 font-display text-[1.4rem] font-bold">{t('complete.certOf')}</p>
        <p className="relative m-0 text-[1.05rem] font-semibold">{courseTitle}</p>
        <p className="relative mt-3 mb-0 text-[0.88rem] text-muted">
          {fill(t('complete.certDate'), { date })} · {fill(t('complete.certCode'), { code: certificate.code })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" className="btn btn-outline btn-sm" onClick={save} disabled={saving} aria-busy={saving}>
          <Icon name="arrowRight" size={16} className="rotate-90" /> {t('complete.download')}
        </button>
        <p className="m-0 text-[0.85rem] text-muted">{t('complete.downloadNote')}</p>
      </div>
    </section>
  )
}

/** The saved picture: no course name, by design. */
async function drawCertificate(text: { name: string; of: string; date: string; code: string }): Promise<Blob> {
  await document.fonts?.ready
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')

  const brand = '#6c4ab6'
  const ink = '#263238'
  ctx.fillStyle = '#fafaf8'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Soft rings in the corners, as on the card in the app.
  ctx.strokeStyle = 'rgba(108, 74, 182, 0.08)'
  ctx.lineWidth = 48
  ctx.beginPath()
  ctx.arc(WIDTH - 40, 40, 200, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(60, HEIGHT - 20, 190, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = brand
  ctx.lineWidth = 6
  ctx.strokeRect(40, 40, WIDTH - 80, HEIGHT - 80)

  ctx.fillStyle = brand
  ctx.beginPath()
  ctx.arc(WIDTH / 2, 210, 54, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fafaf8'
  ctx.font = '600 56px "Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('✓', WIDTH / 2, 214)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = brand
  ctx.font = '700 30px "Inter Variable", Inter, system-ui, sans-serif'
  ctx.fillText(text.name.toUpperCase(), WIDTH / 2, 340)
  ctx.fillStyle = ink
  ctx.font = '800 64px "Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif'
  ctx.fillText(text.of, WIDTH / 2, 430)
  ctx.fillStyle = 'rgba(38, 50, 56, 0.72)'
  ctx.font = '500 30px "Inter Variable", Inter, system-ui, sans-serif'
  ctx.fillText(text.date, WIDTH / 2, 540)
  ctx.fillText(text.code, WIDTH / 2, 590)

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not draw the certificate'))), 'image/png'))
}
