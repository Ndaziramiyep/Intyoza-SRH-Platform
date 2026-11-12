// Parses plain text content: blank lines split paragraphs, lines that
// start with "•" or "1." become lists, and "## " lines become subheadings.
// Keeps content files free of HTML; each app renders the blocks its own way.

export type RichBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }

export function parseRichText(text: string): RichBlock[] {
  const blocks: RichBlock[] = []
  for (const chunk of text.split(/\n\s*\n/)) {
    let list: Extract<RichBlock, { type: 'list' }> | null = null
    const flush = () => {
      if (list) blocks.push(list)
      list = null
    }
    for (const line of chunk.split('\n')) {
      const bullet = line.match(/^\s*•\s+(.*)/)
      const numbered = line.match(/^\s*\d+\.\s+(.*)/)
      if (bullet || numbered) {
        const ordered = Boolean(numbered)
        if (list && list.ordered !== ordered) flush()
        list ??= { type: 'list', ordered, items: [] }
        list.items.push((bullet ?? numbered)![1])
      } else {
        flush()
        if (line.startsWith('## ')) blocks.push({ type: 'heading', text: line.slice(3) })
        else if (line.trim()) blocks.push({ type: 'paragraph', text: line })
      }
    }
    flush()
  }
  return blocks
}
