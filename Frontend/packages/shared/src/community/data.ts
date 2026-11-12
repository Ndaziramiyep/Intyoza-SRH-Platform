import type { Community, Post } from './types'

export const RULES_VERSION = '2026-10'

export const COMMUNITY_RULES = [
  {
    title: 'Stay anonymous',
    text: 'Don’t share your full name, phone number, school, address or photos that could identify you, or anyone else.',
  },
  {
    title: 'Be kind, no judgement',
    text: 'No insults, shaming or judging people for their choices, HIV status, pregnancy, identity or experiences.',
  },
  {
    title: 'No harassment',
    text: 'No threats, sexual messages, or asking people to meet up or move to a private chat.',
  },
  {
    title: 'Share experiences, not prescriptions',
    text: 'Peer support is not medical advice. For medicines or diagnosis, see a health worker.',
  },
  {
    title: 'What’s shared here stays here',
    text: 'Don’t screenshot or repeat other people’s stories outside the group.',
  },
  {
    title: 'Report anyone in danger',
    text: 'If a post worries you, report it. Trained moderators can reach out and connect people with help.',
  },
]

export const COMMUNITIES: Community[] = [
  {
    id: 'expecting-parents',
    name: 'Young & Expecting Parents',
    tagline: 'Pregnancy, preparing for birth and what comes next',
    description:
      'A space for young people who are pregnant or whose partner is pregnant. Share how you are feeling, ask about antenatal visits and get support from others who have been there.',
    icon: 'heart',
    tone: 'accent',
    preModerated: false,
    sensitive: false,
    moderators: 'Trained peer educators and a midwife',
  },
  {
    id: 'young-mothers-fathers',
    name: 'Young Mothers & Young Fathers',
    tagline: 'Parenting while young, school, work, family and you',
    description:
      'For young mums and dads. Talk about balancing parenting with school or work, co-parenting, family reactions and taking care of yourself.',
    icon: 'users',
    tone: 'violet',
    preModerated: false,
    sensitive: false,
    moderators: 'Trained peer educators',
  },
  {
    id: 'parenting-childcare',
    name: 'Parenting & Childcare',
    tagline: 'Feeding, sleep, vaccines and everyday questions',
    description:
      'Practical support for raising a baby or young child, breastfeeding, sleep, vaccinations, development and finding childcare.',
    icon: 'heart',
    tone: 'sun',
    preModerated: false,
    sensitive: false,
    moderators: 'Peer educators and a community health worker',
  },
  {
    id: 'living-with-hiv',
    name: 'Young People Living with HIV',
    tagline: 'Treatment, disclosure, relationships and thriving',
    description:
      'A private, stigma-free group for young people living with HIV. Talk about treatment, telling people (or not), relationships and dreams for the future.',
    icon: 'shield',
    tone: 'brand',
    preModerated: true,
    sensitive: true,
    moderators: 'Trained peer supporters living with HIV and an HIV counsellor',
  },
  {
    id: 'gbv-survivors',
    name: 'Survivors & Safety',
    tagline: 'For survivors of violence and anyone seeking safety',
    description:
      'A protected space for people who have experienced sexual, physical or emotional violence, or who feel unsafe. You will be believed here. Every post is checked by a trained counsellor first.',
    icon: 'shield',
    tone: 'violet',
    preModerated: true,
    sensitive: true,
    moderators: 'Trained GBV counsellors',
  },
  {
    id: 'menstrual-reproductive',
    name: 'Periods & Reproductive Health',
    tagline: 'Periods, pain, products and body questions',
    description:
      'Talk openly about periods, cramps, pads and cups, irregular cycles and other reproductive health questions, no shame.',
    icon: 'clock',
    tone: 'accent',
    preModerated: false,
    sensitive: false,
    moderators: 'Trained peer educators and a nurse',
  },
  {
    id: 'relationships-wellbeing',
    name: 'Relationships & Wellbeing',
    tagline: 'Love, friendship, stress and feeling okay',
    description:
      'Talk about relationships, breakups, pressure, stress and looking after your mental health. Moderators can connect you with a counsellor.',
    icon: 'chat',
    tone: 'brand',
    preModerated: false,
    sensitive: false,
    moderators: 'Trained peer educators and a counsellor',
  },
]

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

const welcome = (communityId: string, text: string): Post => ({
  id: `welcome-${communityId}`,
  communityId,
  author: 'Moderator team',
  isModerator: true,
  text,
  createdAt: daysAgo(30),
  status: 'published',
  replies: [],
  support: 24,
})

// Example posts so the space doesn't feel empty in demos. Marked as examples in the UI.
export const SEED_POSTS: Post[] = [
  welcome(
    'expecting-parents',
    'Welcome! 💛 Whether you’re excited, scared or both, you belong here. Tip: start antenatal care as early as you can, it’s subsidised at health centers and helps you and your baby stay healthy.',
  ),
  {
    id: 'ex-expecting-1',
    communityId: 'expecting-parents',
    author: 'Gentle Sunbird 18',
    isExample: true,
    text: 'I’m 19 and 14 weeks pregnant. I was so scared to go for my first check-up but the midwife was kind. Did anyone else feel really tired in the first months?',
    createdAt: daysAgo(3),
    status: 'published',
    replies: [
      { id: 'r1', author: 'Brave Acacia 7', text: 'Yes!! I slept all the time. It got better around month 4 for me.', createdAt: daysAgo(2) },
      {
        id: 'r2',
        author: 'Moderator team',
        isModerator: true,
        text: 'Tiredness is very common early on. Make sure you’re taking the iron and folic acid from your ANC visits, it helps.',
        createdAt: daysAgo(2),
      },
    ],
    support: 12,
  },
  welcome(
    'young-mothers-fathers',
    'Welcome, young parents! Young fathers are just as welcome here as young mothers. Share wins, struggles and questions, no judgement.',
  ),
  {
    id: 'ex-parents-1',
    communityId: 'young-mothers-fathers',
    author: 'Steady River 33',
    isExample: true,
    text: 'Young dad here (20). I want to be involved but sometimes my baby’s mum’s family doesn’t let me visit. How do you handle that?',
    createdAt: daysAgo(5),
    status: 'published',
    replies: [
      {
        id: 'r3',
        author: 'Quiet Hill 12',
        text: 'Showing up consistently helped with my partner’s family. Even small things like bringing soap or nappies.',
        createdAt: daysAgo(4),
      },
    ],
    support: 9,
  },
  welcome('parenting-childcare', 'Welcome! Ask anything about caring for little ones. For a sick child, always visit a health center, we can help with everyday questions.'),
  welcome(
    'living-with-hiv',
    'Welcome. This is a safe, stigma-free space. Your HIV status is yours to share, or not. Posts are reviewed before they appear, to protect everyone’s privacy.',
  ),
  {
    id: 'ex-hiv-1',
    communityId: 'living-with-hiv',
    author: 'Bright Kestrel 5',
    isExample: true,
    text: 'Got my viral load result today: undetectable for a whole year 🎉 To anyone just starting ARVs, it gets easier to remember.',
    createdAt: daysAgo(1),
    status: 'published',
    replies: [],
    support: 31,
  },
  welcome(
    'gbv-survivors',
    'You are believed, and what happened is not your fault. Every post is reviewed by a counsellor before it appears. If you are in danger now, call 112, or 3512 for Isange One Stop Centre (free, 24/7).',
  ),
  welcome('menstrual-reproductive', 'Welcome! Periods are normal and nothing to be ashamed of. Ask anything.'),
  {
    id: 'ex-period-1',
    communityId: 'menstrual-reproductive',
    author: 'Calm Heron 42',
    isExample: true,
    text: 'What do you all do for cramps during exams? Mine are really bad on the first day.',
    createdAt: daysAgo(2),
    status: 'published',
    replies: [
      { id: 'r4', author: 'Kind Lily 9', text: 'Hot water bottle the night before + paracetamol from the pharmacy helps me.', createdAt: daysAgo(2) },
    ],
    support: 15,
  },
  welcome('relationships-wellbeing', 'Welcome! Relationships and feelings can be complicated. Be kind here, and reach out to a counsellor if you’re struggling.'),
]
