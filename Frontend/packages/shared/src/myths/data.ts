import type { TopicId } from '../chat/types'

export type Verdict = 'myth' | 'fact' | 'partly'

export type Myth = {
  id: string
  claim: string
  verdict: Verdict
  /** Myths from the backend have no topic. */
  topic?: TopicId
  /** Extra words people might use when asking about this belief. */
  keywords: string[]
  /** What the evidence says. */
  truth: string
  /** Why the misconception exists. */
  whyBelieved: string
  /** When to talk to a health worker. */
  seekCare: string
  /** Related Learning Hub lesson. */
  learnId?: string
  /** Where the fact comes from (myths from the backend). */
  sources?: string[]
}

// Common SRH beliefs. Content is general health education and should be
// reviewed by clinical advisors before launch.
export const MYTHS: Myth[] = [
  {
    id: 'first-time-pregnancy',
    claim: 'You can’t get pregnant the first time you have sex.',
    verdict: 'myth',
    topic: 'pregnancy',
    keywords: ['first time', 'virgin', 'pregnant', 'first sex'],
    truth:
      'Pregnancy can happen any time sperm meets an egg, including the very first time. There is nothing about a first experience that protects against pregnancy.',
    whyBelieved:
      'People often assume the body needs to “get used to” sex, or hear stories from friends who didn’t get pregnant. Those cases were luck, not protection.',
    seekCare:
      'If you had unprotected sex, emergency contraception works best as soon as possible (within 72 hours). Take a pregnancy test if your period is late.',
    learnId: 'choosing-contraception',
  },
  {
    id: 'period-sex-pregnancy',
    claim: 'You can’t get pregnant if you have sex during your period.',
    verdict: 'myth',
    topic: 'pregnancy',
    keywords: ['period', 'menstruation', 'during period', 'pregnant', 'bleeding'],
    truth:
      'It is less likely, but possible. Sperm can survive in the body for up to 5 days, and people with short or irregular cycles can ovulate soon after their period ends.',
    whyBelieved:
      'Pregnancy is less common during a period, so people treat “less likely” as “impossible”. Bleeding between periods can also be mistaken for a period.',
    seekCare: 'If you don’t want to get pregnant, use contraception every time. A health worker can help you choose a method.',
    learnId: 'menstrual-cycle-explained',
  },
  {
    id: 'contraception-infertility',
    claim: 'Contraceptives make you infertile.',
    verdict: 'myth',
    topic: 'contraception',
    keywords: ['family planning', 'infertile', 'infertility', 'barren', 'cannot have children', 'pills', 'injection', 'implant'],
    truth:
      'Modern contraceptives do not cause infertility. Fertility returns after stopping, quickly for pills, implants and IUDs, and within a few months (sometimes up to about a year) after the injection.',
    whyBelieved:
      'The delay after stopping the injection, and the fact that some people have fertility problems for unrelated reasons, lead people to blame contraception.',
    seekCare:
      'If you’ve stopped contraception and haven’t become pregnant after a year of trying, a health worker can check for other causes.',
    learnId: 'choosing-contraception',
  },
  {
    id: 'injection-weight',
    claim: 'The contraceptive injection makes you gain weight.',
    verdict: 'partly',
    topic: 'contraception',
    keywords: ['injection', 'depo', 'weight', 'fat', 'gain weight'],
    truth:
      'Some people do gain a few kilograms on the 3-monthly injection, but many don’t. Other methods such as the implant, IUD or condoms are not linked to significant weight gain.',
    whyBelieved: 'Weight gain is a real side effect for some injection users, so it gets generalised to all methods and all people.',
    seekCare: 'If side effects bother you, talk to a health worker about switching, don’t just stop without another method.',
    learnId: 'choosing-contraception',
  },
  {
    id: 'withdrawal-reliable',
    claim: 'Pulling out before ejaculation is a reliable way to avoid pregnancy.',
    verdict: 'myth',
    topic: 'contraception',
    keywords: ['pull out', 'pulling out', 'withdrawal', 'come outside', 'ejaculate outside'],
    truth:
      'Withdrawal often fails: about 1 in 5 couples who rely on it get pregnant within a year. Pre-ejaculate fluid can contain sperm, and timing is hard. It also gives no protection against STIs or HIV.',
    whyBelieved: 'It is free, needs no clinic visit, and sometimes “works” by chance, so it feels safer than it is.',
    seekCare: 'Ask a health worker about free condoms and other reliable methods.',
    learnId: 'choosing-contraception',
  },
  {
    id: 'ec-abortion',
    claim: 'Emergency contraception causes an abortion.',
    verdict: 'myth',
    topic: 'contraception',
    keywords: ['emergency', 'morning after', 'postinor', 'abortion', 'plan b'],
    truth:
      'Emergency contraception pills work mainly by delaying ovulation, so a pregnancy doesn’t start. They do not end an existing pregnancy and do not harm one.',
    whyBelieved: 'Because they are taken after sex, people assume they must work like an abortion pill. They are different medicines.',
    seekCare: 'Take EC as soon as possible after unprotected sex. If your period is more than a week late afterwards, take a pregnancy test.',
  },
  {
    id: 'washing-after-sex',
    claim: 'Washing or peeing after sex prevents pregnancy and STIs.',
    verdict: 'myth',
    topic: 'contraception',
    keywords: ['wash', 'washing', 'pee', 'urinate', 'after sex', 'douche', 'clean'],
    truth:
      'Sperm reach the uterus within minutes, so washing or peeing can’t stop pregnancy. Neither prevents STIs or HIV. Washing inside the vagina can actually increase infections.',
    whyBelieved: 'It feels logical that “cleaning” would remove sperm or germs, but that is not how the body works.',
    seekCare:
      'After unprotected sex, consider emergency contraception and, if HIV exposure is possible, PEP within 72 hours.',
  },
  {
    id: 'see-hiv',
    claim: 'You can tell if someone has HIV or an STI by looking at them.',
    verdict: 'myth',
    topic: 'sti',
    keywords: ['look', 'looks healthy', 'tell', 'see', 'hiv', 'sti', 'clean'],
    truth:
      'Most people with HIV or an STI look and feel completely healthy, sometimes for years. The only way to know is to test.',
    whyBelieved: 'Old images of very sick people with AIDS still shape how people imagine HIV, before treatment was widely available.',
    seekCare: 'Get tested, it is free and confidential at public health centers. Test together with a new partner.',
    learnId: 'hiv-today',
  },
  {
    id: 'hiv-casual-contact',
    claim: 'HIV can be passed on by mosquitoes, hugging or sharing food.',
    verdict: 'myth',
    topic: 'sti',
    keywords: ['mosquito', 'hug', 'kiss', 'share food', 'cup', 'toilet', 'touch', 'hiv'],
    truth:
      'HIV is passed through certain body fluids, mainly through unprotected sex, sharing needles, and from parent to baby. It is not passed through mosquitoes, hugs, kissing, sharing food, cups or toilets.',
    whyBelieved: 'Fear and stigma, and confusion with diseases like malaria that mosquitoes do spread.',
    seekCare: 'If you’re worried about a real exposure (like unprotected sex), get tested, and ask about PEP within 72 hours.',
    learnId: 'hiv-today',
  },
  {
    id: 'hiv-negative-babies',
    claim: 'People living with HIV can’t have HIV-negative babies.',
    verdict: 'myth',
    topic: 'sti',
    keywords: ['hiv', 'baby', 'babies', 'children', 'pregnant', 'mother to child'],
    truth:
      'With ARV treatment during pregnancy and breastfeeding, and testing and care for the baby, the chance of passing HIV to a baby is very low. Many parents living with HIV have HIV-negative children.',
    whyBelieved: 'Before treatment was available, transmission to babies was much more common.',
    seekCare: 'If you’re living with HIV and pregnant or planning a pregnancy, start antenatal care early and keep taking your ARVs.',
    learnId: 'hiv-today',
  },
  {
    id: 'herbs-cure-hiv',
    claim: 'Herbal remedies or prayer can cure HIV.',
    verdict: 'myth',
    topic: 'sti',
    keywords: ['herbs', 'herbal', 'traditional', 'cure', 'prayer', 'healer', 'hiv'],
    truth:
      'There is no cure for HIV yet. ARV treatment controls the virus very well and lets people live long, healthy lives. Stopping ARVs for other remedies lets the virus come back and can cause drug resistance.',
    whyBelieved: 'People on ARVs feel well and may think they are cured; some sellers make false promises.',
    seekCare: 'Keep taking ARVs every day. Talk to your HIV clinic before using any other remedy.',
    learnId: 'hiv-today',
  },
  {
    id: 'condoms-holes',
    claim: 'Condoms have tiny holes that let HIV through.',
    verdict: 'myth',
    topic: 'sti',
    keywords: ['condom', 'holes', 'hiv', 'pass through', 'safe'],
    truth:
      'Quality-tested condoms do not have holes that let HIV or sperm through. Used correctly every time, they are highly effective against HIV, many STIs and pregnancy.',
    whyBelieved: 'Condoms sometimes fail because of breakage or incorrect use, which gets misremembered as “holes”.',
    seekCare: 'If a condom breaks, ask about emergency contraception and PEP as soon as possible (within 72 hours).',
    learnId: 'condom-how-to-video',
  },
  {
    id: 'two-condoms',
    claim: 'Using two condoms at once is extra safe.',
    verdict: 'myth',
    topic: 'contraception',
    keywords: ['two condoms', 'double condom', 'double'],
    truth: 'Two condoms rub against each other and are more likely to tear. One condom, used correctly, is the safest choice.',
    whyBelieved: 'It seems logical that two layers would protect more.',
    seekCare: 'Ask a health worker or watch our condom how-to to learn the correct steps.',
    learnId: 'condom-how-to-video',
  },
  {
    id: 'many-partners-sti',
    claim: 'Only people with many partners get STIs.',
    verdict: 'myth',
    topic: 'sti',
    keywords: ['many partners', 'one partner', 'faithful', 'sti', 'only'],
    truth:
      'Anyone who has sex can get an STI, even with just one partner, if that partner has an infection. Many STIs have no symptoms, so a partner may not know.',
    whyBelieved: 'Stigma links STIs with “bad behaviour”, which makes people feel safe and avoid testing.',
    seekCare: 'Test with each new partner, and get checked if you notice discharge, sores or burning when you pee.',
    learnId: 'sti-guide',
  },
  {
    id: 'period-dirty',
    claim: 'You shouldn’t bathe or exercise during your period.',
    verdict: 'myth',
    topic: 'menstruation',
    keywords: ['bathe', 'shower', 'wash', 'exercise', 'sport', 'period', 'dirty', 'unclean'],
    truth:
      'Bathing during your period keeps you clean and comfortable, and exercise can ease cramps. Period blood is not dirty or harmful.',
    whyBelieved: 'Cultural taboos and shame around periods have been passed down for generations.',
    seekCare: 'See a health worker if period pain stops you from doing everyday activities.',
    learnId: 'menstrual-cycle-explained',
  },
  {
    id: 'irregular-infertile',
    claim: 'Irregular periods mean you can’t have children.',
    verdict: 'myth',
    topic: 'menstruation',
    keywords: ['irregular', 'infertile', 'children', 'period', 'late'],
    truth:
      'Irregular periods are very common, especially in the first years after periods start, and most people with irregular cycles can have children. Sometimes irregular periods have a treatable cause.',
    whyBelieved: 'Periods and fertility are linked, so any change can feel worrying.',
    seekCare: 'See a health worker if periods stop for 3 months (and you’re not pregnant) or if you’re 15 and haven’t started.',
    learnId: 'menstrual-cycle-explained',
  },
  {
    id: 'masturbation-harm',
    claim: 'Masturbation causes infertility or illness.',
    verdict: 'myth',
    topic: 'puberty',
    keywords: ['masturbation', 'masturbate', 'touching yourself', 'infertility', 'madness', 'blind'],
    truth: 'Masturbation is common and does not cause infertility, blindness, madness or other illness.',
    whyBelieved: 'These stories were used for generations to discourage it, and shame kept people from asking.',
    seekCare: 'You only need a health worker if you have pain, sores or other unusual symptoms.',
    learnId: 'puberty-changes',
  },
  {
    id: 'virginity-bleeding',
    claim: 'If someone doesn’t bleed the first time they have sex, they weren’t a virgin.',
    verdict: 'myth',
    topic: 'puberty',
    keywords: ['virgin', 'virginity', 'bleed', 'hymen', 'first time'],
    truth:
      'Many people do not bleed the first time. The hymen is thin, stretchy tissue that varies a lot between people and can stretch during everyday activities. There is no reliable “virginity test”.',
    whyBelieved: 'Old beliefs about the hymen being a seal have been repeated without evidence.',
    seekCare: 'Pain or heavy bleeding during sex is worth checking with a health worker.',
  },
  {
    id: 'partner-rape',
    claim: 'A boyfriend, girlfriend or spouse can’t rape their partner.',
    verdict: 'myth',
    topic: 'consent',
    keywords: ['partner', 'boyfriend', 'girlfriend', 'husband', 'wife', 'married', 'rape', 'force'],
    truth:
      'Being in a relationship or married never means automatic consent. Forcing or pressuring a partner into sex is sexual violence.',
    whyBelieved: 'Some people believe a relationship or bride price creates an obligation to have sex.',
    seekCare:
      'If a partner forced you, it is not your fault. Get care within 72 hours if you can, and call Isange One Stop Centre on 3512 (free).',
    learnId: 'consent-healthy-relationships',
  },
  {
    id: 'breastfeeding-contraception',
    claim: 'Breastfeeding always prevents pregnancy.',
    verdict: 'partly',
    topic: 'pregnancy',
    keywords: ['breastfeeding', 'breastfeed', 'after birth', 'postpartum', 'pregnant again'],
    truth:
      'Breastfeeding only protects reliably if all three are true: your baby is under 6 months, you feed only breast milk day and night, and your period hasn’t returned. Otherwise you can get pregnant again.',
    whyBelieved: 'Breastfeeding does delay fertility for many people, so the conditions get forgotten.',
    seekCare: 'Ask at your postnatal visit about contraception that is safe while breastfeeding.',
    learnId: 'after-birth',
  },
]
