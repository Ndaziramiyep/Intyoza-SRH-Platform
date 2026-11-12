// Draws a fact as a square image to share on WhatsApp or social media.
// Only the myth and the fact are on it: nothing about the person who shares it.

type Card = { stamp: string; claim: string; headline: string; footer: string }

const SIZE = 1080
const PAD = 96

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function drawFactCard({ stamp, claim, headline, footer }: Card): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const font = getComputedStyle(document.body).fontFamily || 'sans-serif'
  await document.fonts?.ready

  ctx.fillStyle = '#6c4ab6'
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.beginPath()
  ctx.arc(SIZE - 120, 140, 260, 0, Math.PI * 2)
  ctx.fill()

  // Stamp, tilted like on the page.
  ctx.save()
  ctx.translate(PAD, PAD + 40)
  ctx.rotate(-0.05)
  ctx.font = `800 44px ${font}`
  const stampWidth = ctx.measureText(stamp).width + 48
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 6
  ctx.strokeRect(0, -46, stampWidth, 72)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(stamp, 24, 8)
  ctx.restore()

  let y = PAD + 170
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = `600 40px ${font}`
  for (const l of wrap(ctx, `“${claim}”`, SIZE - PAD * 2).slice(0, 3)) {
    ctx.fillText(l, PAD, y)
    y += 54
  }

  y += 50
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 64px ${font}`
  for (const l of wrap(ctx, headline, SIZE - PAD * 2).slice(0, 6)) {
    ctx.fillText(l, PAD, y)
    y += 80
  }

  ctx.font = `700 36px ${font}`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(footer, PAD, SIZE - PAD)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/** Opens the phone's share sheet with the image, or saves it where sharing files is not possible. */
export async function shareFactCard(card: Card): Promise<'shared' | 'saved' | 'failed'> {
  const blob = await drawFactCard(card)
  if (!blob) return 'failed'
  const file = new File([blob], 'intyoza-fact.png', { type: 'image/png' })
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: card.headline })
      return 'shared'
    }
  } catch {
    return 'failed'
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'intyoza-fact.png'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'saved'
}
