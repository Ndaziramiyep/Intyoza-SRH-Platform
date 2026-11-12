import type { ServiceNeed } from './types'

// Decides when a chat message is about getting care, so the chat can show places nearby.
// It only fires when the person asks where to go or wants to get a service, not on
// general questions ("what is PrEP?" gets an answer only; "where can I get PrEP?" also gets places).
// Runs on the device; nothing is sent anywhere.

// Asking for a place, in English, Kinyarwanda or French.
const PLACE = [
  /\b(where|near me|nearby|nearest|closest|around me|in my area)\b/i,
  /\b(hospital|clinic|health ?cent(er|re)|pharmac(y|ies)|dispensary|youth corner)\b/i,
  /\b(he|hehe|hafi|ivuriro|ibitaro|nderabuzima|farumasi|isange)\b/i,
  /\b(nabona|nakura|nagura|najya|nakwivuriza|nabisanga)\b/i,
  /(\bo[uù]\b|pr[eè]s de (moi|chez)|h[oô]pital|clinique|centre de sant[eé]|pharmacie)/i,
]

// Wanting to get or do something (not just learn about it).
const ACCESS = [
  /\b(get|getting|buy|find|access|start|go for|take) (a |an |some |my |the )?(tested|test|condoms?|pills?|implant|iud|injection|prep|pep|arvs?|contracepti\w*|check ?up|counsell?ing|help|treatment|pregnancy test)\b/i,
  /\b(want|need|would like) to (be tested|get tested|test|see a (doctor|nurse|counsell?or)|talk to a (doctor|nurse|counsell?or))\b/i,
  /\b(book|appointment)\b/i,
  /\b(kwipimisha|nipimishe|nkipimisha|kwivuza|nivuze|kubona|ngure|kugura|nshaka (gufata|kubona|kwipimisha|kuvugana))\b/i,
  /\b(me faire (d[eé]pister|tester|soigner)|obtenir|acheter|consulter)\b/i,
]

// What the person needs, most serious first.
const NEEDS: [ServiceNeed, RegExp][] = [
  ['gbv', /\b(rape[ds]?|abuse[ds]?|violence|assault\w*|isange|ku ngufu|ihohoterwa|nahohotewe|viol\w*|agression)\b/i],
  ['maternal', /\b(pregnan\w*|antenatal|prenatal|anc|inda|ntwite|utwite|atwite|kubyara|grossesse|enceinte|pr[eé]natal)\b/i],
  [
    'sti-hiv',
    /\b(hiv|aids|stis?|stds?|tested|testing|prep|pep|arvs?|sida|vih|ists?|virusi|indwara zandurira|kwipimisha|nipimishe|nkipimisha|d[eé]pist\w*|gonorr?h\w*|syphilis|chlamydia|herpes)\b/i,
  ],
  [
    'family-planning',
    /\b(condoms?|contracepti\w*|family planning|birth control|pills?|implant|iud|injection|depo|morning after|agakingirizo|udukingirizo|kuboneza urubyaro|ibinini|urushinge|akapira|pr[eé]servatifs?|pilule|planning familial)\b/i,
  ],
  ['counseling', /\b(counsell?\w*|therap\w*|psycholog\w*|mental health|umujyanama|ubujyanama|ihungabana|psy\w*)\b/i],
  ['consultation', /\b(doctor|nurse|check ?up|consult\w*|muganga|umuforomo|kwivuza|nivuze|m[eé]decin|infirmi\w*)\b/i],
]

const FACILITY_WORD = /\b(hospital|clinic|health ?cent(er|re)|ivuriro|ibitaro|nderabuzima|h[oô]pital|clinique|centre de sant[eé])\b/i

/** The service to show places for, or undefined when the message is not about getting care. */
export function placesNeed(text: string): ServiceNeed | undefined {
  const asksPlace = PLACE.some((p) => p.test(text))
  const wantsService = ACCESS.some((p) => p.test(text))
  if (!asksPlace && !wantsService) return undefined
  const need = NEEDS.find(([, p]) => p.test(text))?.[0]
  if (need) return need
  // "Where is the nearest health centre?" with no service named.
  return FACILITY_WORD.test(text) ? 'consultation' : undefined
}
