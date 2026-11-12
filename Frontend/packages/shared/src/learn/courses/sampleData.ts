import type { IconName } from '../../icons'
import type { Localized } from '../types'
import type { AgeGroup, CategoryTone, LessonType, QuizUse } from './types'

// Sample Learning Hub content: the starting categories and first courses of the plan, built from the
// 16 lessons already in the app (content.ts). Lessons that don't exist yet are outlines: a title,
// type and time, with a note that the lesson is being written. Used until the backend serves courses.
// Kinyarwanda and French titles should be checked by native speakers.

export type SampleCategory = {
  id: string
  icon: IconName
  tone: CategoryTone
  name: Localized
  description: Localized
}

/** A lesson in a sample course: either one of the app's existing lessons, or an outline. */
export type SampleLesson =
  | { from: string; use?: QuizUse }
  | { outline: LessonType; minutes: number; title: Localized; sizeMb?: number }

export type SampleCourse = {
  slug: string
  category: string
  ageGroups: AgeGroup[]
  certificate?: boolean
  title: Localized
  description: Localized
  whatYouLearn: Localized[]
  lessons: SampleLesson[]
}

/** Shown in place of a lesson that is still being written. */
export const OUTLINE_NOTE: Localized = {
  en: 'This lesson is being written and checked by a health worker. It will appear here once it is approved.',
  rw: 'Iri somo riri kwandikwa no gusuzumwa n’umukozi w’ubuzima. Rizagaragara hano nirimara kwemezwa.',
  fr: 'Cette leçon est en cours d’écriture et de vérification par un agent de santé. Elle apparaîtra ici une fois approuvée.',
}

export const SAMPLE_CATEGORIES: SampleCategory[] = [
  {
    id: 'puberty-periods',
    icon: 'clock',
    tone: 'coral',
    name: { en: 'Periods & puberty', rw: 'Imihango n’ubwangavu', fr: 'Règles et puberté' },
    description: { en: 'How your body changes, and how to look after it.' },
  },
  {
    id: 'contraception',
    icon: 'shield',
    tone: 'brand',
    name: { en: 'Contraception & choices', rw: 'Kuboneza urubyaro', fr: 'Contraception et choix' },
    description: { en: 'The methods, how they work, and how to choose.' },
  },
  {
    id: 'pregnancy',
    icon: 'heart',
    tone: 'amber',
    name: { en: 'Pregnancy & after birth', rw: 'Gutwita no kubyara', fr: 'Grossesse et post-partum' },
    description: { en: 'From how pregnancy happens to caring for a newborn.' },
  },
  {
    id: 'sti-hiv',
    icon: 'spark',
    tone: 'teal',
    name: { en: 'STIs & HIV', rw: 'Indwara zandurira mu mibonano & SIDA', fr: 'IST et VIH' },
    description: { en: 'How they spread, testing, treatment and prevention.' },
  },
  {
    id: 'consent-relationships',
    icon: 'users',
    tone: 'brand',
    name: { en: 'Consent & relationships', rw: 'Ubwumvikane n’imibanire', fr: 'Consentement et relations' },
    description: { en: 'Respect, saying yes or no, and healthy relationships.' },
  },
  {
    id: 'feelings',
    icon: 'sun',
    tone: 'teal',
    name: { en: 'Feelings & mental health', rw: 'Amarangamutima n’ubuzima bwo mu mutwe', fr: 'Émotions et santé mentale' },
    description: { en: 'Stress, sadness, and where to find support.' },
  },
  {
    id: 'safety',
    icon: 'phone',
    tone: 'coral',
    name: { en: 'Safety & getting help', rw: 'Umutekano no kubona ubufasha', fr: 'Sécurité et aide' },
    description: { en: 'Violence and abuse, and the free help numbers.' },
  },
]

const quiz = (title = 'Check what you learned'): SampleLesson => ({ outline: 'quiz', minutes: 3, title: { en: title } })
const article = (title: string, minutes = 4): SampleLesson => ({ outline: 'article', minutes, title: { en: title } })
const audio = (title: string, minutes: number, sizeMb: number): SampleLesson => ({ outline: 'audio', minutes, sizeMb, title: { en: title } })
const video = (title: string, minutes: number, sizeMb: number): SampleLesson => ({ outline: 'video', minutes, sizeMb, title: { en: title } })
const mythFact = (title: string): SampleLesson => ({ outline: 'myth_fact', minutes: 2, title: { en: title } })
const points = (...items: string[]): Localized[] => items.map((en) => ({ en }))

export const SAMPLE_COURSES: SampleCourse[] = [
  // ── Periods & puberty ──────────────────────────────────────────
  {
    slug: 'your-first-period',
    category: 'puberty-periods',
    ageGroups: ['10-14', '15-19'],
    certificate: true,
    title: { en: 'Your first period', rw: 'Imihango yawe ya mbere', fr: 'Tes premières règles' },
    description: { en: 'What a period is, what’s normal, and how to be ready for it.' },
    whatYouLearn: points(
      'How the monthly cycle works',
      'What a normal period looks like',
      'How to manage your period with confidence',
      'When to see a health worker',
    ),
    lessons: [
      { from: 'menstrual-cycle-explained' },
      article('Getting ready for your first period'),
      { from: 'periods-without-shame-audio' },
      { from: 'body-myth-fact' },
      { from: 'periods-puberty-quiz', use: 'both' },
    ],
  },
  {
    slug: 'puberty-changes-girls',
    category: 'puberty-periods',
    ageGroups: ['10-14'],
    title: {
      en: 'Body changes in puberty (girls)',
      rw: 'Impinduka z’umubiri mu bwangavu (abakobwa)',
      fr: 'Les changements de la puberté (filles)',
    },
    description: { en: 'The changes to expect, and why they are normal.' },
    whatYouLearn: points('Which changes come first', 'Why every body is different', 'How to look after your body'),
    lessons: [
      { from: 'puberty-changes' },
      article('Looking after your body'),
      audio('Talking to someone you trust', 4, 3.1),
      { from: 'periods-puberty-quiz', use: 'after' },
    ],
  },
  {
    slug: 'puberty-changes-boys',
    category: 'puberty-periods',
    ageGroups: ['10-14'],
    title: {
      en: 'Body changes in puberty (boys)',
      rw: 'Impinduka z’umubiri mu bugimbi (abahungu)',
      fr: 'Les changements de la puberté (garçons)',
    },
    description: { en: 'Voice, body hair, wet dreams: what happens and why.' },
    whatYouLearn: points('The changes of puberty for boys', 'Why wet dreams are normal', 'Who to ask when you’re unsure'),
    lessons: [
      { from: 'puberty-changes' },
      article('Wet dreams and erections are normal', 3),
      video('Questions boys ask', 3, 7.5),
      { from: 'body-myth-fact' },
    ],
  },

  // ── Contraception & choices ────────────────────────────────────
  {
    slug: 'what-family-planning-is',
    category: 'contraception',
    ageGroups: ['15-19', '20-24'],
    title: { en: 'What family planning is', rw: 'Kuboneza urubyaro ni iki?', fr: 'Qu’est-ce que la planification familiale ?' },
    description: { en: 'Why people plan, and your right to choose if and when.' },
    whatYouLearn: points('What family planning means', 'Your right to decide', 'Where young people get services'),
    lessons: [
      article('What family planning means'),
      article('Your right to choose', 3),
      audio('A nurse explains', 4, 3.4),
      { from: 'contraception-quiz', use: 'both' },
    ],
  },
  {
    slug: 'choosing-a-method',
    category: 'contraception',
    ageGroups: ['15-19', '20-24'],
    certificate: true,
    title: { en: 'Choosing a method', rw: 'Guhitamo uburyo bukunogeye', fr: 'Choisir une méthode' },
    description: { en: 'Compare the methods and find one that fits your life.' },
    whatYouLearn: points(
      'How each method works',
      'How well each one protects',
      'Which methods also protect from STIs',
      'What to ask at the health centre',
    ),
    lessons: [
      { from: 'choosing-contraception' },
      video('Your options at a glance', 3, 6.8),
      mythFact('Myths about methods'),
      audio('Talking to a nurse', 5, 4.2),
      { from: 'contraception-quiz', use: 'both' },
    ],
  },
  {
    slug: 'condoms-and-emergency-pill',
    category: 'contraception',
    ageGroups: ['15-19', '20-24'],
    title: {
      en: 'Condoms and emergency pill',
      rw: 'Agakingirizo n’ibinini byo kwirinda gusama byihutirwa',
      fr: 'Préservatifs et pilule du lendemain',
    },
    description: { en: 'Using a condom the right way, and what to do after unprotected sex.' },
    whatYouLearn: points('How to use a condom step by step', 'When the emergency pill works', 'Where to get both for free'),
    lessons: [
      { from: 'condom-how-to-video' },
      article('The emergency pill: when and how'),
      article('Where to get them for free', 3),
      { from: 'contraception-quiz', use: 'after' },
    ],
  },

  // ── Pregnancy & after birth ────────────────────────────────────
  {
    slug: 'how-pregnancy-happens',
    category: 'pregnancy',
    ageGroups: ['10-14', '15-19'],
    title: { en: 'How pregnancy happens', rw: 'Uko gusama bibaho', fr: 'Comment survient une grossesse' },
    description: { en: 'The facts about how pregnancy starts, and its first signs.' },
    whatYouLearn: points('How pregnancy starts', 'The early signs', 'Common myths, and the facts'),
    lessons: [article('From sex to pregnancy'), article('Signs of pregnancy', 3), mythFact('Pregnancy myths'), quiz()],
  },
  {
    slug: 'pregnant-what-next',
    category: 'pregnancy',
    ageGroups: ['15-19', '20-24'],
    title: { en: 'Pregnant: what next', rw: 'Natwite: nkore iki?', fr: 'Enceinte : et maintenant ?' },
    description: { en: 'Taking a test, your options, and the support you can get.' },
    whatYouLearn: points('How and when to take a test', 'Your options and your rights', 'Where to find support'),
    lessons: [article('Taking a pregnancy test'), article('Your options and your rights'), audio('Where to get support', 5, 4.0), quiz()],
  },
  {
    slug: 'caring-for-yourself-and-baby',
    category: 'pregnancy',
    ageGroups: ['15-19', '20-24'],
    certificate: true,
    title: { en: 'Caring for yourself and the baby', rw: 'Kwiyitaho no kwita ku mwana', fr: 'Prendre soin de toi et du bébé' },
    description: { en: 'A healthy pregnancy, and the first weeks after birth.' },
    whatYouLearn: points('Check-ups during pregnancy', 'Danger signs to act on', 'Looking after yourself after birth'),
    lessons: [{ from: 'healthy-pregnancy' }, { from: 'after-birth' }, video('Feeding your baby', 4, 8.2), quiz()],
  },

  // ── STIs & HIV ─────────────────────────────────────────────────
  {
    slug: 'how-stis-and-hiv-spread',
    category: 'sti-hiv',
    ageGroups: ['15-19', '20-24'],
    title: {
      en: 'How STIs and HIV spread',
      rw: 'Uko indwara zandurira mu mibonano na SIDA zandura',
      fr: 'Comment se transmettent les IST et le VIH',
    },
    description: { en: 'How infections pass from one person to another, and how to stop them.' },
    whatYouLearn: points('How STIs and HIV spread', 'How they don’t spread', 'The best ways to protect yourself'),
    lessons: [{ from: 'sti-guide' }, { from: 'hiv-today' }, mythFact('Myths about HIV'), { from: 'sti-hiv-quiz', use: 'both' }],
  },
  {
    slug: 'testing-and-treatment',
    category: 'sti-hiv',
    ageGroups: ['15-19', '20-24'],
    title: { en: 'Testing and treatment', rw: 'Kwipimisha no kwivuza', fr: 'Dépistage et traitement' },
    description: { en: 'What testing is like, and why treatment works.' },
    whatYouLearn: points('Where and how to get tested', 'What happens at the clinic', 'Why treatment works'),
    lessons: [
      article('Getting tested'),
      audio('What happens at the clinic', 4, 3.3),
      article('Treatment works', 3),
      { from: 'sti-hiv-quiz', use: 'after' },
    ],
  },
  {
    slug: 'prep-and-pep',
    category: 'sti-hiv',
    ageGroups: ['15-19', '20-24'],
    title: { en: 'PrEP and PEP', rw: 'PrEP na PEP', fr: 'PrEP et PEP' },
    description: { en: 'Medicines that prevent HIV before and after a risk.' },
    whatYouLearn: points('What PrEP is and who it’s for', 'Why PEP must start within 72 hours', 'Where to get them'),
    lessons: [
      article('PrEP: protection before'),
      article('PEP: within 72 hours'),
      video('Where to get PrEP and PEP', 3, 6.1),
      { from: 'sti-hiv-quiz', use: 'after' },
    ],
  },

  // ── Consent & relationships ────────────────────────────────────
  {
    slug: 'consent',
    category: 'consent-relationships',
    ageGroups: ['10-14', '15-19', '20-24'],
    certificate: true,
    title: { en: 'Consent', rw: 'Ubwumvikane', fr: 'Le consentement' },
    description: { en: 'What a real yes looks like, and that you can always say no.' },
    whatYouLearn: points('What consent means', 'How to ask and how to answer', 'What to do if it was not respected'),
    lessons: [
      { from: 'consent-healthy-relationships' },
      { from: 'relationships-myth-fact' },
      audio('Stories about consent', 4, 3.6),
      quiz(),
    ],
  },
  {
    slug: 'healthy-and-unhealthy-relationships',
    category: 'consent-relationships',
    ageGroups: ['15-19', '20-24'],
    title: {
      en: 'Healthy and unhealthy relationships',
      rw: 'Imibanire myiza n’imibanire mibi',
      fr: 'Relations saines et malsaines',
    },
    description: { en: 'Recognise respect, and the warning signs of control.' },
    whatYouLearn: points('Signs of a healthy relationship', 'Warning signs of control', 'Where to get advice'),
    lessons: [article('Signs of a healthy relationship'), article('Warning signs'), { from: 'relationships-myth-fact' }, quiz()],
  },
  {
    slug: 'saying-no-to-pressure',
    category: 'consent-relationships',
    ageGroups: ['10-14', '15-19'],
    title: { en: 'Saying no to pressure', rw: 'Kwanga igitutu', fr: 'Dire non à la pression' },
    description: { en: 'Ways to say no to friends, partners and others, and mean it.' },
    whatYouLearn: points('Where pressure comes from', 'Ways to say no', 'Who can back you up'),
    lessons: [article('Pressure from friends and partners', 3), audio('Ways to say no', 4, 3.2), mythFact('Myths about pressure'), quiz()],
  },

  // ── Feelings & mental health ───────────────────────────────────
  {
    slug: 'stress-and-sadness',
    category: 'feelings',
    ageGroups: ['10-14', '15-19', '20-24'],
    title: { en: 'Stress and sadness', rw: 'Umuhangayiko n’agahinda', fr: 'Stress et tristesse' },
    description: { en: 'Understanding hard feelings, and simple ways to cope.' },
    whatYouLearn: points('What stress does to the body', 'Simple ways to calm down', 'When to ask for help'),
    lessons: [article('What stress feels like'), audio('A calming exercise', 5, 4.4), article('When sadness stays', 3), quiz()],
  },
  {
    slug: 'getting-support',
    category: 'feelings',
    ageGroups: ['10-14', '15-19', '20-24'],
    title: { en: 'Getting support', rw: 'Kubona ubufasha', fr: 'Trouver du soutien' },
    description: { en: 'Who you can talk to, and how to start the conversation.' },
    whatYouLearn: points('People who can help', 'How to start talking', 'Free services near you'),
    lessons: [article('Who you can talk to', 3), audio('Starting the conversation', 4, 3.0), { from: 'where-to-get-help-audio' }, quiz()],
  },

  // ── Safety & getting help ──────────────────────────────────────
  {
    slug: 'violence-and-abuse',
    category: 'safety',
    ageGroups: ['15-19', '20-24'],
    title: { en: 'Violence and abuse', rw: 'Ihohoterwa', fr: 'Violence et abus' },
    description: { en: 'Recognise abuse, know it’s never your fault, and find help.' },
    whatYouLearn: points('The forms abuse can take', 'That it is never your fault', 'How to get help safely'),
    lessons: [article('What abuse can look like'), article('It is never your fault', 3), { from: 'where-to-get-help-audio' }, quiz()],
  },
  {
    slug: 'help-numbers-and-isange',
    category: 'safety',
    ageGroups: ['10-14', '15-19', '20-24'],
    title: { en: 'Help numbers and Isange', rw: 'Imirongo y’ubufasha na Isange', fr: 'Numéros d’aide et Isange' },
    description: { en: 'The free numbers to call, and what Isange One Stop Centres do.' },
    whatYouLearn: points('The free help numbers', 'What Isange One Stop Centres offer', 'What happens when you visit'),
    lessons: [article('Free help numbers', 3), article('What Isange One Stop Centres do'), video('Visiting Isange', 3, 6.4), quiz()],
  },
]

/** The course offered to a new learner, by age group. */
export const STARTER_COURSES: Record<AgeGroup, string> = {
  '10-14': 'your-first-period',
  '15-19': 'choosing-a-method',
  '20-24': 'how-stis-and-hiv-spread',
}
