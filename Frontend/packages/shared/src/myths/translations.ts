import type { Lang } from '../i18n/translations'
import type { Myth } from './data'

type MythText = Pick<Myth, 'claim' | 'truth' | 'whyBelieved' | 'seekCare'> & {
  /** Words people use in this language when asking about the belief (for the search). */
  keywords: string[]
}

// Kinyarwanda and French versions of each myth in data.ts (English stays there).
// Health content: to be reviewed by native speakers and clinical advisors before launch.
export const MYTH_TEXT: Record<string, Partial<Record<Exclude<Lang, 'en'>, MythText>>> = {
  'first-time-pregnancy': {
    rw: {
      claim: 'Ntushobora gutwita ku nshuro ya mbere ukoze imibonano mpuzabitsina.',
      truth:
        'Gutwita bishobora kubaho igihe cyose intanga ngabo zihuye n’intanga ngore, harimo no ku nshuro ya mbere. Nta kintu na kimwe kirinda gutwita ku nshuro ya mbere.',
      whyBelieved:
        'Abantu benshi batekereza ko umubiri ugomba kubanza “kubimenyera”, cyangwa bakumva inkuru z’inshuti zitatwise. Icyo cyari amahirwe, si uburinzi.',
      seekCare:
        'Niba wakoze imibonano idakingiye, ibinini byo kuboneza urubyaro byihutirwa bikora neza iyo bifashwe vuba (mu masaha 72). Ipimishe inda niba imihango yawe yatinze.',
      keywords: ['inshuro ya mbere', 'bwa mbere', 'isugi', 'gutwita', 'inda'],
    },
    fr: {
      claim: 'On ne peut pas tomber enceinte la première fois qu’on a des rapports sexuels.',
      truth:
        'Une grossesse peut survenir dès que des spermatozoïdes rencontrent un ovule, y compris la toute première fois. Rien dans une première expérience ne protège d’une grossesse.',
      whyBelieved:
        'On pense souvent que le corps doit « s’habituer », ou on entend des amis qui ne sont pas tombées enceintes. C’était de la chance, pas une protection.',
      seekCare:
        'Après un rapport non protégé, la contraception d’urgence est plus efficace si elle est prise au plus vite (dans les 72 heures). Fais un test de grossesse si tes règles sont en retard.',
      keywords: ['première fois', 'vierge', 'enceinte', 'premier rapport'],
    },
  },
  'period-sex-pregnancy': {
    rw: {
      claim: 'Ntushobora gutwita ukoze imibonano mpuzabitsina uri mu mihango.',
      truth:
        'Ntibikunze kubaho, ariko birashoboka. Intanga ngabo zishobora kumara iminsi igera kuri 5 mu mubiri, kandi abafite ukwezi kugufi cyangwa kudahoraho bashobora kujya mu gihe cy’uburumbuke vuba nyuma y’imihango.',
      whyBelieved:
        'Gutwita mu gihe cy’imihango ntibikunze kubaho, bityo abantu bakabifata nk’ibidashoboka. Kuva amaraso hagati y’imihango ibiri na byo bishobora kwitiranywa n’imihango.',
      seekCare:
        'Niba udashaka gutwita, koresha uburyo bwo kuboneza urubyaro buri gihe. Umukozi w’ubuzima yagufasha guhitamo uburyo bukubereye.',
      keywords: ['imihango', 'mu mihango', 'gutwita', 'amaraso', 'inda'],
    },
    fr: {
      claim: 'On ne peut pas tomber enceinte en ayant des rapports pendant ses règles.',
      truth:
        'C’est moins probable, mais possible. Les spermatozoïdes peuvent survivre jusqu’à 5 jours dans le corps, et les personnes aux cycles courts ou irréguliers peuvent ovuler peu après la fin des règles.',
      whyBelieved:
        'Une grossesse est moins fréquente pendant les règles, alors on confond « moins probable » et « impossible ». Des saignements entre les règles peuvent aussi être pris pour des règles.',
      seekCare:
        'Si tu ne veux pas tomber enceinte, utilise une contraception à chaque fois. Un·e professionnel·le de santé peut t’aider à choisir.',
      keywords: ['règles', 'pendant les règles', 'enceinte', 'saignement'],
    },
  },
  'contraception-infertility': {
    rw: {
      claim: 'Uburyo bwo kuboneza urubyaro butera ubugumba.',
      truth:
        'Uburyo bugezweho bwo kuboneza urubyaro ntibutera ubugumba. Ubushobozi bwo kubyara bugaruka iyo ubihagaritse: vuba ku binini, agapira n’agapira ko mu mura, no mu mezi make (rimwe na rimwe hafi umwaka) nyuma y’urushinge.',
      whyBelieved:
        'Gutinda gusama nyuma yo guhagarika urushinge, no kuba hari abafite ibibazo byo kubyara bitewe n’izindi mpamvu, bituma abantu bashinja uburyo bwo kuboneza urubyaro.',
      seekCare:
        'Niba warahagaritse kuboneza urubyaro ukaba utarasama nyuma y’umwaka ugerageza, umukozi w’ubuzima yagusuzuma akareba izindi mpamvu.',
      keywords: ['kuboneza urubyaro', 'ubugumba', 'kutabyara', 'ibinini', 'urushinge', 'agapira'],
    },
    fr: {
      claim: 'Les contraceptifs rendent stérile.',
      truth:
        'Les contraceptifs modernes ne rendent pas stérile. La fertilité revient après l’arrêt : rapidement pour la pilule, l’implant et le stérilet, et en quelques mois (parfois jusqu’à environ un an) après l’injection.',
      whyBelieved:
        'Le délai après l’arrêt de l’injection, et le fait que certaines personnes ont des problèmes de fertilité pour d’autres raisons, font accuser la contraception.',
      seekCare:
        'Si tu as arrêté la contraception et n’es pas enceinte après un an d’essais, un·e professionnel·le de santé peut rechercher d’autres causes.',
      keywords: ['contraception', 'planning familial', 'stérile', 'infertilité', 'pilule', 'injection', 'implant'],
    },
  },
  'injection-weight': {
    rw: {
      claim: 'Urushinge rwo kuboneza urubyaro rutuma wiyongera ibiro.',
      truth:
        'Bamwe biyongera ibiro bike iyo bakoresha urushinge rw’amezi 3, ariko benshi ntibiyongera. Ubundi buryo nk’agapira, agapira ko mu mura cyangwa udukingirizo ntibujyanye no kwiyongera ibiro cyane.',
      whyBelieved:
        'Kwiyongera ibiro ni ingaruka ibaho koko kuri bamwe bakoresha urushinge, bityo bigafatwa nk’ibireba uburyo bwose n’abantu bose.',
      seekCare:
        'Niba ingaruka zikubangamira, vugana n’umukozi w’ubuzima ku guhindura uburyo. Ntuhagarike utabonye ubundi buryo.',
      keywords: ['urushinge', 'ibiro', 'kubyibuha', 'kwiyongera ibiro'],
    },
    fr: {
      claim: 'L’injection contraceptive fait grossir.',
      truth:
        'Certaines personnes prennent quelques kilos avec l’injection tous les 3 mois, mais beaucoup non. D’autres méthodes comme l’implant, le stérilet ou les préservatifs ne sont pas liées à une prise de poids importante.',
      whyBelieved:
        'La prise de poids est un vrai effet secondaire pour certaines utilisatrices de l’injection, alors on la généralise à toutes les méthodes et à tout le monde.',
      seekCare:
        'Si les effets secondaires te gênent, parle à un·e professionnel·le de santé pour changer de méthode, sans arrêter sans en avoir une autre.',
      keywords: ['injection', 'depo', 'poids', 'grossir', 'prise de poids'],
    },
  },
  'withdrawal-reliable': {
    rw: {
      claim: 'Gusohorera hanze ni uburyo bwizewe bwo kwirinda gutwita.',
      truth:
        'Gusohorera hanze akenshi binanirwa: hafi umwe muri batanu mu bashakanye babikoresha batwita mu mwaka umwe. Amazi abanziriza intanga ashobora kuba arimo intanga, kandi kubikora ku gihe biragoye. Nta n’ubwo birinda indwara zandurira mu mibonano mpuzabitsina cyangwa virusi itera SIDA.',
      whyBelieved:
        'Ni ubuntu, ntibisaba kujya kwa muganga, kandi rimwe na rimwe “bikora” ku bw’amahirwe, bityo bigasa n’ibyizewe kuruta uko biri.',
      seekCare: 'Baza umukozi w’ubuzima ibyerekeye udukingirizo tw’ubuntu n’ubundi buryo bwizewe.',
      keywords: ['gusohorera hanze', 'kwiyaka', 'gukuramo mbere', 'hanze'],
    },
    fr: {
      claim: 'Se retirer avant l’éjaculation est un moyen fiable d’éviter une grossesse.',
      truth:
        'Le retrait échoue souvent : environ 1 couple sur 5 qui l’utilise a une grossesse en un an. Le liquide pré-éjaculatoire peut contenir des spermatozoïdes, et le bon moment est difficile à tenir. Il ne protège pas non plus des IST ni du VIH.',
      whyBelieved:
        'C’est gratuit, sans visite au centre de santé, et ça « marche » parfois par chance, alors ça paraît plus sûr que ça ne l’est.',
      seekCare: 'Demande à un·e professionnel·le de santé des préservatifs gratuits et d’autres méthodes fiables.',
      keywords: ['retrait', 'se retirer', 'éjaculer dehors', 'coït interrompu'],
    },
  },
  'ec-abortion': {
    rw: {
      claim: 'Ibinini byo kuboneza urubyaro byihutirwa bikuramo inda.',
      truth:
        'Ibinini byo kuboneza urubyaro byihutirwa bikora cyane cyane bitinza igihe cy’uburumbuke, bityo inda ntitangire. Ntibikuramo inda isanzwe ihari kandi ntibiyangiza.',
      whyBelieved:
        'Kubera ko bifatwa nyuma y’imibonano, abantu batekereza ko bikora nk’imiti ikuramo inda. Ni imiti itandukanye.',
      seekCare:
        'Fata ibinini byihutirwa vuba bishoboka nyuma y’imibonano idakingiye. Niba nyuma yaho imihango yawe itinze icyumweru kirenga, ipimishe inda.',
      keywords: ['byihutirwa', 'postinor', 'gukuramo inda', 'ibinini byo ku munsi ukurikira'],
    },
    fr: {
      claim: 'La contraception d’urgence provoque un avortement.',
      truth:
        'La pilule du lendemain agit surtout en retardant l’ovulation, donc la grossesse ne commence pas. Elle n’interrompt pas une grossesse existante et ne lui fait pas de mal.',
      whyBelieved:
        'Comme elle se prend après le rapport, on suppose qu’elle agit comme une pilule abortive. Ce sont des médicaments différents.',
      seekCare:
        'Prends la contraception d’urgence au plus vite après un rapport non protégé. Si tes règles ont plus d’une semaine de retard ensuite, fais un test de grossesse.',
      keywords: ['urgence', 'pilule du lendemain', 'postinor', 'avortement'],
    },
  },
  'washing-after-sex': {
    rw: {
      claim: 'Kwiyuhagira cyangwa kunyara nyuma y’imibonano birinda gutwita n’indwara zandurira mu mibonano mpuzabitsina.',
      truth:
        'Intanga ngabo zigera muri nyababyeyi mu minota mike, bityo kwiyuhagira cyangwa kunyara ntibibuza gutwita. Nta na kimwe kirinda indwara zandurira mu mibonano mpuzabitsina cyangwa virusi itera SIDA. Koza imbere mu gitsina bishobora no kongera indwara.',
      whyBelieved:
        'Bisa n’ibyumvikana ko “gusukura” byakuraho intanga cyangwa mikorobe, ariko si ko umubiri ukora.',
      seekCare:
        'Nyuma y’imibonano idakingiye, tekereza ku binini byihutirwa kandi, niba wanduye virusi itera SIDA bishoboka, imiti ya PEP mu masaha 72.',
      keywords: ['kwiyuhagira', 'koga', 'kunyara', 'gusukura', 'nyuma y’imibonano'],
    },
    fr: {
      claim: 'Se laver ou uriner après un rapport empêche la grossesse et les IST.',
      truth:
        'Les spermatozoïdes atteignent l’utérus en quelques minutes : se laver ou uriner ne peut pas empêcher une grossesse. Ni l’un ni l’autre ne protège des IST ou du VIH. Se laver l’intérieur du vagin peut même augmenter les infections.',
      whyBelieved:
        'Il paraît logique que « nettoyer » enlève les spermatozoïdes ou les microbes, mais le corps ne fonctionne pas ainsi.',
      seekCare:
        'Après un rapport non protégé, pense à la contraception d’urgence et, si une exposition au VIH est possible, à la PEP dans les 72 heures.',
      keywords: ['se laver', 'laver', 'uriner', 'après le rapport', 'douche vaginale'],
    },
  },
  'see-hiv': {
    rw: {
      claim: 'Ushobora kumenya ko umuntu afite virusi itera SIDA cyangwa indwara yandurira mu mibonano mpuzabitsina umurebye gusa.',
      truth:
        'Abenshi bafite virusi itera SIDA cyangwa indwara yandurira mu mibonano mpuzabitsina basa kandi biyumva bafite ubuzima bwiza, rimwe na rimwe imyaka myinshi. Uburyo bwonyine bwo kumenya ni ukwipimisha.',
      whyBelieved:
        'Amashusho ya kera y’abarwayi barembye cyane ba SIDA, mbere y’uko imiti iboneka hose, aracyagira uruhare mu buryo abantu batekereza virusi itera SIDA.',
      seekCare:
        'Ipimishe: ni ubuntu kandi ni ibanga mu bigo nderabuzima bya Leta. Mwipimishe muri kumwe n’umukunzi mushya.',
      keywords: ['kureba', 'umurebye', 'kumenya', 'asa neza'],
    },
    fr: {
      claim: 'On peut savoir si quelqu’un a le VIH ou une IST en le regardant.',
      truth:
        'La plupart des personnes vivant avec le VIH ou une IST ont l’air et se sentent en pleine santé, parfois pendant des années. Le seul moyen de savoir est de se faire dépister.',
      whyBelieved:
        'Les anciennes images de personnes très malades du sida, d’avant l’accès large au traitement, influencent encore la façon dont on imagine le VIH.',
      seekCare:
        'Fais-toi dépister : c’est gratuit et confidentiel dans les centres de santé publics. Faites le test ensemble avec un nouveau partenaire.',
      keywords: ['regarder', 'voir', 'a l’air', 'vih', 'ist'],
    },
  },
  'hiv-casual-contact': {
    rw: {
      claim: 'Virusi itera SIDA yandurira mu mibu, guhoberana cyangwa gusangira ibiryo.',
      truth:
        'Virusi itera SIDA yandurira mu matembabuzi amwe y’umubiri: cyane cyane mu mibonano mpuzabitsina idakingiye, gusangira inshinge, no ku mubyeyi ayanduza umwana. Ntiyandurira mu mibu, guhoberana, gusomana, gusangira ibiryo, ibikombe cyangwa ubwiherero.',
      whyBelieved: 'Ubwoba n’akato, no kuyitiranya n’indwara nka malariya ikwirakwizwa n’imibu.',
      seekCare:
        'Niba uhangayikishijwe n’uko wanduye koko (nk’imibonano idakingiye), ipimishe kandi ubaze ibijyanye na PEP mu masaha 72.',
      keywords: ['umubu', 'mibu', 'guhoberana', 'gusomana', 'gusangira', 'ibiryo', 'ubwiherero'],
    },
    fr: {
      claim: 'Le VIH se transmet par les moustiques, les câlins ou le partage de nourriture.',
      truth:
        'Le VIH se transmet par certains liquides du corps : surtout lors de rapports non protégés, par le partage d’aiguilles, et du parent au bébé. Il ne se transmet pas par les moustiques, les câlins, les baisers, la nourriture, les verres ou les toilettes.',
      whyBelieved: 'La peur et la stigmatisation, et la confusion avec des maladies comme le paludisme, que les moustiques transmettent.',
      seekCare:
        'Si tu crains une vraie exposition (comme un rapport non protégé), fais-toi dépister et demande la PEP dans les 72 heures.',
      keywords: ['moustique', 'câlin', 'bisou', 'baiser', 'nourriture', 'verre', 'toilettes'],
    },
  },
  'hiv-negative-babies': {
    rw: {
      claim: 'Abantu babana na virusi itera SIDA ntibashobora kubyara abana batayifite.',
      truth:
        'Iyo umubyeyi afata imiti igabanya ubukana bwa virusi itera SIDA (ARV) mu gihe cyo gutwita no konsa, umwana agapimwa kandi akitabwaho, amahirwe yo kwanduza umwana ni make cyane. Ababyeyi benshi babana na virusi itera SIDA bafite abana batayifite.',
      whyBelieved: 'Mbere y’uko imiti iboneka, kwanduza abana byari bikunze kubaho cyane.',
      seekCare:
        'Niba ubana na virusi itera SIDA ukaba utwite cyangwa uteganya gutwita, tangira kwisuzumisha inda hakiri kare kandi ukomeze gufata ARV.',
      keywords: ['umwana', 'abana', 'kubyara', 'gutwita', 'umubyeyi ku mwana'],
    },
    fr: {
      claim: 'Les personnes vivant avec le VIH ne peuvent pas avoir de bébés séronégatifs.',
      truth:
        'Avec un traitement ARV pendant la grossesse et l’allaitement, et un dépistage et un suivi du bébé, le risque de transmettre le VIH au bébé est très faible. Beaucoup de parents vivant avec le VIH ont des enfants séronégatifs.',
      whyBelieved: 'Avant l’accès au traitement, la transmission aux bébés était bien plus fréquente.',
      seekCare:
        'Si tu vis avec le VIH et es enceinte ou prévois une grossesse, commence tôt les consultations prénatales et continue tes ARV.',
      keywords: ['bébé', 'enfants', 'enceinte', 'mère-enfant'],
    },
  },
  'herbs-cure-hiv': {
    rw: {
      claim: 'Imiti gakondo cyangwa amasengesho bishobora gukiza virusi itera SIDA.',
      truth:
        'Nta muti ukiza virusi itera SIDA uraboneka. Imiti ya ARV igenzura virusi neza cyane kandi ituma abantu babaho igihe kirekire bafite ubuzima bwiza. Kureka ARV ukoresha indi miti bituma virusi igaruka kandi bishobora gutuma imiti itagikora.',
      whyBelieved: 'Abafata ARV biyumva neza bakaba bashobora gutekereza ko bakize; bamwe mu bacuruzi batanga amasezerano y’ibinyoma.',
      seekCare: 'Komeza gufata ARV buri munsi. Vugana n’ivuriro rikurikirana virusi itera SIDA mbere yo gukoresha undi muti.',
      keywords: ['imiti gakondo', 'gakondo', 'gukira', 'gukiza', 'amasengesho', 'umuvuzi'],
    },
    fr: {
      claim: 'Les plantes médicinales ou la prière peuvent guérir le VIH.',
      truth:
        'Il n’existe pas encore de remède contre le VIH. Le traitement ARV contrôle très bien le virus et permet de vivre longtemps et en bonne santé. Arrêter les ARV pour d’autres remèdes laisse le virus revenir et peut créer une résistance.',
      whyBelieved: 'Les personnes sous ARV se sentent bien et peuvent se croire guéries ; certains vendeurs font de fausses promesses.',
      seekCare: 'Continue tes ARV chaque jour. Parle à ta clinique VIH avant tout autre remède.',
      keywords: ['plantes', 'traditionnel', 'guérir', 'prière', 'guérisseur'],
    },
  },
  'condoms-holes': {
    rw: {
      claim: 'Udukingirizo dufite utwobo duto tunyuramo virusi itera SIDA.',
      truth:
        'Udukingirizo twasuzumwe ubuziranenge ntitugira utwobo tunyuramo virusi itera SIDA cyangwa intanga. Iyo dukoreshejwe neza buri gihe, turinda cyane virusi itera SIDA, indwara nyinshi zandurira mu mibonano mpuzabitsina no gutwita.',
      whyBelieved: 'Rimwe na rimwe agakingirizo karacika cyangwa kagakoreshwa nabi, bigafatwa nk’aho gafite “utwobo”.',
      seekCare: 'Niba agakingirizo gacitse, baza ibijyanye n’ibinini byihutirwa na PEP vuba bishoboka (mu masaha 72).',
      keywords: ['agakingirizo', 'udukingirizo', 'utwobo', 'kunyuramo', 'kurinda'],
    },
    fr: {
      claim: 'Les préservatifs ont de minuscules trous qui laissent passer le VIH.',
      truth:
        'Les préservatifs testés n’ont pas de trous qui laissent passer le VIH ou les spermatozoïdes. Bien utilisés à chaque fois, ils protègent très bien du VIH, de nombreuses IST et de la grossesse.',
      whyBelieved: 'Un préservatif échoue parfois parce qu’il se déchire ou est mal utilisé, ce dont on se souvient comme de « trous ».',
      seekCare: 'Si un préservatif se déchire, demande au plus vite la contraception d’urgence et la PEP (dans les 72 heures).',
      keywords: ['préservatif', 'capote', 'trous', 'passer'],
    },
  },
  'two-condoms': {
    rw: {
      claim: 'Gukoresha udukingirizo tubiri icyarimwe birinda kurushaho.',
      truth:
        'Udukingirizo tubiri turakuranya kandi tugacika byoroshye. Agakingirizo kamwe gakoreshejwe neza ni ko kizewe kurusha ibindi.',
      whyBelieved: 'Bisa n’ibyumvikana ko ibice bibiri byarinda kurushaho.',
      seekCare: 'Baza umukozi w’ubuzima cyangwa urebe videwo yacu ku buryo bwo gukoresha agakingirizo kugira ngo umenye intambwe nyazo.',
      keywords: ['udukingirizo tubiri', 'tubiri', 'kabiri'],
    },
    fr: {
      claim: 'Mettre deux préservatifs à la fois protège davantage.',
      truth:
        'Deux préservatifs frottent l’un contre l’autre et se déchirent plus facilement. Un seul préservatif, bien utilisé, est le choix le plus sûr.',
      whyBelieved: 'Il paraît logique que deux couches protègent mieux.',
      seekCare: 'Demande à un·e professionnel·le de santé ou regarde notre vidéo sur le préservatif pour apprendre les bonnes étapes.',
      keywords: ['deux préservatifs', 'double préservatif', 'deux capotes'],
    },
  },
  'many-partners-sti': {
    rw: {
      claim: 'Abafite abakunzi benshi ni bo bonyine bandura indwara zandurira mu mibonano mpuzabitsina.',
      truth:
        'Umuntu wese ukora imibonano mpuzabitsina ashobora kwandura, n’iyo yaba afite umukunzi umwe gusa, niba uwo mukunzi afite ubwandu. Indwara nyinshi zandurira mu mibonano mpuzabitsina nta bimenyetso zigira, bityo umukunzi ashobora kutabimenya.',
      whyBelieved: 'Akato gahuza izi ndwara n’“imyitwarire mibi”, bigatuma abantu bumva bari mu mutekano bakirinda kwipimisha.',
      seekCare:
        'Mwipimishe na buri mukunzi mushya, kandi wisuzumishe niba ubonye ibisohoka mu gitsina, ibisebe cyangwa kokerwa iyo unyara.',
      keywords: ['abakunzi benshi', 'umukunzi umwe', 'kwizerana', 'indwara zandurira'],
    },
    fr: {
      claim: 'Seules les personnes qui ont beaucoup de partenaires attrapent des IST.',
      truth:
        'Toute personne qui a des rapports peut attraper une IST, même avec un seul partenaire, si ce partenaire est infecté. Beaucoup d’IST ne donnent aucun symptôme, donc un partenaire peut ne pas le savoir.',
      whyBelieved: 'La stigmatisation associe les IST à une « mauvaise conduite », ce qui donne un faux sentiment de sécurité et éloigne du dépistage.',
      seekCare:
        'Faites un dépistage à chaque nouveau partenaire, et consulte si tu remarques des pertes, des plaies ou une brûlure en urinant.',
      keywords: ['beaucoup de partenaires', 'un seul partenaire', 'fidèle', 'ist'],
    },
  },
  'period-dirty': {
    rw: {
      claim: 'Ntugomba koga cyangwa gukora siporo uri mu mihango.',
      truth:
        'Koga uri mu mihango bigufasha kugira isuku no kumererwa neza, kandi siporo ishobora kugabanya ububabare. Amaraso y’imihango si umwanda kandi nta ngaruka mbi agira.',
      whyBelieved: 'Kirazira n’isoni bijyanye n’imihango byagiye bihererekanywa mu bisekuru byinshi.',
      seekCare: 'Jya kwa muganga niba ububabare bw’imihango bukubuza gukora imirimo ya buri munsi.',
      keywords: ['koga', 'kwiyuhagira', 'siporo', 'imihango', 'umwanda', 'kirazira'],
    },
    fr: {
      claim: 'Il ne faut pas se laver ni faire du sport pendant ses règles.',
      truth:
        'Se laver pendant les règles garde propre et à l’aise, et le sport peut soulager les crampes. Le sang des règles n’est ni sale ni dangereux.',
      whyBelieved: 'Les tabous culturels et la honte autour des règles se transmettent depuis des générations.',
      seekCare: 'Consulte si les douleurs de règles t’empêchent de faire tes activités quotidiennes.',
      keywords: ['se laver', 'douche', 'sport', 'règles', 'sale', 'impur'],
    },
  },
  'irregular-infertile': {
    rw: {
      claim: 'Imihango idahoraho bivuze ko udashobora kubyara.',
      truth:
        'Imihango idahoraho irasanzwe cyane, cyane cyane mu myaka ya mbere nyuma yo gutangira kujya mu mihango, kandi abenshi bafite imihango idahoraho bashobora kubyara. Rimwe na rimwe imihango idahoraho iterwa n’impamvu ivurwa.',
      whyBelieved: 'Imihango n’ubushobozi bwo kubyara birajyana, bityo impinduka iyo ari yo yose ishobora gutera impungenge.',
      seekCare: 'Jya kwa muganga niba imihango ihagaze amezi 3 (kandi udatwite) cyangwa niba ufite imyaka 15 ukaba utaratangira kujya mu mihango.',
      keywords: ['idahoraho', 'imihango', 'kubyara', 'ubugumba', 'yatinze'],
    },
    fr: {
      claim: 'Des règles irrégulières veulent dire qu’on ne pourra pas avoir d’enfants.',
      truth:
        'Les règles irrégulières sont très fréquentes, surtout dans les premières années, et la plupart des personnes aux cycles irréguliers peuvent avoir des enfants. Parfois, elles ont une cause qui se soigne.',
      whyBelieved: 'Règles et fertilité sont liées, alors tout changement peut inquiéter.',
      seekCare: 'Consulte si tes règles s’arrêtent 3 mois (sans grossesse) ou si tu as 15 ans et ne les as pas encore eues.',
      keywords: ['irrégulières', 'règles', 'enfants', 'stérile', 'retard'],
    },
  },
  'masturbation-harm': {
    rw: {
      claim: 'Kwikinisha bitera ubugumba cyangwa uburwayi.',
      truth: 'Kwikinisha birasanzwe kandi ntibitera ubugumba, ubuhumyi, ibisazi cyangwa ubundi burwayi.',
      whyBelieved: 'Izi nkuru zakoreshejwe mu bisekuru byinshi kugira ngo abantu babireke, kandi isoni zatumaga batabaza.',
      seekCare: 'Ukeneye umukozi w’ubuzima gusa niba ufite ububabare, ibisebe cyangwa ibindi bimenyetso bidasanzwe.',
      keywords: ['kwikinisha', 'ubugumba', 'ubuhumyi', 'ibisazi'],
    },
    fr: {
      claim: 'La masturbation rend stérile ou malade.',
      truth: 'La masturbation est courante et ne rend ni stérile, ni aveugle, ni fou, et ne cause pas d’autre maladie.',
      whyBelieved: 'Ces histoires ont servi pendant des générations à la décourager, et la honte empêchait de poser des questions.',
      seekCare: 'Tu n’as besoin de consulter qu’en cas de douleur, de plaies ou d’autres symptômes inhabituels.',
      keywords: ['masturbation', 'se masturber', 'stérile', 'aveugle', 'fou'],
    },
  },
  'virginity-bleeding': {
    rw: {
      claim: 'Iyo umuntu atavuye amaraso ku nshuro ya mbere akoze imibonano mpuzabitsina, ntiyari isugi.',
      truth:
        'Abantu benshi ntibava amaraso ku nshuro ya mbere. Akarangabusugi ni akanyama koroshye kandi kagororoka, gatandukana cyane ku bantu, kandi gashobora kwaguka mu mirimo ya buri munsi. Nta “kizamini cy’ubusugi” cyizewe kibaho.',
      whyBelieved: 'Imyumvire ya kera ivuga ko akarangabusugi ari nk’ingufuri yagiye isubirwamo nta gihamya.',
      seekCare: 'Ububabare cyangwa kuva amaraso menshi mu gihe cy’imibonano ni byiza kubisuzumisha ku mukozi w’ubuzima.',
      keywords: ['isugi', 'ubusugi', 'kuva amaraso', 'akarangabusugi', 'inshuro ya mbere'],
    },
    fr: {
      claim: 'Si quelqu’un ne saigne pas la première fois, ce n’était pas sa première fois.',
      truth:
        'Beaucoup de personnes ne saignent pas la première fois. L’hymen est un tissu fin et souple, très différent d’une personne à l’autre, qui peut s’étirer lors d’activités quotidiennes. Il n’existe pas de « test de virginité » fiable.',
      whyBelieved: 'De vieilles croyances sur l’hymen comme un « sceau » ont été répétées sans preuve.',
      seekCare: 'Une douleur ou un saignement important pendant un rapport mérite une consultation.',
      keywords: ['vierge', 'virginité', 'saigner', 'hymen', 'première fois'],
    },
  },
  'partner-rape': {
    rw: {
      claim: 'Umukunzi cyangwa uwo mwashakanye ntashobora gufata ku ngufu mugenzi we.',
      truth:
        'Kuba mu rukundo cyangwa mwarashakanye ntibivuze ko wemeye buri gihe. Guhatira cyangwa gushyira igitutu ku mukunzi ngo mukore imibonano ni ihohoterwa rishingiye ku gitsina.',
      whyBelieved: 'Bamwe batekereza ko urukundo cyangwa inkwano bitegeka umuntu gukora imibonano mpuzabitsina.',
      seekCare:
        'Niba umukunzi wawe yaguhatiye, si ikosa ryawe. Shaka ubuvuzi mu masaha 72 niba bishoboka, kandi uhamagare Isange One Stop Centre kuri 3512 (ku buntu).',
      keywords: ['umukunzi', 'umugabo', 'umugore', 'twashakanye', 'gufata ku ngufu', 'guhatira', 'inkwano'],
    },
    fr: {
      claim: 'Un petit ami, une petite amie ou un époux ne peut pas violer son partenaire.',
      truth:
        'Être en couple ou marié ne veut jamais dire consentement automatique. Forcer ou faire pression sur un partenaire pour avoir un rapport est une violence sexuelle.',
      whyBelieved: 'Certains croient qu’une relation ou la dot crée une obligation d’avoir des rapports.',
      seekCare:
        'Si un partenaire t’a forcé·e, ce n’est pas ta faute. Fais-toi soigner dans les 72 heures si possible, et appelle Isange One Stop Centre au 3512 (gratuit).',
      keywords: ['partenaire', 'copain', 'copine', 'mari', 'femme', 'marié', 'viol', 'forcer', 'dot'],
    },
  },
  'breastfeeding-contraception': {
    rw: {
      claim: 'Konsa birinda gutwita buri gihe.',
      truth:
        'Konsa birinda neza gusa iyo ibi bintu bitatu byose biri ukuri: umwana wawe afite munsi y’amezi 6, umwonsa amashereka gusa ku manywa na nijoro, kandi imihango yawe ntiragaruka. Bitabaye ibyo, ushobora kongera gutwita.',
      whyBelieved: 'Konsa bitinza koko ubushobozi bwo gusama kuri benshi, bityo ibisabwa bikibagirana.',
      seekCare: 'Mu gusuzumwa nyuma yo kubyara, baza uburyo bwo kuboneza urubyaro butagira ingaruka ku konsa.',
      keywords: ['konsa', 'amashereka', 'nyuma yo kubyara', 'kongera gutwita'],
    },
    fr: {
      claim: 'L’allaitement empêche toujours une grossesse.',
      truth:
        'L’allaitement protège de façon fiable seulement si les trois conditions sont réunies : ton bébé a moins de 6 mois, tu ne lui donnes que le sein jour et nuit, et tes règles ne sont pas revenues. Sinon, tu peux retomber enceinte.',
      whyBelieved: 'L’allaitement retarde vraiment la fertilité chez beaucoup de personnes, alors on oublie les conditions.',
      seekCare: 'À la visite post-natale, demande une contraception compatible avec l’allaitement.',
      keywords: ['allaitement', 'allaiter', 'après l’accouchement', 'post-partum', 'retomber enceinte'],
    },
  },
}

/** The myth in the reader's language; English text where no translation exists. */
export function localizeMyth(myth: Myth, lang: Lang): Myth {
  const text = lang === 'en' ? undefined : MYTH_TEXT[myth.id]?.[lang]
  return text ? { ...myth, claim: text.claim, truth: text.truth, whyBelieved: text.whyBelieved, seekCare: text.seekCare } : myth
}
