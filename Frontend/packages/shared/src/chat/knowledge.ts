import type { TopicId } from './types'

// Offline answers used when the chat service is unreachable.
// Content is general health information and should be reviewed by the
// project's clinical advisors before launch.

export type Intent = {
  id: string
  topic: TopicId
  /** Overview answer: used when a question fits the topic but nothing more specific. */
  general?: boolean
  /** Lower-case words or phrases; more matches = better fit. */
  keywords: string[]
  text: string
  simple: string
  followUps: string[]
}

export const TOPIC_STARTERS: Record<TopicId, string> = {
  menstruation: 'Can you explain how periods work?',
  puberty: 'What changes happen during puberty?',
  contraception: 'What contraception options are there?',
  pregnancy: 'How do I know if I’m pregnant?',
  sti: 'How can I protect myself from STIs and HIV?',
  consent: 'What does consent really mean?',
  relationships: 'How do I know if my relationship is healthy?',
}

export const TOPIC_KEYWORDS: Record<TopicId, string[]> = {
  menstruation: ['period', 'periods', 'menstru', 'cycle', 'pad', 'pads', 'tampon', 'cramp', 'imihango', 'règles', 'bleeding'],
  puberty: ['puberty', 'growing up', 'body change', 'breast', 'wet dream', 'voice', 'hair', 'ubugimbi', 'ubwangavu', 'puberté', 'pimple', 'acne'],
  contraception: ['contracept', 'family planning', 'condom', 'pill', 'injection', 'implant', 'iud', 'coil', 'emergency', 'morning after', 'kuboneza', 'prevent pregnancy', 'birth control', 'depo'],
  pregnancy: ['pregnan', 'pregnancy test', 'baby', 'antenatal', 'prenatal', 'gutwita', 'grossesse', 'abortion', 'expecting', 'due date'],
  sti: ['sti', 'std', 'hiv', 'aids', 'sida', 'vih', 'ist', 'infection', 'gonorrh', 'syphilis', 'chlamydia', 'herpes', 'hpv', 'test', 'prep', 'pep', 'discharge', 'virus'],
  consent: ['consent', 'force', 'forced', 'pressure', 'say no', 'rape', 'abuse', 'touch', 'ubwumvikane', 'consentement', 'agree'],
  relationships: ['relationship', 'boyfriend', 'girlfriend', 'partner', 'love', 'break up', 'breakup', 'jealous', 'trust', 'feelings', 'friend', 'urukundo', 'sad', 'stress'],
}

export const INTENTS: Intent[] = [
  // ── Menstruation ──────────────────────────────────────────────
  {
    id: 'period-basics',
    general: true,
    topic: 'menstruation',
    keywords: ['what is a period', 'how periods work', 'menstruation', 'why do', 'period', 'cycle'],
    text:
      'A period (menstruation) is when the lining of the uterus leaves the body through the vagina as blood. It happens because the body prepares every month for a possible pregnancy, when no pregnancy happens, the lining is shed.\n\n• A cycle is counted from the first day of one period to the first day of the next.\n• For young people, cycles of 21-45 days are normal; for adults usually 21-35 days.\n• Bleeding normally lasts 2-7 days.\n• Most people start their first period between ages 9 and 15.',
    simple:
      'Every month, the body gets ready in case of a baby. If there is no baby, the body lets out some blood for a few days. That is a period. It is normal and healthy.',
    followUps: ['Is an irregular period normal?', 'How can I ease period pain?', 'How often should I change a pad?'],
  },
  {
    id: 'period-irregular',
    topic: 'menstruation',
    keywords: ['irregular', 'late period', 'not regular', 'skipped', 'twice a month', 'early period', 'missed period', 'no period'],
    text:
      'Irregular periods are very common, especially in the first 2-3 years after periods start, because hormones are still settling. Stress, illness, big weight changes, intense exercise and some contraceptives can also change your cycle.\n\nIf you’ve had sex and your period is late, take a pregnancy test, they are free at most health centers.\n\nSee a health worker if:\n• you are 15 or older and have never had a period,\n• you miss periods for 3 months in a row (and are not pregnant),\n• you bleed for more than 7 days, or soak a pad every hour.',
    simple:
      'In the first years, periods often come at different times. That is normal. If you had sex and your period is late, do a pregnancy test. If periods stop for 3 months, see a health worker.',
    followUps: ['How do I know if I’m pregnant?', 'Can stress change my period?', 'Where can I see a health worker?'],
  },
  {
    id: 'period-pain',
    topic: 'menstruation',
    keywords: ['pain', 'cramp', 'cramps', 'hurts', 'stomach ache', 'painful period', 'ease'],
    text:
      'Period cramps happen when the uterus squeezes to push out its lining. Things that help:\n\n• A warm cloth or bottle on your lower belly or back.\n• Gentle movement, like walking or stretching.\n• Drinking water and resting.\n• Pain relief like paracetamol or ibuprofen, follow the dose on the packet, or ask a pharmacist.\n\nPain that stops you going to school or doing daily activities is not something you have to accept. A health worker can check for causes like endometriosis and offer better treatment.',
    simple:
      'Cramps are common. Try something warm on your belly, rest, drink water and take a pain tablet from the pharmacy. If the pain is very strong, see a health worker.',
    followUps: ['When is period pain not normal?', 'How often should I change a pad?'],
  },
  {
    id: 'period-hygiene',
    topic: 'menstruation',
    keywords: ['pad', 'pads', 'change', 'hygiene', 'clean', 'reusable', 'tampon', 'menstrual cup', 'smell'],
    text:
      'Good period care:\n\n• Change a disposable pad every 4-6 hours, or sooner if it is full.\n• Reusable cloth pads: wash with soap and cold water, then dry fully in the sun, sunlight helps kill germs.\n• Wash the outside of your vagina (the vulva) with clean water once or twice a day. Avoid perfumed soaps or douching inside the vagina, it cleans itself.\n• Wash your hands before and after changing.\n\nIf you can’t afford pads, ask at your school or health center, many have free supplies.',
    simple:
      'Change your pad every 4-6 hours. Wash reusable pads with soap and dry them in the sun. Wash the outside of your private parts with clean water. Do not wash inside.',
    followUps: ['Is an irregular period normal?', 'How can I ease period pain?'],
  },

  // ── Puberty ───────────────────────────────────────────────────
  {
    id: 'puberty-basics',
    general: true,
    topic: 'puberty',
    keywords: ['puberty', 'body change', 'changes', 'growing', 'grow', 'hair', 'breasts', 'voice', 'pimple', 'acne', 'smell'],
    text:
      'Puberty is when your body grows from a child’s body into an adult’s. It usually starts between 8 and 14 for girls and 9 and 15 for boys, everyone has their own timing.\n\nCommon changes:\n• Growth spurts, and hair under the arms and around the genitals.\n• More sweat, body odour and pimples, daily washing helps.\n• Girls: breasts develop, hips widen and periods start.\n• Boys: voice deepens, penis and testicles grow, wet dreams may start.\n• Strong new feelings, mood changes and attraction to others.\n\nAll of this is normal. Talk to a health worker if puberty hasn’t started by 14 (girls) or 15 (boys).',
    simple:
      'Puberty is when your body changes from a child to an adult. You grow taller, get new hair and your feelings change. It happens at different times for everyone, and it is normal.',
    followUps: ['What are wet dreams?', 'Why do my feelings change so much?', 'Can you explain how periods work?'],
  },
  {
    id: 'puberty-wet-dreams',
    topic: 'puberty',
    keywords: ['wet dream', 'wet dreams', 'erection', 'sperm', 'semen', 'night'],
    text:
      'A wet dream is when semen comes out of the penis during sleep. It is a normal part of puberty and happens because the body has started making sperm. You can’t control it, it’s nothing to be ashamed of, and it doesn’t mean anything is wrong. Some people have them often, some rarely or never, both are normal.\n\nUnexpected erections are also very common during puberty and go away on their own.',
    simple:
      'Sometimes during sleep, a little liquid comes out of a boy’s penis. This is called a wet dream. It is normal and healthy.',
    followUps: ['What changes happen during puberty?', 'Why do my feelings change so much?'],
  },
  {
    id: 'puberty-feelings',
    topic: 'puberty',
    keywords: ['feelings', 'mood', 'emotional', 'crush', 'attracted', 'angry', 'sad', 'confused'],
    text:
      'Hormones during puberty can make feelings stronger and change quickly, feeling happy one moment and upset the next is common. You may also start having crushes or feeling attracted to others. That is a normal part of growing up; having feelings does not mean you have to act on them.\n\nThings that help: enough sleep, moving your body, and talking to someone you trust. If you feel sad most days for more than two weeks, please talk to a health worker or counselor.',
    simple:
      'During puberty, feelings can be strong and change fast. That is normal. Sleep well, stay active and talk to someone you trust.',
    followUps: ['How do I know if my relationship is healthy?', 'What does consent really mean?'],
  },

  // ── Contraception ─────────────────────────────────────────────
  {
    id: 'contraception-options',
    general: true,
    topic: 'contraception',
    keywords: ['contraception', 'contraceptive', 'family planning', 'options', 'methods', 'birth control', 'prevent pregnancy', 'which method', 'best method'],
    text:
      'There are many safe ways to prevent pregnancy. The main options are:\n\n• Condoms (male or female), used each time; the only method that also protects against STIs and HIV.\n• Pills, taken every day.\n• Injection, one shot every 3 months.\n• Implant, a small rod in the arm, works for 3-5 years.\n• IUD (coil), placed in the uterus by a health worker, works 5-12 years.\n• Emergency contraception, after unprotected sex, as soon as possible.\n\nAll of these except emergency contraception work best when chosen with a health worker, who can help you find the one that fits your life. You can stop any method and your fertility returns.',
    simple:
      'You can prevent pregnancy with condoms, daily pills, an injection every 3 months, or a small implant in the arm. Condoms also protect from HIV. A health worker can help you choose.',
    followUps: ['What is emergency contraception?', 'Do contraceptives have side effects?', 'How do I use a condom correctly?'],
  },
  {
    id: 'contraception-emergency',
    topic: 'contraception',
    keywords: ['emergency', 'morning after', 'after sex', 'unprotected', 'plan b', 'postinor', 'ec pill', 'condom broke', 'broke'],
    text:
      'Emergency contraception (EC) can prevent pregnancy after unprotected sex or if a condom broke.\n\n• EC pills work best the sooner you take them, ideally within 24 hours, and up to 72 hours (3 days) for the most common type.\n• A copper IUD placed by a health worker within 5 days is the most effective option.\n• EC is available at pharmacies and health centers.\n• It does not cause an abortion and does not affect future fertility.\n• It does not protect against STIs or HIV, if that is a concern, ask about PEP, which must be started within 72 hours.\n\nEC is for emergencies, not a regular method. If you need it often, a health worker can help you find a regular method.',
    simple:
      'If you had sex without protection, an emergency pill can stop a pregnancy. Take it as soon as possible, within 3 days. Get it at a pharmacy or health center.',
    followUps: ['What contraception options are there?', 'What is PEP?', 'Where can I get it?'],
  },
  {
    id: 'contraception-condoms',
    topic: 'contraception',
    keywords: ['condom', 'condoms', 'use a condom', 'put on', 'female condom', 'broke'],
    text:
      'Condoms are the only method that protects against both pregnancy and STIs/HIV. To use one correctly:\n\n1. Check the expiry date and that the packet isn’t damaged.\n2. Open carefully with fingers, not teeth or scissors.\n3. Put it on when the penis is hard, before any contact with the partner’s genitals.\n4. Pinch the tip to leave space, then roll it all the way down.\n5. After sex, hold the base while pulling out, then throw it away.\n\nUse a new condom every time. Don’t use two at once, they rub and break. Free condoms are available at health centers.',
    simple:
      'Use a new condom every time you have sex. Check the date, open it with your fingers, pinch the top and roll it down. Condoms protect from pregnancy and HIV.',
    followUps: ['What if the condom broke?', 'How do I talk to my partner about condoms?'],
  },
  {
    id: 'contraception-side-effects',
    topic: 'contraception',
    keywords: ['side effect', 'side effects', 'infertility', 'infertile', 'safe', 'weight', 'bleeding', 'harm', 'dangerous'],
    text:
      'Modern contraceptives are safe for young people. Some people get side effects, which are usually mild and often settle within 3 months:\n\n• Changes to bleeding, spotting, lighter, heavier or no periods.\n• Headaches, sore breasts or nausea.\n\nContraceptives do not cause infertility. Fertility returns soon after stopping most methods; after the injection it can take a few months longer.\n\nIf side effects bother you, don’t just stop, talk to a health worker. You can switch to another method.',
    simple:
      'Family planning methods are safe. Some people have small changes in their period at first. They do not stop you from having babies later. If you have problems, a health worker can help you change method.',
    followUps: ['What contraception options are there?', 'Where can I get family planning?'],
  },

  // ── Pregnancy ─────────────────────────────────────────────────
  {
    id: 'pregnancy-signs',
    general: true,
    topic: 'pregnancy',
    keywords: ['am i pregnant', 'pregnant', 'signs', 'symptoms', 'pregnancy test', 'test', 'know if'],
    text:
      'Early signs of pregnancy can include a missed period, feeling sick, sore or swollen breasts, tiredness and needing to pee more often. But these can have other causes too, a test is the only way to know.\n\n• A urine pregnancy test is accurate from the first day of a missed period (about 2-3 weeks after sex).\n• Tests are free at health centers and sold at pharmacies.\n• If the test is negative but your period still doesn’t come, test again after a week.\n\nIf you might be pregnant, you deserve support and clear information. A health worker can talk you through your options confidentially.',
    simple:
      'If your period is late after sex, you may be pregnant. Take a pregnancy test, it is free at the health center. A health worker can help you, and it is private.',
    followUps: ['What should I do if I’m pregnant and not ready?', 'How do I stay healthy during pregnancy?'],
  },
  {
    id: 'pregnancy-care',
    topic: 'pregnancy',
    keywords: ['antenatal', 'prenatal', 'healthy pregnancy', 'eat', 'checkup', 'visits', 'stay healthy', 'care', 'expecting'],
    text:
      'Antenatal care (ANC) keeps you and your baby healthy. Start as early as possible, ideally before 12 weeks.\n\n• WHO recommends at least 8 antenatal contacts with a health worker.\n• You’ll get checks for anaemia, blood pressure, HIV and syphilis, and iron and folic acid supplements.\n• Eat a variety of foods, drink clean water, rest, and avoid alcohol and smoking.\n\nGo to a health facility straight away if you have bleeding, severe headache, blurred vision, fever, strong belly pain, swelling of the face or hands, or if the baby stops moving.',
    simple:
      'When you are pregnant, visit the health center early and often. Eat well and do not drink alcohol. If you bleed, have strong pain, or the baby stops moving, go to the health center right away.',
    followUps: ['What happens after giving birth?', 'Where can I find antenatal care?'],
  },
  {
    id: 'pregnancy-unplanned',
    topic: 'pregnancy',
    keywords: ['not ready', 'unplanned', 'abortion', 'scared', 'parents', 'don’t want', "don't want", 'options', 'school'],
    text:
      'Finding out about an unplanned pregnancy can feel overwhelming. You are not alone, and you deserve support without judgement.\n\n• A health worker or counselor can explain all your options confidentially, and help you think about what is right for you.\n• In Rwanda, the law allows a doctor to end a pregnancy in certain situations, for example when the pregnant person is a child, after rape, incest or forced marriage, or when the pregnancy puts health at risk. A health worker can explain what applies to you.\n• Unsafe abortion (pills from unknown sources, herbs, or untrained people) is very dangerous. Please don’t risk it.\n• If you continue the pregnancy, early antenatal care matters. Young parents can get support to continue school.',
    simple:
      'You are not alone. Talk to a health worker, it is private. They can tell you your choices. Do not try to end a pregnancy by yourself; it can be very dangerous.',
    followUps: ['Where can I talk to a counselor?', 'How do I stay healthy during pregnancy?'],
  },
  {
    id: 'pregnancy-postpartum',
    topic: 'pregnancy',
    keywords: ['after birth', 'postpartum', 'giving birth', 'breastfeed', 'new mother', 'new baby', 'after delivery'],
    text:
      'After giving birth, your body needs time to heal. Postnatal check-ups, within 2 days, then around 1 and 6 weeks, help catch problems early.\n\n• Bleeding (lochia) is normal for up to 6 weeks and slowly gets lighter.\n• Exclusive breastfeeding for 6 months is best for your baby.\n• You can get pregnant again before your period returns, ask about contraception that is safe while breastfeeding.\n• Feeling low is common; feeling hopeless for more than two weeks may be postpartum depression, which is treatable.\n\nSeek care urgently for heavy bleeding, fever, bad-smelling discharge or severe headache.',
    simple:
      'After birth, go for check-ups. Bleeding for some weeks is normal. Breastfeed your baby. You can get pregnant again quickly, so ask about family planning. If you feel very sad, talk to a health worker.',
    followUps: ['Do contraceptives have side effects?', 'Is there a safe space for young parents?'],
  },

  // ── STIs & HIV ────────────────────────────────────────────────
  {
    id: 'sti-basics',
    general: true,
    topic: 'sti',
    keywords: ['sti', 'std', 'infection', 'protect', 'prevent', 'gonorrhea', 'syphilis', 'chlamydia', 'herpes', 'hpv'],
    text:
      'Sexually transmitted infections (STIs) pass from person to person through sexual contact. Many people with an STI have no symptoms, so testing is the only way to know.\n\nWays to protect yourself:\n• Use a condom every time.\n• Get tested, and test together with a new partner.\n• The HPV vaccine protects against cervical cancer.\n• PrEP can prevent HIV for people at higher risk.\n\nMost STIs can be cured with medicine, and all can be treated. Testing and treatment are confidential.',
    simple:
      'STIs are infections you can get from sex. Many people don’t feel sick, so get tested. Use a condom every time. Most STIs can be cured.',
    followUps: ['Where can I get tested for free?', 'What are signs of an STI?', 'What is PrEP?'],
  },
  {
    id: 'sti-symptoms',
    topic: 'sti',
    keywords: ['symptoms', 'signs', 'discharge', 'sore', 'sores', 'itch', 'burn', 'burning', 'pee', 'smell', 'rash', 'warts'],
    text:
      'Possible signs of an STI include:\n\n• Unusual discharge from the vagina or penis.\n• Burning or pain when peeing.\n• Sores, blisters, warts or itching around the genitals or anus.\n• Pain during sex, or lower belly pain.\n\nRemember that many STIs have no signs at all. If you notice any of these, go to a health center, don’t self-treat with leftover or borrowed medicine, which can make infections harder to cure. Your partner(s) may also need treatment.',
    simple:
      'Signs of an STI can be strange liquid from your private parts, pain when you pee, or sores. Go to the health center. Do not take medicine without a health worker.',
    followUps: ['Where can I get tested for free?', 'How can I protect myself from STIs and HIV?'],
  },
  {
    id: 'hiv-basics',
    topic: 'sti',
    keywords: ['hiv', 'aids', 'sida', 'vih', 'virus', 'prep', 'pep', 'viral load', 'arv', 'u=u', 'undetectable'],
    text:
      'HIV is a virus that weakens the immune system. It can be passed through unprotected sex, sharing needles, and from parent to baby during pregnancy, birth or breastfeeding. It is not passed by hugging, kissing, sharing food or mosquitoes.\n\n• Testing is free and confidential at health centers.\n• PrEP is a daily pill that prevents HIV for people at higher risk.\n• PEP is emergency medicine after possible exposure, start within 72 hours.\n• People living with HIV who take treatment (ARVs) can live long, healthy lives. When treatment keeps the virus undetectable, HIV is not passed on through sex (U=U).',
    simple:
      'HIV is a virus. You can get it from sex without a condom or sharing needles, not from hugging or sharing food. Testing is free. Medicine lets people with HIV live long, healthy lives.',
    followUps: ['What is PEP?', 'Where can I get tested for free?', 'Is there a safe space for young people living with HIV?'],
  },
  {
    id: 'hiv-testing',
    topic: 'sti',
    keywords: ['tested', 'testing', 'where', 'free test', 'get tested', 'self test', 'clinic'],
    text:
      'You can get tested for HIV and other STIs at public health centers, hospitals and many youth-friendly corners, HIV testing is free at public facilities. Some pharmacies sell HIV self-test kits.\n\nWhat to expect: a short private conversation, a quick finger-prick test, and results usually within 20 minutes. If a result is positive, the health worker will explain next steps and link you to free treatment.\n\nTesting is confidential, results are not shared with your family or school.',
    simple:
      'You can get a free HIV test at the health center. It is quick and private. The health worker will help you with the result.',
    followUps: ['Find a testing center near me', 'What is PrEP?'],
  },

  // ── Consent ───────────────────────────────────────────────────
  {
    id: 'consent-basics',
    general: true,
    topic: 'consent',
    keywords: ['consent', 'what is consent', 'agree', 'permission', 'yes', 'mean'],
    text:
      'Consent means agreeing freely to sexual activity, every time, with every person.\n\n• It must be freely given: no pressure, threats, gifts in exchange, or guilt.\n• It can be taken back at any moment, even in the middle.\n• Saying yes to one thing doesn’t mean yes to everything.\n• Someone who is drunk, asleep, unconscious or being pressured cannot consent.\n• In Rwanda, a person under 18 cannot legally consent to sex.\n\nSilence is not consent. If you’re not sure, ask, and respect the answer.',
    simple:
      'Consent means both people really want to do something. Anyone can say no at any time. If someone is drunk, asleep or forced, it is not consent.',
    followUps: ['How do I say no to pressure?', 'What should I do if someone forced me?'],
  },
  {
    id: 'consent-pressure',
    topic: 'consent',
    keywords: ['say no', 'pressure', 'pressured', 'convince', 'insist', 'refuse', 'not ready for sex', 'ready to have sex'],
    text:
      'You never owe anyone sex, not a partner, not someone who gave you money or gifts, not someone older. Some ways to handle pressure:\n\n• Be clear: “No, I don’t want to.” You don’t need to give a reason.\n• If they keep pushing, that is a warning sign about how they treat you.\n• Leave the situation if you can, and tell someone you trust.\n• A partner who cares about you will respect your “no”.\n\nIf someone is older, has power over you or offers money or gifts for sex, that is exploitation and not your fault. You can get help.',
    simple:
      'You can always say no. You do not need a reason. A person who loves you will respect your no. If someone keeps pushing, tell a trusted adult.',
    followUps: ['How do I know if my relationship is healthy?', 'What should I do if someone forced me?'],
  },
  {
    id: 'consent-violence',
    topic: 'consent',
    keywords: ['forced', 'rape', 'abuse', 'assault', 'touched', 'violence', 'gbv', 'help', 'someone forced me'],
    text:
      'If someone forced or pressured you into any sexual act, it is not your fault, whatever the situation.\n\n• Get medical care as soon as possible, within 72 hours you can get PEP to prevent HIV and emergency contraception to prevent pregnancy.\n• Isange One Stop Centres (call 3512, free) give medical care, counselling and legal help in one place.\n• If you are in danger, call the police on 112. For children, the helpline is 116.\n• If you can, keep the clothes you were wearing in a paper bag, it can help as evidence, but getting care comes first.\n\nYou deserve to be believed and supported.',
    simple:
      'If someone forced you, it is not your fault. Go to a health center within 3 days for medicine. Call 3512 (Isange) for free help, or 112 if you are in danger.',
    followUps: ['Find support near me', 'What is PEP?'],
  },

  // ── Relationships ─────────────────────────────────────────────
  {
    id: 'relationships-healthy',
    general: true,
    topic: 'relationships',
    keywords: ['healthy', 'relationship', 'boyfriend', 'girlfriend', 'partner', 'jealous', 'control', 'red flag', 'toxic', 'trust'],
    text:
      'A healthy relationship feels safe and respectful. Signs to look for:\n\nHealthy: you can be yourself, disagree without fear, keep your friends and family, and say no.\nUnhealthy: checking your phone, controlling who you see or what you wear, extreme jealousy, insults, pressure for sex, threats or hitting.\n\nControl and violence often start small and grow. If something feels wrong, trust that feeling and talk to someone you trust or a counselor.',
    simple:
      'In a good relationship, you feel safe, respected and free. If your partner controls you, hurts you, or pushes you to have sex, that is not okay. Talk to someone you trust.',
    followUps: ['How do I talk to my partner about condoms?', 'How do I deal with a breakup?', 'How do I say no to pressure?'],
  },
  {
    id: 'relationships-talking',
    topic: 'relationships',
    keywords: ['talk to my partner', 'talk about condoms', 'communicate', 'bring up', 'conversation', 'tell my partner'],
    text:
      'Talking about sex and protection can feel awkward, but it shows you care about each other.\n\n• Choose a calm moment, not right before sex.\n• Use “I” statements: “I want us both to be safe, so I want to use condoms.”\n• Suggest testing together for HIV and STIs.\n• If your partner refuses to use protection or gets angry, that tells you something important about the relationship.\n\nYou are allowed to say “No condom, no sex.”',
    simple:
      'Talk to your partner when you are both calm. Say: “I want us to be safe.” You can say “no condom, no sex.”',
    followUps: ['How do I use a condom correctly?', 'How do I know if my relationship is healthy?'],
  },
  {
    id: 'relationships-wellbeing',
    topic: 'relationships',
    keywords: ['breakup', 'break up', 'heartbroken', 'sad', 'lonely', 'stress', 'anxious', 'depressed', 'cry'],
    text:
      'Breakups and relationship problems can hurt a lot, it’s okay to feel sad, angry or lost for a while.\n\n• Lean on friends and family you trust.\n• Keep up sleep, food, and activities you enjoy.\n• Give yourself time and avoid checking their social media.\n\nIf sadness lasts most days for more than two weeks, or you have thoughts of hurting yourself, please talk to a counselor or health worker, support works, and you deserve it.',
    simple:
      'It is okay to feel sad after a breakup. Talk to friends you trust, sleep and eat well. If you feel very sad for a long time, talk to a counselor.',
    followUps: ['Where can I talk to a counselor?', 'Is there a safe space for emotional support?'],
  },
]

export const COMMUNITY_HELP = {
  text:
    'Yes, you don’t have to go through this alone. In Safe Space you can join moderated peer groups, for example:\n\n• Young and expecting parents\n• Young people living with HIV\n• GBV survivors and people seeking safety\n• Menstrual and reproductive health\n• Healthy relationships and emotional wellbeing\n\nYou can take part anonymously, and trained moderators keep the groups safe.',
  simple: 'Yes. There are safe groups where you can talk with young people like you. You do not need to share your name.',
  followUps: ['How do I know if my relationship is healthy?', 'Where can I talk to a counselor?'],
}

export const GENERIC_HELP = {
  text:
    'I’m not sure I understood that fully, but I’m here to help. I can answer questions about:\n\n• Periods and puberty\n• Contraception and family planning\n• Pregnancy\n• STIs and HIV\n• Consent and relationships\n\nTry asking in your own words, for example “Is it normal that my period is late?”',
  simple: 'I can help with periods, puberty, family planning, pregnancy, HIV and relationships. Try asking another way.',
  followUps: ['Can you explain how periods work?', 'What contraception options are there?', 'How can I protect myself from STIs and HIV?'],
}
