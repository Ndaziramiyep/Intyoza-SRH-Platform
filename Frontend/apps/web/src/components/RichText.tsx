import { parseRichText } from '@intyoza/shared/richText'

// Renders plain text content (paragraphs, "•"/"1." lists and "## " subheadings).
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseRichText(text).map((block, i) => {
        if (block.type === 'heading') return <h3 key={i}>{block.text}</h3>
        if (block.type === 'paragraph') return <p key={i}>{block.text}</p>
        const items = block.items.map((item, j) => <li key={j}>{item}</li>)
        return block.ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>
      })}
    </>
  )
}
