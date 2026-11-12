// Tailwind class strings shared by the Learning Hub lesson screens.

/** Long-form lesson text (articles and transcripts). */
export const articleBody =
  'rich text-[1.05rem] leading-[1.7] [&_h3]:mt-[1.4em] [&_h3]:mb-[0.4em] [&_h3]:text-[1.2rem] [&_ol]:pl-[1.3em] [&_ul]:pl-[1.3em]'

const activityBase = 'card flex flex-col gap-3.5 [&_p]:m-0'

/** Quiz and myth/fact activity card. */
export const activity = `${activityBase} items-start`

export const activityResult = `${activityBase} mx-auto items-center text-center`

export const scoreText = 'text-5xl leading-none font-extrabold text-brand'

export const feedback = (correct: boolean) =>
  `message-enter w-full rounded-lg px-4 py-3.5 ${correct ? 'bg-surface-2' : 'bg-surface-2'}`
