import type { Escalation } from './types'

// Red-flag detection. This runs locally on every message, whether the answer
// comes from the chat service or the offline guide, so urgent situations are
// never missed because of a network problem or a model that did not recognise them.
// The Kinyarwanda and French wording needs review by native speakers and clinical advisors.

type Rule = { patterns: RegExp[]; escalation: Escalation }

const GBV_CONTACTS = [
  { label: 'Isange One Stop Centre (GBV, free)', number: '3512' },
  { label: 'Police emergency', number: '112' },
  { label: 'Child helpline', number: '116' },
]

const RULES: Rule[] = [
  {
    patterns: [
      /\b(kill myself|suicid\w*|end my life|want to die|self[- ]harm|hurt myself)\b/i,
      /\b(do not|don'?t) want to (live|be alive)\b/i,
      /\b(kwiyahura|niyahura|ndiyahura|kwiyica|ndashaka gupfa|sinshaka kubaho|kwiyambura ubuzima)\b/i,
      /\b(me suicider|me tuer|envie de mourir|en finir avec la vie)\b/i,
    ],
    escalation: {
      level: 'urgent',
      reason: 'You mentioned thoughts of hurting yourself.',
      advice:
        'You matter, and you don’t have to go through this alone. Please talk to someone right now, a trusted adult, a friend, or a health worker. If you are in immediate danger, call 112.',
      need: 'counseling',
      contacts: [
        { label: 'Emergency', number: '112' },
        { label: 'Free health hotline (RBC)', number: '114' },
      ],
    },
  },
  {
    patterns: [
      /\b(rape[ds]?|raping|forced (me|her|him)|was forced|made me have sex|sexual(ly)? (abuse|assault)\w*|molest\w*|defile\w*)\b/i,
      /\b(without my consent|didn'?t consent|did not consent|abus(e|ed|ing) me|hits? me|beats? me)\b/i,
      /\bku ngufu\b/i,
      /\b(arankubita|barankubita|ankubita|bankubita|kunkubita)\b/i,
      /\bviol\b|\bviol[eé]e?(?![a-z])|\bme bat\b|agress\w* sexuel\w*/i,
    ],
    escalation: {
      level: 'urgent',
      reason: 'What you described may be sexual or physical violence.',
      advice:
        'What happened is not your fault. Getting care within 72 hours matters: a health facility can give medicine to prevent HIV (PEP) and pregnancy (emergency contraception), and treat injuries. Isange One Stop Centres give free medical, psychological and legal support.',
      need: 'gbv',
      contacts: GBV_CONTACTS,
    },
  },
  {
    patterns: [
      /\b(sex|slept together)\b.{0,30}\b(without (a |any )?(condom|protection)|no condom|unprotected)\b/i,
      /\b(unprotected sex|condom (broke|burst|slipped))\b/i,
    ],
    escalation: {
      level: 'urgent',
      reason: 'Two treatments work best when started soon.',
      advice: 'Try to visit a health centre today.',
      need: 'sti-hiv',
      steps: [
        {
          title: 'Emergency contraception',
          text: 'Can prevent pregnancy. Works best as soon as possible, within 3 days, some types up to 5.',
        },
        { title: 'PEP to prevent HIV', text: 'Needs to start within 72 hours of a possible exposure.' },
      ],
      note: 'Often free or low-cost at public health centres.',
      services: ['family-planning', 'prep-pep', 'hiv-testing'],
      referralNote: 'I need emergency contraception and advice about PEP.',
      reply:
        'Thank you for telling me, asking quickly was the right thing. Two treatments work best when started soon, so try to visit a health centre today.',
      followUps: ['What will happen at the clinic?', 'Do I need a parent with me?', 'I feel unsafe with my partner'],
    },
  },
  {
    patterns: [/\b(pep|post[- ]exposure)\b/i, /\b(condom (broke|burst|slipped)|exposed to hiv|hiv exposure)\b/i],
    escalation: {
      level: 'urgent',
      reason: 'You may need PEP to prevent HIV.',
      advice:
        'PEP works best when started as soon as possible and must be started within 72 hours of possible exposure. Go to the nearest health center today. If pregnancy is also a concern, ask about emergency contraception.',
      need: 'sti-hiv',
    },
  },
  {
    patterns: [
      /\b(heavy bleeding|bleeding (a lot|heavily|too much)|soak(ing|ed)? (a|my|through) pad|won'?t stop bleeding)\b/i,
      /\b(pregnan\w*).{0,40}\b(bleed\w*|severe pain|fever|blurr\w* vision|severe headache|water broke|baby (stopped|not) moving)\b/i,
      /\b(bleed\w*|severe pain|cramp\w*).{0,40}\b(pregnan\w*)\b/i,
      /\b(faint\w*|pass(ed)? out|unconscious)\b/i,
      /\b(unsafe abortion|took pills to abort|tried to abort)\b/i,
      /\b(took|taken|swallowed) (too many|a lot of|lots of) (pills|tablets|medicine)\b|\boverdose\w*/i,
      /\b(ibinini byinshi|amaraso menshi|ndava amaraso)\b/i,
      /\bje saigne\b|\b(trop de|beaucoup de) (comprim[eé]s|m[eé]dicaments)\b/i,
    ],
    escalation: {
      level: 'urgent',
      reason: 'These can be signs of a medical emergency.',
      advice:
        'Please go to the nearest health center or hospital now, or call 912 for an ambulance. Heavy bleeding, severe pain, fever or fainting, especially during pregnancy or after an abortion, need care from a health worker straight away.',
      need: 'maternal',
      contacts: [{ label: 'Ambulance (SAMU)', number: '912' }],
    },
  },
  {
    patterns: [
      /\b(severe|really bad|unbearable|very strong) (pain|cramps?)\b/i,
      /\b(discharge|sores?|blisters?|warts?|itch\w*|burn\w* when (i )?(pee|urinat\w*))\b/i,
      /\b(lump|swelling) (in|on) (my )?(breast|testicle|vagina|penis)\b/i,
      /\b(no period|haven'?t had (a|my) period|missed (my )?period)\b.{0,40}\b(months?|[3-9] months)\b/i,
      /\bpositive (pregnancy )?test\b/i,
    ],
    escalation: {
      level: 'soon',
      reason: 'This is something a health worker should check.',
      advice:
        'Information can help, but a health worker can examine you, run tests if needed and give the right treatment. Most of these problems are very treatable, it is best not to wait or self-medicate.',
      need: 'consultation',
    },
  },
]

// What must always bring up the emergency card: self-harm, violence and medical emergencies.
const CRISIS_NEEDS = ['counseling', 'gbv', 'maternal']

/** A crisis in the message, to catch what the trained model did not flag. */
export function detectCrisis(text: string): Escalation | undefined {
  return RULES.find((rule) => CRISIS_NEEDS.includes(rule.escalation.need) && rule.patterns.some((p) => p.test(text)))?.escalation
}

export function detectEscalation(text: string): Escalation | undefined {
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.escalation
  }
  return undefined
}
