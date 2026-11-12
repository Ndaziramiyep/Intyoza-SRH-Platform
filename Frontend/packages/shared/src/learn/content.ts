import type { IconName } from '../icons'
import type { CategoryId, LearnItem, Localized } from './types'

// Learning Hub library. General health education written for young people;
// to be reviewed by clinical advisors. Translations marked here should be
// checked by native speakers before launch.

export const CATEGORIES: { id: CategoryId; title: Localized; icon: IconName; tone: string }[] = [
  {
    id: 'puberty-periods',
    title: { en: 'Periods & puberty', rw: 'Imihango n’ubwangavu', fr: 'Règles et puberté' },
    icon: 'clock',
    tone: 'accent',
  },
  {
    id: 'contraception',
    title: { en: 'Contraception & choices', rw: 'Kuboneza urubyaro', fr: 'Contraception et choix' },
    icon: 'shield',
    tone: 'brand',
  },
  {
    id: 'pregnancy',
    title: { en: 'Pregnancy & after birth', rw: 'Gutwita no kubyara', fr: 'Grossesse et post-partum' },
    icon: 'heart',
    tone: 'sun',
  },
  {
    id: 'sti-hiv',
    title: { en: 'STIs & HIV', rw: 'Indwara zandurira mu mibonano & SIDA', fr: 'IST et VIH' },
    icon: 'shield',
    tone: 'violet',
  },
  {
    id: 'consent-relationships',
    title: { en: 'Consent & relationships', rw: 'Ubwumvikane n’imibanire', fr: 'Consentement et relations' },
    icon: 'users',
    tone: 'brand',
  },
]

export const LEARN_ITEMS: LearnItem[] = [
  // ── Periods & puberty ──────────────────────────────────────────
  {
    id: 'menstrual-cycle-explained',
    category: 'puberty-periods',
    format: 'article',
    title: {
      en: 'Your menstrual cycle, explained',
      rw: 'Uko imihango ikora, mu buryo bworoshye',
      fr: 'Ton cycle menstruel, expliqué',
    },
    summary: {
      en: 'What happens in your body each month, what’s normal, and when to get checked.',
      rw: 'Ibiba mu mubiri wawe buri kwezi, ibisanzwe, n’igihe wakwisuzumisha.',
      fr: 'Ce qui se passe dans ton corps chaque mois, ce qui est normal et quand consulter.',
    },
    minutes: 4,
    illustration: 'cycle',
    body: {
      en: `Your menstrual cycle is your body getting ready for a possible pregnancy, every month. It is controlled by hormones and counted from the first day of one period to the first day of the next.

## The four phases
1. Period (days 1-5 or so): the lining of the uterus leaves the body as blood.
2. Follicular phase: an egg starts to grow in an ovary and the lining builds up again.
3. Ovulation (around the middle of the cycle): an egg is released. This is when pregnancy is most likely.
4. Luteal phase: if the egg isn’t fertilised, hormone levels drop and the next period begins.

## What’s normal
• Cycles of 21-45 days in the first years after periods start; 21-35 days for adults.
• Bleeding for 2-7 days.
• Some cramps, tender breasts, tiredness or mood changes before or during your period.

## Good to know
• Ovulation timing changes from month to month, especially for young people. Counting days is not a reliable way to prevent pregnancy.
• You can get pregnant before your very first period, because ovulation comes first.

## When to see a health worker
• No period by age 15, or periods stop for 3 months (and you’re not pregnant).
• Bleeding that lasts more than 7 days, or soaks a pad every 1-2 hours.
• Pain that stops you from going to school or doing daily activities.`,
      fr: `Ton cycle menstruel, c’est ton corps qui se prépare chaque mois à une éventuelle grossesse. Il est contrôlé par des hormones et se compte du premier jour des règles au premier jour des règles suivantes.

## Les quatre phases
1. Les règles (environ jours 1 à 5) : la muqueuse de l’utérus s’évacue sous forme de sang.
2. Phase folliculaire : un ovule commence à mûrir dans un ovaire et la muqueuse se reconstruit.
3. Ovulation (vers le milieu du cycle) : un ovule est libéré. C’est le moment où une grossesse est la plus probable.
4. Phase lutéale : si l’ovule n’est pas fécondé, les hormones baissent et de nouvelles règles commencent.

## Ce qui est normal
• Des cycles de 21 à 45 jours pendant les premières années ; 21 à 35 jours chez l’adulte.
• Des saignements de 2 à 7 jours.
• Quelques crampes, seins sensibles, fatigue ou sautes d’humeur avant ou pendant les règles.

## Bon à savoir
• La date de l’ovulation change d’un mois à l’autre, surtout chez les jeunes. Compter les jours n’est pas une méthode fiable pour éviter une grossesse.
• Une grossesse est possible avant même les premières règles, car l’ovulation vient en premier.

## Quand consulter
• Pas de règles à 15 ans, ou plus de règles pendant 3 mois (sans grossesse).
• Des saignements de plus de 7 jours, ou qui remplissent une serviette toutes les 1 à 2 heures.
• Une douleur qui t’empêche d’aller à l’école ou de faire tes activités.`,
    },
    askPrompt: 'Is an irregular period normal?',
  },
  {
    id: 'puberty-changes',
    category: 'puberty-periods',
    format: 'article',
    title: { en: 'Puberty: what changes and why', rw: 'Ubwangavu n’ubugimbi: ibihinduka n’impamvu', fr: 'Puberté : ce qui change et pourquoi' },
    summary: {
      en: 'Body changes, new feelings and looking after yourself as you grow.',
      fr: 'Changements du corps, nouvelles émotions et prendre soin de soi.',
    },
    minutes: 4,
    body: {
      en: `Puberty is when hormones start turning a child’s body into an adult’s. It usually begins between 8 and 14 for girls and 9 and 15 for boys. There is no “right” age, everyone has their own timing.

## Changes for everyone
• Growth spurts, you may grow quickly for a while.
• Hair under the arms and around the genitals.
• More sweat and body odour: wash every day and wear clean clothes.
• Pimples, wash your face gently twice a day; don’t squeeze them.
• Stronger emotions, mood swings and new attractions.

## Changes for girls
• Breasts start to develop (one may grow faster than the other, that’s normal).
• Hips widen.
• Vaginal discharge appears, usually 6-12 months before the first period.
• Periods start.

## Changes for boys
• Voice cracks, then deepens.
• Penis and testicles grow.
• Erections and wet dreams happen, they are normal and not in your control.
• Facial hair grows.

## Looking after yourself
Sleep 8-10 hours, eat a variety of foods, stay active, and talk to someone you trust when things feel confusing. If puberty hasn’t started by 14 (girls) or 15 (boys), a health worker can check that everything is okay.`,
    },
    askPrompt: 'What changes happen during puberty?',
  },
  {
    id: 'periods-without-shame-audio',
    category: 'puberty-periods',
    format: 'audio',
    title: { en: 'Talking about periods without shame', rw: 'Kuvuga ku mihango nta soni', fr: 'Parler des règles sans honte' },
    summary: {
      en: 'A short audio story about a girl who misses school because of her period, and what changed.',
    },
    minutes: 5,
    media: {
      sizeMb: 4.5,
      transcript: {
        en: `Aline was 13 when her period started in class. She was scared and embarrassed, and for the next few months she stayed home every time her period came.

Her older cousin noticed and asked her what was wrong. “Periods are normal,” she told her. “Half the world has them.” She showed Aline how to use and wash a reusable pad, and how to carry a spare in her bag.

Aline also learned that her school had a teacher who kept free pads, and a quiet room where she could change.

Today Aline doesn’t miss school. She says: “The more we talk about it, the less shame there is. If you have questions, ask someone you trust, or ask Intyoza.”

Key points:
• Periods are a normal, healthy part of growing up.
• Carry a spare pad and change every 4-6 hours.
• Ask your school or health center about free pads.
• Severe pain that stops you going to school is worth checking with a health worker.`,
      },
    },
  },
  {
    id: 'periods-puberty-quiz',
    category: 'puberty-periods',
    format: 'quiz',
    title: { en: 'Quiz: periods & puberty', rw: 'Isuzuma: imihango n’ubwangavu', fr: 'Quiz : règles et puberté' },
    summary: { en: 'Five quick questions. How much do you know?' },
    minutes: 3,
    quiz: [
      {
        question: 'How long does a normal period usually last?',
        options: ['1 day', '2-7 days', '10-14 days'],
        answer: 1,
        explanation: 'Bleeding usually lasts 2-7 days. Longer than 7 days is worth checking with a health worker.',
      },
      {
        question: 'Can someone get pregnant before their very first period?',
        options: ['Yes', 'No'],
        answer: 0,
        explanation: 'Yes. Ovulation happens before the first period, so pregnancy is possible even before periods start.',
      },
      {
        question: 'Irregular periods in the first 2-3 years are…',
        options: ['A sign of illness', 'Very common', 'Caused by washing during your period'],
        answer: 1,
        explanation: 'Hormones take time to settle, so irregular cycles are very common at first.',
      },
      {
        question: 'How often should you change a disposable pad?',
        options: ['Once a day', 'Every 4-6 hours, or when full', 'Only at night'],
        answer: 1,
        explanation: 'Changing every 4-6 hours helps prevent leaks, smells and infections.',
      },
      {
        question: 'Wet dreams during puberty are…',
        options: ['Normal', 'A sign of disease', 'Something you can control'],
        answer: 0,
        explanation: 'Wet dreams are a normal part of puberty and not something you can control.',
      },
    ],
  },

  // ── Contraception ──────────────────────────────────────────────
  {
    id: 'choosing-contraception',
    category: 'contraception',
    format: 'article',
    title: { en: 'Choosing a contraceptive method', rw: 'Guhitamo uburyo bwo kuboneza urubyaro', fr: 'Choisir une méthode de contraception' },
    summary: {
      en: 'Compare the main methods, how they work, how long they last and what to expect.',
      rw: 'Gereranya uburyo bw’ingenzi, uko bukora, igihe bumara n’ibyo witega.',
      fr: 'Compare les principales méthodes : fonctionnement, durée et effets à attendre.',
    },
    minutes: 6,
    body: {
      en: `The best method is the one that fits your life and that you can use correctly. A health worker can help you choose, and you can always switch.

## Condoms (male and female)
• Used every time you have sex.
• The only method that also protects against STIs and HIV.
• Free at health centers.

## Pills
• One pill every day, at about the same time.
• Missing pills makes them less effective.

## Injection
• One injection every 3 months.
• Periods often become irregular or stop, this is not harmful.
• Fertility can take a few months longer to return after stopping.

## Implant
• A small, flexible rod placed under the skin of the arm.
• Works for 3-5 years and is one of the most effective methods.
• Can be removed any time; fertility returns quickly.

## IUD (coil)
• A small device placed in the uterus by a health worker.
• Works for 5-12 years depending on the type; the copper IUD is hormone-free.

## Emergency contraception
• Pills taken as soon as possible after unprotected sex, up to 72 hours (some types up to 5 days).
• A backup, not a regular method.

## Dual protection
Using a condom together with another method protects against both pregnancy and STIs.

## Myths to ignore
Modern contraceptives do not cause infertility, birth defects or cancer, and they are safe for young people.`,
      fr: `La meilleure méthode est celle qui convient à ta vie et que tu peux utiliser correctement. Un·e professionnel·le de santé peut t’aider à choisir, et tu peux toujours changer.

## Préservatifs (masculin et féminin)
• À utiliser à chaque rapport.
• La seule méthode qui protège aussi des IST et du VIH.
• Gratuits dans les centres de santé.

## Pilule
• Un comprimé chaque jour, à peu près à la même heure.
• Oublier des pilules réduit leur efficacité.

## Injection
• Une injection tous les 3 mois.
• Les règles deviennent souvent irrégulières ou s’arrêtent, ce n’est pas dangereux.
• Le retour de la fertilité peut prendre quelques mois de plus après l’arrêt.

## Implant
• Un petit bâtonnet souple placé sous la peau du bras.
• Efficace 3 à 5 ans, l’une des méthodes les plus fiables.
• Peut être retiré à tout moment ; la fertilité revient vite.

## DIU (stérilet)
• Un petit dispositif placé dans l’utérus par un·e soignant·e.
• Efficace 5 à 12 ans selon le type ; le DIU au cuivre est sans hormones.

## Contraception d’urgence
• Comprimés à prendre le plus tôt possible après un rapport non protégé, jusqu’à 72 heures (certains jusqu’à 5 jours).
• Une solution de secours, pas une méthode régulière.

## Double protection
Utiliser un préservatif avec une autre méthode protège à la fois de la grossesse et des IST.

## Les mythes à ignorer
Les contraceptifs modernes ne rendent pas stérile, ne causent ni malformations ni cancer, et sont sûrs pour les jeunes.`,
    },
    askPrompt: 'What contraception options are there?',
  },
  {
    id: 'condom-how-to-video',
    category: 'contraception',
    format: 'video',
    title: { en: 'How to use a condom correctly', rw: 'Uko wakoresha agakingirizo neza', fr: 'Bien utiliser un préservatif' },
    summary: { en: 'A step-by-step demonstration (with a model), in under 3 minutes.' },
    minutes: 3,
    media: {
      sizeMb: 18,
      transcript: {
        en: `Step 1. Check the expiry date and squeeze the packet gently, there should be a small air bubble, which means it isn’t damaged.

Step 2. Open the packet carefully with your fingers along the edge. Never use teeth, scissors or nails.

Step 3. Check which way the condom unrolls. Place it on the tip of the erect penis.

Step 4. Pinch the tip of the condom to squeeze out air, leaving space for semen.

Step 5. Roll the condom all the way down to the base of the penis.

Step 6. After sex, and before the penis goes soft, hold the base of the condom and pull out.

Step 7. Take the condom off away from your partner, tie a knot, wrap it in paper and throw it in a bin, not the toilet.

Remember: use a new condom every time, never use two at once, and use only water-based lubricant. Free condoms are available at health centers.`,
      },
    },
    askPrompt: 'What if the condom broke?',
  },
  {
    id: 'contraception-quiz',
    category: 'contraception',
    format: 'quiz',
    title: { en: 'Quiz: contraception', rw: 'Isuzuma: kuboneza urubyaro', fr: 'Quiz : contraception' },
    summary: { en: 'Test what you know about protecting yourself.' },
    minutes: 3,
    quiz: [
      {
        question: 'Which method protects against both pregnancy and STIs?',
        options: ['The pill', 'Condoms', 'The implant'],
        answer: 1,
        explanation: 'Only condoms protect against both. Combine them with another method for dual protection.',
      },
      {
        question: 'How often is the contraceptive injection given?',
        options: ['Every month', 'Every 3 months', 'Once a year'],
        answer: 1,
        explanation: 'The most common injection is given every 3 months.',
      },
      {
        question: 'Emergency contraception works best…',
        options: ['As soon as possible after unprotected sex', 'Only the day after', 'One week later'],
        answer: 0,
        explanation: 'The sooner, the better, ideally within 24 hours and up to 72 hours for the common pill.',
      },
      {
        question: 'Do modern contraceptives cause infertility?',
        options: ['Yes', 'No'],
        answer: 1,
        explanation: 'No. Fertility returns after stopping; after the injection it can take a few extra months.',
      },
      {
        question: 'Is it safe to use two condoms at once?',
        options: ['Yes, it’s extra safe', 'No, they can rub and break'],
        answer: 1,
        explanation: 'Two condoms create friction and are more likely to break. One condom, used correctly, is best.',
      },
    ],
  },

  // ── Pregnancy ─────────────────────────────────────────────────
  {
    id: 'healthy-pregnancy',
    category: 'pregnancy',
    format: 'article',
    title: { en: 'Preparing for a healthy pregnancy', rw: 'Kwitegura gutwita mu buzima bwiza', fr: 'Préparer une grossesse en bonne santé' },
    summary: {
      en: 'Antenatal care, nutrition and danger signs every pregnant young person should know.',
      fr: 'Suivi prénatal, alimentation et signes de danger à connaître.',
    },
    minutes: 5,
    body: {
      en: `Whether your pregnancy was planned or not, good care makes a big difference for you and your baby.

## Start antenatal care early
• Go to a health center as soon as you think you’re pregnant, ideally before 12 weeks.
• WHO recommends at least 8 antenatal contacts during pregnancy.
• Visits include checks for anaemia, blood pressure, HIV and syphilis, plus iron and folic acid tablets.

## Look after your body
• Eat a variety of foods: beans, vegetables, fruit, eggs, fish or meat when possible.
• Drink clean water and rest when you can.
• Avoid alcohol, smoking and medicines not prescribed by a health worker.
• Sleep under a mosquito net.

## Danger signs, go to a health facility straight away
• Bleeding from the vagina.
• Severe headache or blurred vision.
• Fever or very bad belly pain.
• Swelling of the face or hands.
• Water breaking early, or the baby moving less or stopping.

## Plan for the birth
Decide where you will give birth, how you will get there and who will go with you. Giving birth at a health facility with a skilled attendant is safest.

## You are not alone
Young parents can continue school and get support. Talking to a counsellor or joining a peer group can help.`,
    },
    askPrompt: 'How do I stay healthy during pregnancy?',
  },
  {
    id: 'after-birth',
    category: 'pregnancy',
    format: 'article',
    title: { en: 'After birth: caring for yourself', rw: 'Nyuma yo kubyara: kwiyitaho', fr: 'Après l’accouchement : prendre soin de soi' },
    summary: { en: 'Recovery, breastfeeding, family planning and your mental health after birth.' },
    minutes: 4,
    body: {
      en: `The weeks after birth are a big change for your body and mind.

## Postnatal check-ups
Go for check-ups within 2 days of birth, then around 1 week and 6 weeks. They check your recovery and your baby’s health and vaccinations.

## Your body
• Bleeding (lochia) is normal for up to 6 weeks and slowly gets lighter.
• Rest when your baby sleeps and accept help from others.

## Breastfeeding
Breast milk alone is best for the first 6 months. If it hurts or your baby struggles to feed, ask a health worker for help with positioning.

## Family planning
You can get pregnant again before your period returns. Several methods are safe while breastfeeding, ask at your postnatal visit. Waiting at least 2 years before another pregnancy is healthier for you and your baby.

## Your feelings
Feeling tearful in the first two weeks is common. If you feel hopeless, can’t sleep even when your baby sleeps, or have thoughts of harming yourself or your baby, talk to a health worker, postpartum depression is common and treatable.

## Get help urgently for
Heavy bleeding, fever, bad-smelling discharge, severe headache or pain in one leg.`,
    },
  },

  // ── STIs & HIV ────────────────────────────────────────────────
  {
    id: 'sti-guide',
    category: 'sti-hiv',
    format: 'article',
    title: { en: 'STIs: prevention, testing and treatment', rw: 'Indwara zandurira mu mibonano: kwirinda, kwipimisha no kuvurwa', fr: 'IST : prévention, dépistage et traitement' },
    summary: {
      en: 'The most common STIs, why testing matters, and how to protect yourself.',
      fr: 'Les IST les plus courantes, pourquoi se faire dépister et comment se protéger.',
    },
    minutes: 5,
    body: {
      en: `Sexually transmitted infections (STIs) spread through vaginal, anal or oral sex, and some through skin-to-skin contact.

## Common STIs
• Chlamydia and gonorrhoea, often no symptoms; cured with antibiotics.
• Syphilis, starts with a painless sore; cured with antibiotics, but serious if untreated.
• Trichomoniasis, itching and discharge; cured with medicine.
• Herpes, painful blisters that come and go; treatable, not curable.
• HPV, can cause warts and, over many years, cervical cancer; a vaccine protects you.
• HIV, see our HIV article.

## Why testing matters
Many STIs have no symptoms but can still cause infertility, pain or pass to a baby during pregnancy. Testing is the only way to know.

## Protect yourself
• Use condoms every time.
• Get tested with each new partner, testing together is a great idea.
• Get the HPV vaccine if offered (Rwanda vaccinates girls at school).
• Don’t share needles or razors.

## If you have symptoms
Discharge, sores, burning when you pee or itching: go to a health center. Don’t take leftover or borrowed medicine, it can make infections harder to treat. Your partner(s) need treatment too, so you don’t get re-infected.`,
    },
    askPrompt: 'What are signs of an STI?',
  },
  {
    id: 'hiv-today',
    category: 'sti-hiv',
    format: 'article',
    title: { en: 'HIV today: testing, PrEP, PEP and treatment', rw: 'SIDA uyu munsi: kwipimisha, PrEP, PEP no kuvurwa', fr: 'Le VIH aujourd’hui : dépistage, PrEP, PEP et traitement' },
    summary: {
      en: 'HIV is preventable and treatable. Here’s what every young person should know.',
      rw: 'SIDA iririndwa kandi iravurwa. Dore ibyo buri muntu ukiri muto akwiye kumenya.',
    },
    minutes: 5,
    body: {
      en: `## How HIV is (and isn’t) passed on
HIV passes through unprotected sex, sharing needles, and from parent to baby during pregnancy, birth or breastfeeding. It does NOT pass through hugging, kissing, sharing food, toilets or mosquitoes.

## Testing
• Free and confidential at public health centers.
• Results in about 20 minutes. Self-test kits are also available.
• Test at least once a year if you’re sexually active, and with every new partner.

## PrEP, prevention before
A daily pill for people at higher risk of HIV. Taken correctly, it is highly effective. Ask at a health center if PrEP is right for you.

## PEP, emergency prevention after
If you may have been exposed (condom broke, sexual assault), PEP must be started within 72 hours, the sooner the better. Go to a health center or Isange One Stop Centre immediately.

## Treatment
ARVs are free. People living with HIV who take treatment every day can live long, healthy lives, study, work, have relationships and have HIV-negative children.

## U = U
When treatment keeps the virus undetectable, HIV is not passed on through sex. Undetectable = Untransmittable.`,
    },
    askPrompt: 'What is PEP?',
  },
  {
    id: 'sti-hiv-quiz',
    category: 'sti-hiv',
    format: 'quiz',
    title: { en: 'Quiz: STIs & HIV', rw: 'Isuzuma: indwara zandurira mu mibonano & SIDA', fr: 'Quiz : IST et VIH' },
    summary: { en: 'Five questions on prevention and testing.' },
    minutes: 3,
    quiz: [
      {
        question: 'Can you tell if someone has an STI by looking at them?',
        options: ['Yes', 'No'],
        answer: 1,
        explanation: 'Many STIs have no visible signs. Testing is the only way to know.',
      },
      {
        question: 'PEP must be started within…',
        options: ['72 hours', '2 weeks', '1 month'],
        answer: 0,
        explanation: 'PEP should be started as soon as possible and within 72 hours of possible exposure.',
      },
      {
        question: 'Can HIV be passed on by sharing a cup or hugging?',
        options: ['Yes', 'No'],
        answer: 1,
        explanation: 'No. HIV is not passed through everyday contact, food, cups, toilets or mosquitoes.',
      },
      {
        question: 'What does U=U mean?',
        options: [
          'Undetectable = Untransmittable',
          'Unprotected = Unsafe',
          'Untested = Unknown',
        ],
        answer: 0,
        explanation: 'People on treatment with an undetectable viral load do not pass HIV on through sex.',
      },
      {
        question: 'Which vaccine helps prevent cervical cancer?',
        options: ['HPV vaccine', 'Measles vaccine', 'There is none'],
        answer: 0,
        explanation: 'The HPV vaccine protects against the types of HPV that cause most cervical cancers.',
      },
    ],
  },

  // ── Consent & relationships ───────────────────────────────────
  {
    id: 'consent-healthy-relationships',
    category: 'consent-relationships',
    format: 'article',
    title: { en: 'Consent and healthy relationships', rw: 'Ubwumvikane n’imibanire myiza', fr: 'Consentement et relations saines' },
    summary: {
      en: 'What consent really means, signs of a healthy relationship, and red flags.',
      rw: 'Icyo ubwumvikane busobanura, ibimenyetso by’imibanire myiza n’ibyo kwitondera.',
      fr: 'Ce que signifie vraiment le consentement, les signes d’une relation saine et les signaux d’alerte.',
    },
    minutes: 5,
    body: {
      en: `## Consent is…
• Freely given, no pressure, threats, guilt, money or gifts.
• Reversible, anyone can change their mind at any time.
• Specific, yes to one thing isn’t yes to everything.
• Informed and enthusiastic, both people really want it.

Someone who is drunk, asleep, unconscious or afraid cannot consent. In Rwanda, a person under 18 cannot legally consent to sex.

## Healthy relationship signs
• You feel safe, respected and free to be yourself.
• You can disagree without fear.
• You both keep your friends, family and interests.
• You make decisions about sex and protection together.

## Red flags
• Checking your phone or controlling who you see.
• Extreme jealousy, insults or threats.
• Pressure to have sex or to stop using protection.
• Hitting, pushing or any kind of violence.
• An older person offering money or gifts for a relationship.

## If something feels wrong
Trust your feelings. Talk to someone you trust, a counsellor, or call Isange One Stop Centre on 3512 (free). If you are in danger, call 112.`,
    },
    askPrompt: 'How do I know if my relationship is healthy?',
  },
  {
    id: 'where-to-get-help-audio',
    category: 'consent-relationships',
    format: 'audio',
    title: { en: 'If someone hurts you: where to get help', rw: 'Niba hari ukubabaje: aho wabona ubufasha', fr: 'Si quelqu’un te fait du mal : où trouver de l’aide' },
    summary: { en: 'A calm, short guide to the support available after violence.' },
    minutes: 4,
    media: {
      sizeMb: 3.5,
      transcript: {
        en: `If someone has hurt you, physically, sexually or emotionally, please know this: it is not your fault, and you deserve help.

Here are the steps you can take.

First, if you are in danger right now, call the police on 112.

Second, if you were sexually assaulted, try to get to a health facility or an Isange One Stop Centre within 72 hours. They can give you medicine to prevent HIV and pregnancy, treat injuries and support you. You can call Isange for free on 3512, day or night.

Third, talk to someone. A trusted adult, a friend, a teacher or a counsellor. For children, the child helpline is 116.

You don’t have to decide everything at once. Getting medical care does not mean you have to report to the police if you’re not ready, the staff will explain your options.

You are not alone.`,
      },
    },
  },
  {
    id: 'relationships-myth-fact',
    category: 'consent-relationships',
    format: 'myth-fact',
    title: { en: 'Myth or fact: love, sex & consent', rw: 'Igihuha cyangwa ukuri: urukundo n’ubwumvikane', fr: 'Mythe ou réalité : amour, sexe et consentement' },
    summary: { en: 'Swipe through common beliefs and find out what’s true.' },
    minutes: 3,
    cards: [
      {
        statement: 'If someone accepts a gift, they owe you sex.',
        isMyth: true,
        explanation: 'A gift never buys consent. Sex in exchange for gifts or money from someone older is exploitation.',
      },
      {
        statement: 'You can change your mind about sex even after saying yes.',
        isMyth: false,
        explanation: 'Consent can be taken back at any time, and the other person must stop.',
      },
      {
        statement: 'Jealousy shows how much someone loves you.',
        isMyth: true,
        explanation: 'A little jealousy is human, but controlling behaviour is a red flag, not a sign of love.',
      },
      {
        statement: 'Silence means yes.',
        isMyth: true,
        explanation: 'Only a clear, freely given yes is consent. If you’re unsure, ask, and respect the answer.',
      },
      {
        statement: 'Boys and men can also experience sexual violence.',
        isMyth: false,
        explanation: 'Anyone can experience sexual violence, and everyone deserves support.',
      },
    ],
  },
  {
    id: 'body-myth-fact',
    category: 'puberty-periods',
    format: 'myth-fact',
    title: { en: 'Myth or fact: periods & bodies', rw: 'Igihuha cyangwa ukuri: imihango n’umubiri', fr: 'Mythe ou réalité : règles et corps' },
    summary: { en: 'Five beliefs about periods and bodies, true or false?' },
    minutes: 3,
    cards: [
      {
        statement: 'You shouldn’t bathe or exercise during your period.',
        isMyth: true,
        explanation: 'Bathing keeps you clean and comfortable, and exercise can actually ease cramps.',
      },
      {
        statement: 'Period blood is dirty.',
        isMyth: true,
        explanation: 'Period blood is normal blood and tissue from the uterus. It is not dirty or harmful.',
      },
      {
        statement: 'It’s normal for periods to be irregular when they first start.',
        isMyth: false,
        explanation: 'Cycles often take 2-3 years to settle.',
      },
      {
        statement: 'You need to wash inside your vagina to keep it clean.',
        isMyth: true,
        explanation: 'The vagina cleans itself. Washing inside (douching) can cause infections. Wash the outside with water.',
      },
      {
        statement: 'Masturbation causes infertility or illness.',
        isMyth: true,
        explanation: 'Masturbation is common and does not cause infertility, blindness or illness.',
      },
    ],
  },
]
