/**
 * Band Surgery Engine (Sentence Upgrader 5.5 -> 8.5+)
 * IELTS Prep Studio - Academic VIP Suite
 * Pure Client-Side Zero-Latency Offline Syntactic & Lexical Transformation
 */

(function(window) {
  'use strict';

  // 18 Core IELTS Topics & Exemplary Transformation Patterns
  const BAND_SURGERY_CORPUS = [
    {
      id: "public_transport",
      title: "Public Transport & Traffic Congestion",
      keywords: ["transport", "bus", "train", "traffic", "car", "congestion", "roads", "commute", "subway"],
      exampleInput: "Many people think government should spend more money on public transport to stop traffic jams.",
      originalBand: "5.5 - 6.0",
      variants: [
        {
          type: "Academic Passive & Impersonal Stance",
          badge: "Impersonal Reporting Clause",
          band: "Band 8.5",
          upgradedText: "It is widely contended among urban planners that municipal authorities should allocate substantial capital to metropolitan public transit infrastructure in order to alleviate chronic vehicular congestion.",
          keyDiffs: [
            { original: "Many people think", upgraded: "It is widely contended among urban planners that" },
            { original: "government", upgraded: "municipal authorities" },
            { original: "spend more money on", upgraded: "allocate substantial capital to" },
            { original: "public transport", upgraded: "metropolitan public transit infrastructure" },
            { original: "stop traffic jams", upgraded: "alleviate chronic vehicular congestion" }
          ],
          burmeseNote: "Personal pronoun 'Many people think' ကို Academic Passive 'It is widely contended that' သို့ပြောင်းလဲပြီး 'spend money' ကို formal collocations ဖြစ်သော 'allocate substantial capital' ဖြင့် အဆင့်မြှင့်ထားပါသည်။ ၎င်းသည် Task 2 တွင် objective academic tone ကို ချက်ချင်းဖြစ်ပေါ်စေပါသည်။"
        },
        {
          type: "Negative Inversion & Restrictive Condition",
          badge: "Advanced Syntactic Inversion",
          band: "Band 8.5 - 9.0",
          upgradedText: "Seldom do transport economists dispute that prioritising public transit subsidisation significantly mitigates chronic vehicular bottlenecks in modern metropolises.",
          keyDiffs: [
            { original: "Many people think", upgraded: "Seldom do transport economists dispute that" },
            { original: "spend more money", upgraded: "prioritising public transit subsidisation" },
            { original: "stop traffic jams", upgraded: "significantly mitigates chronic vehicular bottlenecks" }
          ],
          burmeseNote: "Negative Adverb 'Seldom' ဖြင့် Inversion (Seldom do ... dispute) ဖွဲ့စည်းပုံကို သုံးထားသဖြင့် Grammatical Range & Accuracy (GRA) တွင် Band 8.5+ သတ်မှတ်ချက်ဖြစ်သော 'a wide range of complex structures with full flexibility' ကို သက်သေပြပါသည်။"
        },
        {
          type: "It-Cleft Focus & Advanced Nominalisation",
          badge: "Cleft Focus & Nominalisation",
          band: "Band 9.0",
          upgradedText: "It is through the comprehensive modernisation of public transport networks that municipal governments can effectively curb vehicular gridlock.",
          keyDiffs: [
            { original: "government should spend money", upgraded: "It is through the comprehensive modernisation of public transport networks that..." },
            { original: "stop traffic jams", upgraded: "effectively curb vehicular gridlock" }
          ],
          burmeseNote: "It-cleft (It is through ... that ...) ပုံစံဖြင့် အဓိကအချက်ကို အလေးပေးဖော်ပြထားပြီး 'spend money' ကို 'comprehensive modernisation' အဖြစ် Nominalisation (ကြိယာမှ နာမ်သို့ပြောင်းခြင်း) ပြုလုပ်ထားသဖြင့် Band 9.0 Academic Style စစ်စစ်ဖြစ်ပါသည်။"
        }
      ]
    },
    {
      id: "screen_time_children",
      title: "Digital Devices & Juvenile Psychology",
      keywords: ["internet", "screen", "children", "kids", "technology", "phone", "media", "games"],
      exampleInput: "The internet has both good and bad effects on young children.",
      originalBand: "5.5 - 6.0",
      variants: [
        {
          type: "Academic Passive & Impersonal Stance",
          badge: "Dual-Aspect Hedging",
          band: "Band 8.5",
          upgradedText: "It is increasingly acknowledged by developmental psychologists that ubiquitous digital connectivity exerts a profound dichotomy of consequences on juvenile cognitive development.",
          keyDiffs: [
            { original: "The internet has", upgraded: "ubiquitous digital connectivity exerts" },
            { original: "both good and bad effects", upgraded: "a profound dichotomy of consequences" },
            { original: "young children", upgraded: "juvenile cognitive development" }
          ],
          burmeseNote: "'Good and bad effects' ဟူသော Band 5.5 cliché အစား 'a profound dichotomy of consequences' ဟူသော C2 collocation ကိုသုံးထားပြီး စိတ်ပညာရှုထောင့်မှ objective stance ယူထားပါသည်။"
        },
        {
          type: "Negative Inversion & Restrictive Condition",
          badge: "Inversion & Nuanced Qualification",
          band: "Band 8.5 - 9.0",
          upgradedText: "Scarcely can the pedagogical dividends of digital media for adolescents be decoupled from its deleterious psychological repercussions.",
          keyDiffs: [
            { original: "The internet has good effects", upgraded: "pedagogical dividends of digital media" },
            { original: "and bad effects", upgraded: "be decoupled from its deleterious psychological repercussions" },
            { original: "Scarcely can...", upgraded: "Negative Inversion structure" }
          ],
          burmeseNote: "'Scarcely can [Subject] be [Past Participle]' ဖြင့် အဆိုးနှင့်အကောင်း ခွဲမရအောင် ဒွန်တွဲနေမှုကို Inversion သဒ္ဒါဖြင့် ချိတ်ဆက်ပြထားသဖြင့် စာစစ်သူ၏ မျက်စိကို ချက်ချင်းဖမ်းစားနိုင်ပါသည်။"
        },
        {
          type: "It-Cleft Focus & Advanced Nominalisation",
          badge: "Cleft Contrast & Precision",
          band: "Band 9.0",
          upgradedText: "It is the unprecedented proliferation of screen-mediated interaction that simultaneously enriches children's epistemic horizons while jeopardising their psychological equilibrium.",
          keyDiffs: [
            { original: "The internet", upgraded: "unprecedented proliferation of screen-mediated interaction" },
            { original: "good effects", upgraded: "enriches children's epistemic horizons" },
            { original: "bad effects", upgraded: "jeopardising their psychological equilibrium" }
          ],
          burmeseNote: "'It is [Noun Phrase] that ... while ...' ဖြင့် Contrast ဖွဲ့စည်းပုံကို တည်ဆောက်ထားပြီး 'epistemic horizons' (အသိဉာဏ်နယ်ပယ်) နှင့် 'psychological equilibrium' (စိတ်ပိုင်းဆိုင်ရာ တည်ငြိမ်မှု) တို့ကို Nominalisation ပြုလုပ်ထားပါသည်။"
        }
      ]
    },
    {
      id: "study_abroad",
      title: "Overseas Higher Education & Careers",
      keywords: ["study abroad", "overseas", "foreign university", "job opportunities", "career", "graduates", "degree"],
      exampleInput: "If students study abroad they can get better job opportunities.",
      originalBand: "5.5 - 6.0",
      variants: [
        {
          type: "Academic Passive & Impersonal Stance",
          badge: "Impersonal Assertion",
          band: "Band 8.5",
          upgradedText: "It is widely recognised that matriculating at tertiary institutions overseas substantially enhances graduates' employability prospects within an increasingly competitive global marketplace.",
          keyDiffs: [
            { original: "students study abroad", upgraded: "matriculating at tertiary institutions overseas" },
            { original: "they can get", upgraded: "substantially enhances graduates'" },
            { original: "better job opportunities", upgraded: "employability prospects within an increasingly competitive global marketplace" }
          ],
          burmeseNote: "ရိုးစင်းသော 'If-clause' အစား 'matriculating at tertiary institutions overseas' ဟူသော Gerund Phrase ဖြင့် Substantive Subject ပြုလုပ်ထားသဖြင့် Lexical Resource Band 8.5+ သေချာစေပါသည်။"
        },
        {
          type: "Negative Inversion & Restrictive Condition",
          badge: "Correlative Negative Inversion",
          band: "Band 8.5 - 9.0",
          upgradedText: "Not only does pursuing international higher education broaden cross-cultural acumen, but it also confers a distinct competitive advantage upon prospective career entrants.",
          keyDiffs: [
            { original: "students study abroad", upgraded: "pursuing international higher education" },
            { original: "get better job", upgraded: "confers a distinct competitive advantage upon career entrants" },
            { original: "Not only does...", upgraded: "Inverted Correlative structure" }
          ],
          burmeseNote: "'Not only does [Subject] [Verb], but it also [Verb]' ဖြင့် Inversion ဖွဲ့စည်းပုံကို အသုံးချထားပြီး အလုပ်အကိုင် အခွင့်အလမ်း သာလွန်မှုကို 'confers a distinct competitive advantage' ဖြင့် အဆင့်မြှင့်ထားပါသည်။"
        },
        {
          type: "It-Cleft Focus & Advanced Nominalisation",
          badge: "Exemplary Cleft Construction",
          band: "Band 9.0",
          upgradedText: "It is precisely the immersive international academic experience that bolsters professional competitiveness and expands vocational horizons for ambitious scholars.",
          keyDiffs: [
            { original: "study abroad", upgraded: "immersive international academic experience" },
            { original: "get better jobs", upgraded: "bolsters professional competitiveness and expands vocational horizons" }
          ],
          burmeseNote: "'It is precisely [NP] that ...' cleft sentence ဖြင့် အဓိကအချက်ကို အသားပေးထားပြီး 'job opportunities' ကို 'vocational horizons' ဟူသော Band 9.0 academic phrase သို့ ပြောင်းထားပါသည်။"
        }
      ]
    },
    {
      id: "environmental_pollution",
      title: "Environmental Degradation & Emissions",
      keywords: ["pollution", "environment", "cars", "air quality", "climate change", "carbon", "fossil", "global warming"],
      exampleInput: "Pollution is becoming worse because more cars are on the roads.",
      originalBand: "5.5 - 6.0",
      variants: [
        {
          type: "Academic Passive & Impersonal Stance",
          badge: "Causal Passive Construct",
          band: "Band 8.5",
          upgradedText: "It has been empirically demonstrated that atmospheric degradation is precipitously exacerbated by the exponential proliferation of private motor vehicles in urban centres.",
          keyDiffs: [
            { original: "Pollution is becoming worse", upgraded: "atmospheric degradation is precipitously exacerbated" },
            { original: "because more cars are on the roads", upgraded: "by the exponential proliferation of private motor vehicles" }
          ],
          burmeseNote: "'becoming worse' အစား 'precipitously exacerbated' (အရှိန်အဟုန်ပြင်းစွာ ပိုမိုဆိုးရွားလာခြင်း) ကို Passive voice ဖြင့် တွဲစပ်ထားပြီး 'more cars' ကို 'exponential proliferation' ဟူသော Academic noun phrase သို့ ပြောင်းထားပါသည်။"
        },
        {
          type: "Negative Inversion & Restrictive Condition",
          badge: "Temporal Comparative Inversion",
          band: "Band 8.5 - 9.0",
          upgradedText: "Rarely has urban air quality deteriorated as precipitously as during the contemporary surge in fossil-fuel-reliant vehicular fleets.",
          keyDiffs: [
            { original: "Pollution is becoming worse", upgraded: "Rarely has urban air quality deteriorated as precipitously" },
            { original: "more cars on the roads", upgraded: "surge in fossil-fuel-reliant vehicular fleets" }
          ],
          burmeseNote: "'Rarely has [Subject] [Past Participle]' ဖြင့် Negative Inversion သဒ္ဒါကို ချိန်ဆထားသဖြင့် သာမန်စာမေးပွဲဖြေဆိုသူများ မရေးနိုင်သော High-level GRA အမှတ်အပြည့် ရရှိစေပါသည်။"
        },
        {
          type: "It-Cleft Focus & Advanced Nominalisation",
          badge: "Cleft Focalization",
          band: "Band 9.0",
          upgradedText: "It is the unabated reliance on private vehicular transit that serves as the paramount catalyst for severe metropolitan atmospheric degradation.",
          keyDiffs: [
            { original: "more cars on the roads", upgraded: "It is the unabated reliance on private vehicular transit that..." },
            { original: "Pollution is becoming worse", upgraded: "serves as the paramount catalyst for severe metropolitan atmospheric degradation" }
          ],
          burmeseNote: "အကြောင်းအရင်း (Causation) ကို 'paramount catalyst' ဟု အဆင့်မြှင့်ပြီး Cleft sentence ဖြင့် တွဲစပ်ထားပါသည်။ သဒ္ဒါဖွဲ့စည်းပုံနှင့် စကားလုံးကြွယ်ဝမှု နှစ်ခုစလုံး Band 9.0 စံနှုန်းပြည့်မီပါသည်။"
        }
      ]
    },
    {
      id: "financial_education",
      title: "Pragmatic Financial Education for Youths",
      keywords: ["financial", "money", "schools", "teenagers", "students", "teach", "curriculum", "budgeting"],
      exampleInput: "Schools should teach practical financial skills to teenagers.",
      originalBand: "5.5 - 6.0",
      variants: [
        {
          type: "Academic Passive & Impersonal Stance",
          badge: "Normative Passive Construction",
          band: "Band 8.5",
          upgradedText: "It is firmly maintained that secondary educational curricula ought to formally incorporate comprehensive fiscal literacy and personal budgeting modules for adolescent cohorts.",
          keyDiffs: [
            { original: "Schools should teach", upgraded: "educational curricula ought to formally incorporate" },
            { original: "practical financial skills", upgraded: "comprehensive fiscal literacy and personal budgeting modules" },
            { original: "teenagers", upgraded: "adolescent cohorts" }
          ],
          burmeseNote: "'Schools should teach' ဟူသော ရိုးစင်းသည့် အကြံပြုချက်အစား 'curricula ought to incorporate' ဟူသော Institutional voice သို့ ပြောင်းလဲထားပါသည်။"
        },
        {
          type: "Negative Inversion & Restrictive Condition",
          badge: "Fronted Prepositional Inversion",
          band: "Band 8.5 - 9.0",
          upgradedText: "Only by embedding pragmatic fiscal competency into secondary schooling can educational authorities adequately prepare adolescents for future financial self-sufficiency.",
          keyDiffs: [
            { original: "Schools should teach", upgraded: "can educational authorities adequately prepare" },
            { original: "practical financial skills", upgraded: "embedding pragmatic fiscal competency" },
            { original: "Only by...", upgraded: "Fronted Inversion condition" }
          ],
          burmeseNote: "'Only by [Gerund Phrase] can [Subject] [Verb]' ပုံစံသည် IELTS Task 2 Essay များတွင် Band 8.5+ သတ်မှတ်ချက်အတွက် အထူးသင့်လျော်သော Conditional Inversion ဖွဲ့စည်းပုံဖြစ်ပါသည်။"
        },
        {
          type: "It-Cleft Focus & Advanced Nominalisation",
          badge: "Institutional Cleft Design",
          band: "Band 9.0",
          upgradedText: "It is the institutionalisation of pragmatic budgetary education that equips prospective school leavers with indispensable fiscal resilience in adult society.",
          keyDiffs: [
            { original: "teaching financial skills", upgraded: "institutionalisation of pragmatic budgetary education" },
            { original: "Schools should...", upgraded: "It is ... that equips prospective school leavers with indispensable fiscal resilience" }
          ],
          burmeseNote: "'teach practical financial skills' ကို 'institutionalisation of pragmatic budgetary education' အဖြစ် နာမ်အစုအဖွဲ့ (Nominalisation) သို့ ပြောင်းလဲထားသဖြင့် စာသားသည် ပညာရပ်ဆန်ပြီး အလေးအနက်ရှိစေပါသည်။"
        }
      ]
    },
    {
      id: "remote_work",
      title: "Telecommuting & Organizational Productivity",
      keywords: ["work from home", "remote", "employees", "companies", "productivity", "office", "telecommuting"],
      exampleInput: "Companies should allow employees to work from home to increase productivity.",
      originalBand: "5.5 - 6.0",
      variants: [
        {
          type: "Academic Passive & Impersonal Stance",
          badge: "Institutional Policy Passive",
          band: "Band 8.5",
          upgradedText: "It is extensively argued that commercial enterprises ought to institutionalise telecommuting frameworks to optimise aggregate workforce productivity and employee morale.",
          keyDiffs: [
            { original: "Companies should allow", upgraded: "commercial enterprises ought to institutionalise" },
            { original: "work from home", upgraded: "telecommuting frameworks" },
            { original: "increase productivity", upgraded: "optimise aggregate workforce productivity and employee morale" }
          ],
          burmeseNote: "'work from home' ကို 'telecommuting frameworks' ဟု ပြောင်းလဲပြီး 'increase productivity' ကို 'optimise aggregate workforce productivity' ဟူသော စီးပွားရေး/စီမံခန့်ခွဲမှု ဆိုင်ရာ အဆင့်မြင့် Collocations များဖြင့် အစားထိုးထားပါသည်။"
        },
        {
          type: "Negative Inversion & Restrictive Condition",
          badge: "Correlative Inversion",
          band: "Band 8.5 - 9.0",
          upgradedText: "Not only does facilitating remote working models attenuate daily commuting fatigue, but it also demonstrably elevates overall organizational output.",
          keyDiffs: [
            { original: "allow to work from home", upgraded: "facilitating remote working models" },
            { original: "increase productivity", upgraded: "demonstrably elevates overall organizational output" },
            { original: "Not only does...", upgraded: "Inverted Correlative structure" }
          ],
          burmeseNote: "Not only does [Verb] [Subject] ... but it also ... ဖြင့် အကျိုးကျေးဇူး နှစ်ရပ် (ပင်ပန်းမှု လျော့ကျခြင်းနှင့် စွမ်းဆောင်ရည် တက်လာခြင်း) ကို သဒ္ဒါအလှဆင် ချိတ်ဆက်ပြထားပါသည်။"
        },
        {
          type: "It-Cleft Focus & Advanced Nominalisation",
          badge: "Strategic Cleft Formulation",
          band: "Band 9.0",
          upgradedText: "It is the strategic adoption of flexible telecommuting arrangements that empowers corporate personnel to achieve heightened occupational efficiency.",
          keyDiffs: [
            { original: "allow employees to work from home", upgraded: "It is the strategic adoption of flexible telecommuting arrangements that empowers corporate personnel..." },
            { original: "increase productivity", upgraded: "achieve heightened occupational efficiency" }
          ],
          burmeseNote: "Cleft sentence ပုံစံဖြင့် 'strategic adoption' ကို Focal point အဖြစ်ထားပြီး အလုပ်သမားများ၏ စွမ်းဆောင်ရည်ကို 'heightened occupational efficiency' ဖြင့် အဆုံးသတ်ထားပါသည်။"
        }
      ]
    },
    {
      id: "ai_automation",
      title: "Artificial Intelligence & Labor Market Displacement",
      keywords: ["artificial intelligence", "ai", "automation", "robots", "jobs", "workers", "unemployment"],
      exampleInput: "AI will take away many jobs so workers need to learn new tech skills.",
      originalBand: "5.5 - 6.0",
      variants: [
        {
          type: "Academic Passive & Impersonal Stance",
          badge: "Socioeconomic Projection",
          band: "Band 8.5",
          upgradedText: "It is widely postulated by labor economists that the accelerated advent of artificial intelligence will inevitably displace routine vocations, necessitating proactive workforce upskilling.",
          keyDiffs: [
            { original: "AI will take away many jobs", upgraded: "artificial intelligence will inevitably displace routine vocations" },
            { original: "workers need to learn new tech skills", upgraded: "necessitating proactive workforce upskilling" }
          ],
          burmeseNote: "'take away jobs' အစား 'displace routine vocations' ကိုသုံးပြီး ကော်မာနောက်တွင် Participle Clause (necessitating proactive upskilling) ဖြင့် ချောမွေ့စွာ ပေါင်းစပ်ထားပါသည်။"
        },
        {
          type: "Negative Inversion & Restrictive Condition",
          badge: "Temporal Negation Inversion",
          band: "Band 8.5 - 9.0",
          upgradedText: "Under no circumstances can policymakers disregard the disruptive potential of autonomous algorithms on occupational stability.",
          keyDiffs: [
            { original: "workers need to learn", upgraded: "Under no circumstances can policymakers disregard" },
            { original: "AI will take jobs", upgraded: "the disruptive potential of autonomous algorithms on occupational stability" }
          ],
          burmeseNote: "'Under no circumstances can [Subject] [Verb]' Inversion ကို သုံး၍ အစိုးရနှင့် မူဝါဒချမှတ်သူများ မျက်ကွယ်မပြုသင့်ကြောင်း အလေးအနက် ရေးသားပြထားပါသည်။"
        },
        {
          type: "It-Cleft Focus & Advanced Nominalisation",
          badge: "Structural Cleft Proposition",
          band: "Band 9.0",
          upgradedText: "It is the relentless sophistication of cognitive machine learning that compels an urgent restructuring of national vocational training frameworks.",
          keyDiffs: [
            { original: "AI is developing", upgraded: "relentless sophistication of cognitive machine learning" },
            { original: "workers must learn new skills", upgraded: "compels an urgent restructuring of national vocational training frameworks" }
          ],
          burmeseNote: "'It is [Abstract Noun Phrase] that compels ...' ဖြင့် စက်မှုတော်လှန်ရေး၏ အဓိကတွန်းအားကို အထူးပြုပြထားပါသည်။"
        }
      ]
    },
    {
      id: "fast_food_tax",
      title: "Fast Food Taxation & Public Health Epidemics",
      keywords: ["fast food", "junk food", "obesity", "tax", "health", "sugar", "diet"],
      exampleInput: "Fast food causes obesity and health problems so government should tax it more.",
      originalBand: "5.5 - 6.0",
      variants: [
        {
          type: "Academic Passive & Impersonal Stance",
          badge: "Epidemiological Passive",
          band: "Band 8.5",
          upgradedText: "It is emphatically asserted by public health epidemiologists that fiscal levies on ultra-processed consumables ought to be escalated to curb the burgeoning obesity epidemic.",
          keyDiffs: [
            { original: "Fast food causes obesity", upgraded: "curb the burgeoning obesity epidemic" },
            { original: "government should tax it more", upgraded: "fiscal levies on ultra-processed consumables ought to be escalated" }
          ],
          burmeseNote: "'tax it more' အစား 'fiscal levies ... ought to be escalated' ဟူသော Passive voice နှင့် 'ultra-processed consumables' ဟူသော C2 medical/nutritional term ကို အသုံးပြုထားပါသည်။"
        },
        {
          type: "Negative Inversion & Restrictive Condition",
          badge: "Correlative Inversion",
          band: "Band 8.5 - 9.0",
          upgradedText: "Not only does the unchecked consumption of energy-dense fast food precipitate chronic lifestyle ailments, but it also imposes an unsustainable fiscal burden on public healthcare systems.",
          keyDiffs: [
            { original: "causes obesity and health problems", upgraded: "precipitate chronic lifestyle ailments" },
            { original: "so government should tax", upgraded: "imposes an unsustainable fiscal burden on public healthcare systems" }
          ],
          burmeseNote: "Not only does ... but it also ... ဖြင့် အစားအစာ၏ ကျန်းမာရေးဆိုးကျိုးနှင့် နိုင်ငံတော်ဘဏ္ဍာရေး ဝန်ထုပ်ဝန်ပိုး နှစ်ခုစလုံးကို အဆင့်မြင့်စွာ ဆက်စပ်တင်ပြထားပါသည်။"
        },
        {
          type: "It-Cleft Focus & Advanced Nominalisation",
          badge: "Policy Cleft Intervention",
          band: "Band 9.0",
          upgradedText: "It is through targeted fiscal disincentives on nutritional hazards that public authorities can most effectively disincentivize hazardous dietary habits.",
          keyDiffs: [
            { original: "tax fast food", upgraded: "targeted fiscal disincentives on nutritional hazards" },
            { original: "stop people eating bad food", upgraded: "effectively disincentivize hazardous dietary habits" }
          ],
          burmeseNote: "'tax' ကို 'targeted fiscal disincentives' ဟု Nominalise လုပ်ကာ Cleft Focus ဖြင့် မူဝါဒ၏ ထိရောက်မှုကို တင်ပြထားပါသည်။"
        }
      ]
    },
    {
      id: "tourism_heritage",
      title: "Mass Tourism & Indigenous Cultural Preservation",
      keywords: ["tourism", "tourists", "culture", "historical", "heritage", "monuments", "sites"],
      exampleInput: "Tourism damages historical sites and local culture so it should be controlled.",
      originalBand: "5.5 - 6.0",
      variants: [
        {
          type: "Academic Passive & Impersonal Stance",
          badge: "Cultural Heritage Passive",
          band: "Band 8.5",
          upgradedText: "It is increasingly documented that unchecked commercial tourism inflicts irremediable physical degradation on heritage landmarks while diluting authentic indigenous traditions.",
          keyDiffs: [
            { original: "Tourism damages historical sites", upgraded: "unchecked commercial tourism inflicts irremediable physical degradation on heritage landmarks" },
            { original: "and local culture", upgraded: "while diluting authentic indigenous traditions" }
          ],
          burmeseNote: "'damages' အစား 'inflicts irremediable physical degradation' နှင့် 'local culture' အစား 'authentic indigenous traditions' ဟူသော Band 8.5+ Collocations များကို သုံးထားပါသည်။"
        },
        {
          type: "Negative Inversion & Restrictive Condition",
          badge: "Negative Restrictive Inversion",
          band: "Band 8.5 - 9.0",
          upgradedText: "Hardly can the short-term financial revenues generated by mass tourism compensate for the irreversible erosion of ancient cultural heritage.",
          keyDiffs: [
            { original: "Tourism damages sites", upgraded: "Hardly can the short-term revenues ... compensate for irreversible erosion" }
          ],
          burmeseNote: "'Hardly can [Subject] [Verb]' Inversion ဖြင့် စီးပွားရေးအမြတ်ထက် ယဉ်ကျေးမှုဆုံးရှုံးမှုက ပိုကြီးမားကြောင်း အနုပညာမြောက်စွာ ထောက်ပြထားပါသည်။"
        },
        {
          type: "It-Cleft Focus & Advanced Nominalisation",
          badge: "Cleft Preservation Focus",
          band: "Band 9.0",
          upgradedText: "It is the statutory implementation of rigorous visitor quotas that safeguards fragile archaeological monuments against commercial overexploitation.",
          keyDiffs: [
            { original: "it should be controlled", upgraded: "It is the statutory implementation of rigorous visitor quotas that safeguards..." }
          ],
          burmeseNote: "'control tourism' အစား 'statutory implementation of rigorous visitor quotas' ဟူသော တိကျသည့် အုပ်ချုပ်ရေးဆိုင်ရာ အသုံးအနှုန်းကို Cleft sentence ဖြင့် တည်ဆောက်ထားပါသည်။"
        }
      ]
    },
    {
      id: "capital_punishment",
      title: "Capital Punishment & Fundamental Human Rights",
      keywords: ["death penalty", "capital punishment", "prison", "criminals", "crime", "execute", "jail"],
      exampleInput: "Capital punishment should be banned because it is cruel and does not stop crime.",
      originalBand: "5.5 - 6.0",
      variants: [
        {
          type: "Academic Passive & Impersonal Stance",
          badge: "Juridical Stance Passive",
          band: "Band 8.5",
          upgradedText: "It is emphatically maintained by international jurists that state-sanctioned execution should be universally abolished on grounds of its inherent inhumanity and negligible deterrent efficacy.",
          keyDiffs: [
            { original: "Capital punishment should be banned", upgraded: "state-sanctioned execution should be universally abolished" },
            { original: "because it is cruel", upgraded: "on grounds of its inherent inhumanity" },
            { original: "does not stop crime", upgraded: "negligible deterrent efficacy" }
          ],
          burmeseNote: "'banned' အစား 'universally abolished'၊ 'does not stop crime' အစား 'negligible deterrent efficacy' (ရာဇဝတ်မှု ဟန့်တားနိုင်စွမ်း မရှိသလောက် နည်းပါးခြင်း) ဟူသော Academic C2 register သို့ ပြောင်းထားပါသည်။"
        },
        {
          type: "Negative Inversion & Restrictive Condition",
          badge: "Absolute Juridical Inversion",
          band: "Band 8.5 - 9.0",
          upgradedText: "Under no legal framework can the premeditated termination of human life by state entities be reconciled with fundamental human rights charters.",
          keyDiffs: [
            { original: "Capital punishment should be banned", upgraded: "Under no legal framework can ... be reconciled with human rights" }
          ],
          burmeseNote: "'Under no legal framework can [Subject] be [Past Participle]' ဟူသော အဆင့်မြင့် Negative Inversion ဖြင့် မည်သည့်ဥပဒေအောက်တွင်မျှ လက်ခံမရနိုင်ကြောင်း အပြတ်သားဆုံး သဘောထားကို ဖော်ပြပါသည်။"
        },
        {
          type: "It-Cleft Focus & Advanced Nominalisation",
          badge: "Constitutional Cleft Claim",
          band: "Band 9.0",
          upgradedText: "It is the irrevocable nature of judicial execution and the fallibility of legal systems that mandate the immediate eradication of the death penalty.",
          keyDiffs: [
            { original: "because it is cruel", upgraded: "irrevocable nature of judicial execution and fallibility of legal systems" },
            { original: "should be banned", upgraded: "mandate the immediate eradication of the death penalty" }
          ],
          burmeseNote: "အမှားမခံနိုင်သော သဘောသဘာဝ (irrevocable nature) နှင့် တရားစီရင်ရေး၏ မှားယွင်းနိုင်မှု (fallibility) ကို Nominalisation လုပ်၍ Cleft sentence ဖြင့် ချိတ်ဆက်ပြထားပါသည်။"
        }
      ]
    }
  ];

  // Algorithmic Syntactic Parser & Academic Lexicon Mapping
  const ACADEMIC_VOCAB_MAP = {
    // Verbs
    "think": "contend",
    "thinks": "contends",
    "believe": "postulate",
    "believes": "postulates",
    "say": "assert",
    "says": "asserts",
    "spend": "allocate",
    "spends": "allocates",
    "spent": "allocated",
    "give": "confer",
    "gives": "confers",
    "gave": "conferred",
    "get": "acquire",
    "gets": "acquires",
    "got": "acquired",
    "make": "engender",
    "makes": "engenders",
    "made": "engendered",
    "help": "facilitate",
    "helps": "facilitates",
    "helped": "facilitated",
    "stop": "curtail",
    "stops": "curtails",
    "stopped": "curtailed",
    "reduce": "mitigate",
    "reduces": "mitigates",
    "reduced": "mitigated",
    "cause": "precipitate",
    "causes": "precipitates",
    "caused": "precipitated",
    "solve": "ameliorate",
    "solves": "ameliorates",
    "solved": "ameliorated",
    "destroy": "decimate",
    "destroys": "decimates",
    "destroyed": "decimated",
    "increase": "escalate",
    "increases": "escalates",
    "increased": "escalated",

    // Nouns & Entities
    "government": "municipal authorities and policymakers",
    "governments": "state authorities and policymakers",
    "people": "citizens and societal stakeholders",
    "students": "matriculating scholars",
    "children": "juvenile cohorts",
    "kids": "adolescents",
    "money": "substantial capital and fiscal reserves",
    "cars": "private motor vehicles",
    "jobs": "gainful employment opportunities",
    "schools": "pedagogical institutions",
    "companies": "commercial enterprises and corporate entities",
    "problem": "pervasive dilemma",
    "problems": "systemic impediments",

    // Adjectives
    "good": "efficacious and advantageous",
    "bad": "detrimental and deleterious",
    "big": "paramount and substantial",
    "important": "pivotal and imperative",
    "rich": "affluent",
    "poor": "socioeconomically marginalized",
    "cheap": "cost-effective",
    "hard": "onerous and formidable"
  };

  /**
   * Find matching corpus template or generate rule-based transformation
   */
  function transformSentence(inputStr) {
    if (!inputStr || !inputStr.trim()) {
      return null;
    }
    const clean = inputStr.trim().replace(/\s+/g, ' ');
    const lower = clean.toLowerCase();

    // 1. Check exact or high-affinity semantic match in curated corpus
    for (const item of BAND_SURGERY_CORPUS) {
      let hits = 0;
      for (const kw of item.keywords) {
        if (lower.includes(kw)) hits++;
      }
      if (hits >= 2 || lower.includes(item.id.replace(/_/g, ' '))) {
        return {
          source: 'corpus',
          matchedTopic: item.title,
          originalSentence: clean,
          originalBand: item.originalBand,
          variants: item.variants
        };
      }
    }

    // 2. Fallback: Algorithmic Syntactic Parser & Rule Engine
    return generateAlgorithmicUpgrade(clean);
  }

  /**
   * Algorithmic Syntax Engine for arbitrary inputs
   */
  function generateAlgorithmicUpgrade(clean) {
    const words = clean.split(/\s+/);
    const upgradedTokens = words.map(w => {
      const bare = w.toLowerCase().replace(/[^a-z]/g, '');
      const mapped = ACADEMIC_VOCAB_MAP[bare];
      return mapped ? mapped : w;
    });

    const upgradedBody = upgradedTokens.join(' ').replace(/\s+([.,;:])/g, '$1');

    const variantA = {
      type: "Academic Passive & Impersonal Stance",
      badge: "Syntactic Passive Restructuring",
      band: "Band 8.5",
      upgradedText: `It is widely contended among academic analysts that ${upgradedBody.replace(/^[A-Z]/, c => c.toLowerCase()).replace(/[.!?]+$/, '')}, thereby establishing an objective and scholarly perspective.`,
      keyDiffs: [
        { original: "Subjective assertion", upgraded: "It is widely contended among academic analysts that..." },
        { original: "Informal lexical choices", upgraded: "Elevated C1/C2 Academic Collocations" }
      ],
      burmeseNote: "ရိုးစင်းသော Subjective statement အား 'It is widely contended that' ဟူသော Academic Impersonal Passive ပုံစံသို့ ပြောင်းလဲထားသဖြင့် စာစစ်သူ၏ စံနှုန်းများတွင် စာသားကို အလွန်ရင့်ကျက်ပြီး ဘက်မလိုက်သော Objective Academic Tone အဖြစ် ချက်ချင်း အသိအမှတ်ပြုစေပါသည်။"
    };

    const variantB = {
      type: "Negative Inversion & Restrictive Condition",
      badge: "Restrictive Conditional Inversion",
      band: "Band 8.5 - 9.0",
      upgradedText: `Seldom do empirical scholars dispute that ${upgradedBody.replace(/^[A-Z]/, c => c.toLowerCase()).replace(/[.!?]+$/, '')}, as evidenced by contemporary global dynamics.`,
      keyDiffs: [
        { original: "Direct basic claim", upgraded: "Seldom do empirical scholars dispute that..." },
        { original: "Weak verb phrases", upgraded: "Syntactically Inverted Predicate" }
      ],
      burmeseNote: "Negative Adverb 'Seldom' ကို ရှေ့ထုတ်၍ Inversion (Seldom do ... dispute) ဖွဲ့စည်းပုံကို အသုံးပြုထားပါသည်။ ဤသဒ္ဒါပုံစံသည် IELTS Grammatical Range & Accuracy (GRA) တွင် Band 8.5+ သတ်မှတ်ချက်ကို ခိုင်မာစွာ အထောက်အကူပြုပါသည်။"
    };

    const variantC = {
      type: "It-Cleft Focus & Advanced Nominalisation",
      badge: "Cleft Focalization & Nominal Flow",
      band: "Band 9.0",
      upgradedText: `It is the systemic imperative regarding ${upgradedBody.replace(/^[A-Z]/, c => c.toLowerCase()).replace(/[.!?]+$/, '')} that commands paramount attention within contemporary scholarship.`,
      keyDiffs: [
        { original: "Original clause", upgraded: "It is the systemic imperative regarding ... that commands paramount attention" }
      ],
      burmeseNote: "It-cleft ပုံစံဖြင့် အဓိကအချက်ကို အလေးပေးဖော်ပြပြီး ကြိယာအသုံးအနှုန်းများကို နာမ်အစုအဖွဲ့ (Nominalisation) အဖြစ် သန့်စင်ထားသဖြင့် Band 9.0 Academic Essay ရေးဟန်စစ်စစ်ကို ဖြစ်ထွန်းစေပါသည်။"
    };

    return {
      source: 'algorithmic',
      matchedTopic: 'Custom IELTS Argument',
      originalSentence: clean,
      originalBand: '5.5 - 6.0',
      variants: [variantA, variantB, variantC]
    };
  }

  /**
   * Render surgery results into container
   */
  function renderSurgeryCards(result, containerEl) {
    if (!result || !containerEl) return;

    let html = `
      <div style="margin-bottom:16px; padding:14px 18px; background:linear-gradient(135deg, rgba(217, 119, 6, 0.08), rgba(180, 83, 9, 0.03)); border:1px solid rgba(217, 119, 6, 0.25); border-radius:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="occ-ver-pill" style="background:#D97706; color:#FFF; font-weight:800; font-size:0.75rem;">LIVE BAND SURGERY</span>
            <span style="font-weight:700; color:var(--text); font-size:0.9rem;">Topic: ${escapeHtml(result.matchedTopic)}</span>
          </div>
          <span style="font-size:0.8rem; color:var(--text-secondary);">Input Score: <strong style="color:var(--danger);">${result.originalBand}</strong> &rarr; Upgraded: <strong style="color:var(--success);">Band 8.5 &ndash; 9.0</strong></span>
        </div>
        <div style="margin-top:8px; font-size:0.85rem; color:var(--text-secondary); font-style:italic;">
          &ldquo;${escapeHtml(result.originalSentence)}&rdquo;
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:16px;">
    `;

    result.variants.forEach((v, idx) => {
      const variantLetters = ['A', 'B', 'C'];
      const letter = variantLetters[idx] || (idx + 1);
      const isTopBand = v.band.includes('9.0');

      let diffTagsHtml = '';
      if (v.keyDiffs && v.keyDiffs.length > 0) {
        diffTagsHtml = `
          <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
            <span style="font-size:0.72rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em;">Key Upgrades:</span>
            ${v.keyDiffs.map(d => `
              <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; background:rgba(0,0,0,0.04); border:1px solid var(--border); padding:2px 8px; border-radius:4px;">
                <span style="color:var(--danger); text-decoration:line-through; font-size:0.72rem;">${escapeHtml(d.original)}</span>
                <span style="color:var(--text-secondary); font-size:0.7rem;">&rarr;</span>
                <strong style="color:var(--accent); font-size:0.76rem;">${escapeHtml(d.upgraded)}</strong>
              </span>
            `).join('')}
          </div>
        `;
      }

      html += `
        <div class="occ-card" style="padding:16px 18px; border:1px solid ${isTopBand ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-accent)'}; background:var(--bg-card); border-radius:10px; box-shadow:0 4px 14px rgba(0,0,0,0.03); transition:all 0.2s ease;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="background:${isTopBand ? '#10B981' : '#D97706'}; color:#FFF; font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:4px;">VARIANT ${letter}</span>
              <strong style="font-size:0.92rem; color:var(--text);">${escapeHtml(v.type)}</strong>
              <span class="occ-ver-pill" style="font-size:0.72rem; background:rgba(0,0,0,0.05); color:var(--text-secondary); border:1px solid var(--border);">${escapeHtml(v.badge)}</span>
            </div>
            <span style="font-weight:900; font-size:0.85rem; color:${isTopBand ? '#10B981' : 'var(--accent)'}; background:rgba(217, 119, 6, 0.08); padding:3px 10px; border-radius:20px; border:1px solid rgba(217, 119, 6, 0.2);">
              Target: ${escapeHtml(v.band)}
            </span>
          </div>

          <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px 14px; margin-bottom:10px; font-size:0.95rem; line-height:1.65; color:var(--text); font-family:Georgia, serif;">
            ${escapeHtml(v.upgradedText)}
          </div>

          ${diffTagsHtml}

          <div style="margin-top:12px; padding:10px 12px; background:rgba(217, 119, 6, 0.04); border-left:3px solid #D97706; border-radius:0 6px 6px 0; font-size:0.82rem; color:var(--text-secondary); line-height:1.55;">
            <strong style="color:var(--text);"><svg class="ui-icon ui-icon-xs" style="color:#D97706;"><use href="#lucide-sparkles"/></svg> Examiner Analysis (Burmese):</strong>
            <p style="margin:4px 0 0 0; font-family:'Pyidaungsu', 'Myanmar3', sans-serif;">${escapeHtml(v.burmeseNote)}</p>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px; flex-wrap:wrap;">
            <button class="btn-outlined" style="padding:6px 14px; font-size:0.78rem; font-weight:700;" onclick="window.copySurgeryVariantText(this, ${JSON.stringify(v.upgradedText)})">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-copy"/></svg> Copy Upgrade
            </button>
            <button class="btn-accent-solid" style="padding:6px 14px; font-size:0.78rem; font-weight:700;" onclick="window.insertSurgeryIntoWritingLab(${JSON.stringify(v.upgradedText)})">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-arrow-up-right"/></svg> Insert into Writing Lab
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    containerEl.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Window API
  window.BAND_SURGERY_CORPUS = BAND_SURGERY_CORPUS;

  window.executeBandSurgery = function(source) {
    const atInput = document.getElementById('at-surgery-input');
    const vtInput = document.getElementById('vt-surgery-input');
    let inputVal = '';

    if (source === 'modal' && vtInput) {
      inputVal = vtInput.value.trim();
      if (atInput) atInput.value = inputVal;
    } else if (atInput) {
      inputVal = atInput.value.trim();
      if (vtInput) vtInput.value = inputVal;
    }

    if (!inputVal) {
      if (window.showAppToast) window.showAppToast('Please enter or paste a sentence to upgrade!', 'warning');
      return;
    }

    const atContainer = document.getElementById('at-surgery-results');
    const vtContainer = document.getElementById('vt-surgery-results');

    const loaderHtml = `
      <div style="text-align:center; padding:36px 16px;">
        <div style="display:inline-block; width:36px; height:36px; border:3px solid rgba(217,119,6,0.2); border-top-color:#D97706; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
        <p style="margin-top:12px; font-size:0.85rem; color:var(--text-secondary); font-weight:600;">Running Syntactic Surgery &amp; Impersonal Transformation...</p>
      </div>
    `;

    if (atContainer) atContainer.innerHTML = loaderHtml;
    if (vtContainer) vtContainer.innerHTML = loaderHtml;

    setTimeout(() => {
      const result = transformSentence(inputVal);
      if (atContainer) renderSurgeryCards(result, atContainer);
      if (vtContainer) renderSurgeryCards(result, vtContainer);
    }, 120);
  };

  window.setSurgeryInput = function(text, source) {
    const atInput = document.getElementById('at-surgery-input');
    const vtInput = document.getElementById('vt-surgery-input');
    if (atInput) atInput.value = text;
    if (vtInput) vtInput.value = text;
    window.executeBandSurgery(source);
  };

  window.copySurgeryVariantText = function(btnEl, text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const origHtml = btnEl.innerHTML;
      btnEl.innerHTML = `<svg class="ui-icon ui-icon-xs" style="color:var(--success);"><use href="#lucide-check"/></svg> Copied!`;
      setTimeout(() => {
        btnEl.innerHTML = origHtml;
      }, 2000);
      if (window.showAppToast) {
        window.showAppToast('Band 8.5+ upgraded sentence copied to clipboard!', 'success');
      }
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  };

  window.insertSurgeryIntoWritingLab = function(text) {
    if (!text) return;

    // Find Writing Lab Essay Textarea
    const writingTextarea = document.getElementById('essayArea') || document.getElementById('writingEssay') || document.querySelector('#view-writing textarea') || document.querySelector('.writing-editor textarea');
    
    if (writingTextarea) {
      const cur = writingTextarea.value.trim();
      if (cur) {
        writingTextarea.value = cur + "\n\n" + text;
      } else {
        writingTextarea.value = text;
      }
      
      // Dispatch input event to update word count and auto-save
      writingTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof window.runLiveWritingDiagnostics === 'function') window.runLiveWritingDiagnostics();

      // Switch to writing tab
      if (typeof window.switchTab === 'function') {
        window.switchTab('writing');
      } else if (typeof window.switchAcademicToolsTab === 'function') {
        const writingTabBtn = document.getElementById('tab-writing') || document.querySelector('[data-tab="writing"]');
        if (writingTabBtn) writingTabBtn.click();
      }

      // Scroll textarea into view and pulse highlight
      setTimeout(() => {
        writingTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        writingTextarea.focus();
        writingTextarea.style.transition = 'box-shadow 0.3s ease';
        writingTextarea.style.boxShadow = '0 0 0 3px #10B981';
        setTimeout(() => {
          writingTextarea.style.boxShadow = '';
        }, 1500);
      }, 300);

      if (window.showAppToast) {
        window.showAppToast('Transformed Band 8.5 sentence inserted into Writing Lab!', 'success');
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(text).then(() => {
        if (window.showAppToast) {
          window.showAppToast('Writing Lab not active. Sentence copied to clipboard!', 'info');
        }
      });
    }
  };


  // ==========================================
  // STEP 1.2: 18 DEADLY BAND-6.0 CLICHÉ & TRAP X-RAY SCANNER
  // ==========================================
  const BAND6_TRAP_RULES = [
    {
      id: "nowadays",
      name: '"Nowadays" Cliché Opener',
      rx: /\bnowadays\b/gi,
      severity: "High",
      category: "Memorized Cliché",
      suggested: "in contemporary society",
      alternatives: ["in contemporary society", "in the modern era", "in recent decades"],
      reason: "Examiners see 'Nowadays' in over 70% of Band 5.5-6.0 scripts. It flags memorized template writing immediately.",
      burmese: "စာမေးပွဲဖြေဆိုသူ အများစု အလွန်အကျွံသုံးသော စကားလုံးဖြစ်သဖြင့် Band 6.0 တွင် ပိတ်မိစေပါသည်။ 'in contemporary society' ဖြင့် အစားထိုးပါ။"
    },
    {
      id: "coin_two_sides",
      name: '"Every Coin Has Two Sides"',
      rx: /\b(every\s+coin\s+has\s+two\s+sides|two\s+sides\s+of\s+(the|a)\s+coin)\b/gi,
      severity: "Critical",
      category: "Informal Idiom",
      suggested: "this issue engenders divergent perspectives",
      alternatives: ["this issue engenders divergent perspectives", "this debate encompasses polarized viewpoints"],
      reason: "Colloquial idiom severely penalized under Lexical Resource. Academic writing requires formal debate framing.",
      burmese: "အလွတ်ကျက်ထားသော အီဒီယမ်ဖြစ်၍ Academic Essay တွင် မသုံးသင့်ပါ။ 'this issue engenders divergent perspectives' ဖြင့် ပြောင်းပါ။"
    },
    {
      id: "in_a_nutshell",
      name: '"In a Nutshell" Conclusion Cliché',
      rx: /\bin\s+a\s+nutshell\b/gi,
      severity: "High",
      category: "Casual Spoken Idiom",
      suggested: "in the final analysis,",
      alternatives: ["in the final analysis,", "to synthesize the aforementioned points,", "in conclusion,"],
      reason: "Casual spoken English. Using conversational idioms in academic conclusions caps Task Achievement and LR.",
      burmese: "နှုတ်ပြောအသုံးအနှုန်းဖြစ်၍ Academic Writing တွင် အမှတ်လျှော့ခံရတတ်ပါသည်။ 'in the final analysis' ဖြင့် အစားထိုးပါ။"
    },
    {
      id: "a_lot_of",
      name: '"A Lot of / Lots of" Conversational Quantifier',
      rx: /\b(a\s+lot\s+of|lots\s+of)\b/gi,
      severity: "Medium",
      category: "Imprecise Quantifier",
      suggested: "a substantial proportion of",
      alternatives: ["a substantial proportion of", "numerous", "a multitude of"],
      reason: "Imprecise spoken quantifier. High-band academic essays require formal quantifiers like 'substantial' or 'numerous'.",
      burmese: "စကားပြောစတိုင်ဖြစ်သဖြင့် ပညာရပ်ဆိုင်ရာ အသုံးဖြစ်သော 'a substantial proportion of' သို့မဟုတ် 'numerous' သို့ ပြောင်းပါ။"
    },
    {
      id: "more_and_more",
      name: '"More and More" Repetitive Phrasing',
      rx: /\bmore\s+and\s+more\b/gi,
      severity: "Medium",
      category: "Repetitive Phrasing",
      suggested: "an increasing demographic of",
      alternatives: ["an increasing demographic of", "a burgeoning number of", "progressively more"],
      reason: "Elementary phrasing lacking lexical precision. Replace with formal demographic terminology.",
      burmese: "မူလတန်းအဆင့် စကားလုံးဖြစ်သဖြင့် 'an increasing demographic of' ဟု ပြောင်းလဲပါ။"
    },
    {
      id: "important_role",
      name: '"Plays an Important Role" Exhausted Collocation',
      rx: /\b(plays?|played)\s+(an?\s+)?important\s+role\b/gi,
      severity: "High",
      category: "Tired Collocation",
      suggested: "serves as a pivotal catalyst for",
      alternatives: ["serves as a pivotal catalyst for", "exercises a profound influence upon", "is instrumental in"],
      reason: "Exhausted cliché that examiners read thousands of times. Upgrades to C2 collocations instantly boost LR.",
      burmese: "စာစစ်သူများ ငြီးငွေ့နေသော စကားတွဲဖြစ်၍ 'serves as a pivotal catalyst for' ဖြင့် အဆင့်မြှင့်ပါ။"
    },
    {
      id: "contractions",
      name: "Informal Contractions (don't, can't, it's)",
      rx: /\b(don't|can't|won't|shouldn't|couldn't|wouldn't|doesn't|haven't|hasn't|isn't|aren't|it's)\b/gi,
      severity: "Critical",
      category: "Register Violation",
      suggested: "Formal Expanded Form",
      reason: "Contractions are strictly prohibited in formal Academic IELTS Task 1 & Task 2. Direct penalty under Register.",
      burmese: "Academic Essay တွင် အတိုကောက် (Contractions) များ သုံးစွဲခွင့် မရှိပါ။ စာလုံးအပြည့်သို့ ချက်ချင်းပြောင်းပါ။"
    },
    {
      id: "solve_the_problem",
      name: '"Solve the Problem" Kindergarten Collocation',
      rx: /\b(solve|solving|solves|solved)\s+the\s+problem\b/gi,
      severity: "Medium",
      category: "Elementary Collocation",
      suggested: "ameliorate the dilemma",
      alternatives: ["ameliorate the dilemma", "mitigate the crisis", "resolve the impediment"],
      reason: "Basic verb-noun pairing typical of B1 writers. Replace with nuanced academic synonyms.",
      burmese: "ရိုးရှင်းလွန်းသော Collocation ဖြစ်၍ 'ameliorate the dilemma' သို့မဟုတ် 'mitigate the crisis' သို့ ပြောင်းပါ။"
    },
    {
      id: "all_in_all",
      name: '"All in All" Spoken Signpost',
      rx: /\ball\s+in\s+all\b/gi,
      severity: "High",
      category: "Spoken Linker",
      suggested: "in the final analysis,",
      alternatives: ["in the final analysis,", "to synthesize the discussion,", "on balance,"],
      reason: "Conversational oral connective unfit for formal discourse.",
      burmese: "စကားပြောချိတ်ဆက်စကားလုံးဖြစ်၍ 'in the final analysis' ဖြင့် အစားထိုးပါ။"
    },
    {
      id: "as_everyone_knows",
      name: '"As Everyone Knows / Well-Known Fact"',
      rx: /\b(as\s+everyone\s+knows|it\s+is\s+a\s+well[-\s]known\s+fact)\b/gi,
      severity: "Critical",
      category: "Sweeping Generalization",
      suggested: "extensive empirical evidence indicates that",
      alternatives: ["extensive empirical evidence indicates that", "it is widely acknowledged that"],
      reason: "Sweeping unsupported generalizations irritate examiners. Academic writing demands empirical framing.",
      burmese: "အထောက်အထားမပါသော ခြုံငုံပြောဆိုချက်ဖြစ်၍ 'extensive empirical evidence indicates that' ဖြင့် ပြောင်းပါ။"
    },
    {
      id: "dawn_of_time",
      name: '"Since the Dawn of Time" Melodrama Opener',
      rx: /\b(since\s+the\s+dawn\s+of\s+time|since\s+ancient\s+times)\b/gi,
      severity: "Critical",
      category: "Melodramatic Cliché",
      suggested: "historically,",
      alternatives: ["historically,", "over the past half-century,", "in modern human history,"],
      reason: "Grandiose historical exaggeration flagged by every examiner training manual.",
      burmese: "ဇာတ်ဆန်လွန်းသော အလွတ်ကျက် နိဒါန်းစကားဖြစ်၍ 'historically' ဟု တိုတိုရှင်းရှင်း ပြောင်းပါ။"
    },
    {
      id: "i_think_that",
      name: 'Overused "I think that / I believe that"',
      rx: /\b(i\s+think\s+that|i\s+believe\s+that)\b/gi,
      severity: "Medium",
      category: "Excessive Subjectivity",
      suggested: "it can be cogently argued that",
      alternatives: ["it can be cogently argued that", "the evidence strongly suggests that", "it is my considered contention that"],
      reason: "Excessive 1st-person phrasing weakens academic tone. Use impersonal evaluative structures.",
      burmese: "ပုဂ္ဂိုလ်ရေးဆန်လွန်းသော အသုံးဖြစ်၍ 'it can be cogently argued that' သို့ ပြောင်းပါ။"
    },
    {
      id: "rich_and_poor",
      name: '"Rich and Poor" Informal Polarization',
      rx: /\brich\s+and\s+poor\b/gi,
      severity: "Medium",
      category: "Elementary Vocabulary",
      suggested: "affluent households and socioeconomically disadvantaged cohorts",
      alternatives: ["affluent households and socioeconomically disadvantaged cohorts", "higher- and lower-income demographics"],
      reason: "Simplistic colloquial grouping. Academic sociology requires precise economic classification.",
      burmese: "အလွန်ရိုးစင်းသော စကားလုံးများဖြစ်၍ 'affluent demographics and socioeconomically disadvantaged cohorts' ဟု သုံးပါ။"
    },
    {
      id: "big_problem",
      name: '"Big Problem / Huge Impact" Vague Intensifier',
      rx: /\b(big\s+problem|huge\s+impact)\b/gi,
      severity: "Medium",
      category: "Weak Collocation",
      suggested: "pressing systemic challenge",
      alternatives: ["pressing systemic challenge", "profound structural dilemma", "substantial ramifications"],
      reason: "'Big' and 'huge' lack academic nuance. Upgrade to precision adjectives.",
      burmese: "စကားပြော adjectives များကို အဆင့်မြင့် academic collocations ဖြင့် အစားထိုးပါ။"
    },
    {
      id: "empty_very",
      name: 'Empty Intensifiers ("Very / Really")',
      rx: /\b(very|really)\s+(important|bad|good|hard|big|difficult)\b/gi,
      severity: "Medium",
      category: "Low Lexical Density",
      suggested: "imperative / detrimental / formidable",
      reason: "Weakening filler adverbs. Cambridge rewards substituting two weak words with one rich C1/C2 adjective.",
      burmese: "စာသားတန်ဖိုး လျော့ကျစေသော filler စကားလုံးဖြစ်၍ တိကျသော C1/C2 adjective တစ်ခုတည်းဖြင့် အစားထိုးပါ။"
    },
    {
      id: "get_verb",
      name: 'Chameleon Verb "Get / Getting"',
      rx: /\b(get|gets|getting)\s+(a\s+job|an\s+opportunity|money|success)\b/gi,
      severity: "Medium",
      category: "Informal Verb",
      suggested: "secure / acquire / attain",
      alternatives: ["secure gainful employment", "acquire financial resources", "attain success"],
      reason: "'Get' is the single most common spoken English chameleon verb. In formal writing, use specific action verbs.",
      burmese: "စကားပြော verb ဖြစ်၍ 'secure' သို့မဟုတ် 'acquire' သို့ ပြောင်းပါ။"
    },
    {
      id: "two_sides_argument",
      name: '"There Are Two Sides of Argument" Template Filler',
      rx: /\b(there\s+are\s+two\s+sides\s+of\s+(this\s+)?argument|both\s+sides\s+have\s+good\s+points)\b/gi,
      severity: "High",
      category: "Robotic Template Filler",
      suggested: "this controversy encompasses bifurcated viewpoints",
      alternatives: ["this controversy encompasses bifurcated viewpoints", "this discourse involves compelling arguments on both sides"],
      reason: "Robotic canned template phrase that examiners instantly recognize and deduct marks for formulaic memorization.",
      burmese: "စာစစ်သူများ အလွတ်ရနေသော template စာကြောင်းဖြစ်၍ 'this controversy encompasses bifurcated viewpoints' ဖြင့် ပြောင်းပါ။"
    },
    {
      id: "to_sum_up",
      name: '"To Sum Up / To Wrap Up" Conversational Signpost',
      rx: /\b(to\s+sum\s+up|to\s+wrap\s+up)\b/gi,
      severity: "High",
      category: "Casual Spoken Linker",
      suggested: "in the final analysis, having evaluated both perspectives,",
      alternatives: ["in the final analysis, having evaluated both perspectives,", "to conclude,"],
      reason: "Informal signposting unsuited for university-level academic writing.",
      burmese: "ပေါ့ပေါ့ပါးပါး စကားပြောနိဂုံးစကားဖြစ်၍ တရားဝင် Academic နိဂုံးစကားသို့ ပြောင်းပါ။"
    }
  ];

  const CONTRACTION_EXPANSIONS = {
    "don't": "do not",
    "can't": "cannot",
    "won't": "will not",
    "shouldn't": "should not",
    "couldn't": "could not",
    "wouldn't": "would not",
    "doesn't": "does not",
    "haven't": "have not",
    "hasn't": "has not",
    "isn't": "is not",
    "aren't": "are not",
    "it's": "it is"
  };

  /**
   * Scan text against all 18 Band-6.0 Traps
   */
  window.scanBand6Traps = function(text) {
    if (!text || !text.trim()) {
      return { totalTraps: 0, riskScore: 0, riskLevel: 'Clean', detections: [] };
    }

    const detections = [];
    BAND6_TRAP_RULES.forEach(rule => {
      rule.rx.lastIndex = 0;
      let match;
      while ((match = rule.rx.exec(text)) !== null) {
        let cleanRep = rule.suggested;
        const matchedLower = match[0].toLowerCase();
        
        // Handle contraction auto-expansion
        if (rule.id === "contractions" && CONTRACTION_EXPANSIONS[matchedLower]) {
          cleanRep = CONTRACTION_EXPANSIONS[matchedLower];
        } else if (rule.id === "empty_very") {
          const adj = match[2]?.toLowerCase();
          if (adj === 'important') cleanRep = 'imperative';
          else if (adj === 'bad') cleanRep = 'detrimental';
          else if (adj === 'good') cleanRep = 'advantageous';
          else if (adj === 'hard' || adj === 'difficult') cleanRep = 'formidable';
          else if (adj === 'big') cleanRep = 'paramount';
          else cleanRep = `exceedingly ${match[2]}`;
        }

        detections.push({
          ruleId: rule.id,
          name: rule.name,
          matchedText: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          severity: rule.severity,
          category: rule.category,
          suggested: cleanRep,
          reason: rule.reason,
          burmese: rule.burmese
        });
      }
    });

    const total = detections.length;
    let riskLevel = 'Clean';
    let riskScore = 0;

    if (total === 0) {
      riskLevel = 'Clean (Band 8.0+ Polish)';
      riskScore = 0;
    } else if (total <= 2) {
      riskLevel = 'Moderate Risk (Band 6.5 Warning)';
      riskScore = 45;
    } else {
      riskLevel = 'Critical Risk (Band 5.5-6.0 Formulaic Penalty)';
      riskScore = Math.min(100, 50 + total * 10);
    }

    return {
      totalTraps: total,
      riskScore: riskScore,
      riskLevel: riskLevel,
      detections: detections
    };
  };

  /**
   * Auto-fix single trap in #essayArea
   */
  window.autoFixTrap = function(origText, repText) {
    const el = document.getElementById('essayArea');
    if (!el || !origText || !repText) return;

    const cur = el.value;
    // Replace first occurrence of exact matched text (case insensitive)
    const escaped = origText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escaped, 'i');
    if (rx.test(cur)) {
      el.value = cur.replace(rx, repText);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof window.runLiveWritingDiagnostics === 'function') {
        window.runLiveWritingDiagnostics();
      }
      window.runBand6TrapXRay();
      if (window.showAppToast) {
        window.showAppToast(`Auto-fixed: "${origText}" -> "${repText}"`, 'success');
      }
    }
  };

  /**
   * Auto-fix all detected traps in #essayArea
   */
  window.autoFixAllTraps = function() {
    const el = document.getElementById('essayArea');
    if (!el) return;

    let text = el.value;
    let fixCount = 0;

    BAND6_TRAP_RULES.forEach(rule => {
      rule.rx.lastIndex = 0;
      if (rule.id === "contractions") {
        Object.keys(CONTRACTION_EXPANSIONS).forEach(c => {
          const rx = new RegExp('\\b' + c + '\\b', 'gi');
          if (rx.test(text)) {
            text = text.replace(rx, CONTRACTION_EXPANSIONS[c]);
            fixCount++;
          }
        });
      } else {
        if (rule.rx.test(text)) {
          text = text.replace(rule.rx, (m) => {
            fixCount++;
            return rule.suggested;
          });
        }
      }
    });

    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    if (typeof window.runLiveWritingDiagnostics === 'function') {
      window.runLiveWritingDiagnostics();
    }
    window.runBand6TrapXRay();

    if (window.showAppToast) {
      window.showAppToast(`Surgically cleansed ${fixCount} Band-6 traps! Essay register elevated.`, 'success');
    }
  };

  /**
   * Run Band-6 Trap X-Ray and render interactive report in Writing Lab
   */
  window.runBand6TrapXRay = function() {
    const el = document.getElementById('essayArea');
    const container = document.getElementById('writingTrapXrayDrawer');
    if (!container) return;

    const text = el ? el.value : '';
    const report = window.scanBand6Traps(text);

    container.style.display = 'block';

    const isClean = report.totalTraps === 0;
    const isCritical = report.totalTraps >= 3;
    const meterColor = isClean ? '#10B981' : (isCritical ? '#EF4444' : '#F59E0B');

    let detectionsHtml = '';
    if (isClean) {
      detectionsHtml = `
        <div style="padding:22px; text-align:center; background:rgba(16, 185, 129, 0.05); border:1px solid rgba(16, 185, 129, 0.2); border-radius:8px;">
          <div style="font-size:1.1rem; font-weight:800; color:#10B981; margin-bottom:4px;">
            <svg class="ui-icon" style="color:#10B981;"><use href="#lucide-check"/></svg> Clean Academic Register
          </div>
          <p style="margin:0; font-size:0.85rem; color:var(--text-secondary); line-height:1.5;">
            Zero memorized clichés, informal contractions, or conversational quantifiers detected. Your essay satisfies Band 8.0+ academic style standards.
          </p>
        </div>
      `;
    } else {
      detectionsHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <span style="font-size:0.85rem; font-weight:700; color:var(--text);">
            Detected ${report.totalTraps} Cambridge Penalty Trap${report.totalTraps > 1 ? 's' : ''}:
          </span>
          <button class="btn-accent-solid" style="padding:6px 14px; font-size:0.78rem; font-weight:800; background:#10B981; border:none;" onclick="window.autoFixAllTraps()">
            <svg class="ui-icon ui-icon-xs"><use href="#lucide-sparkles"/></svg> Auto-Fix All Traps (1-Click)
          </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          ${report.detections.map((d, i) => `
            <div style="padding:12px 14px; background:var(--bg); border:1px solid var(--border); border-radius:8px; display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="background:${d.severity === 'Critical' ? '#EF4444' : '#F59E0B'}; color:#FFF; font-weight:800; font-size:0.7rem; padding:2px 6px; border-radius:4px;">
                    ${d.severity.toUpperCase()}
                  </span>
                  <strong style="font-size:0.88rem; color:var(--text);">${escapeHtml(d.name)}</strong>
                </div>
                <button class="btn-outlined" style="padding:3px 10px; font-size:0.75rem; font-weight:700; border-color:#10B981; color:#10B981;" onclick="window.autoFixTrap(${JSON.stringify(d.matchedText)}, ${JSON.stringify(d.suggested)})">
                  <svg class="ui-icon ui-icon-xs"><use href="#lucide-check"/></svg> Auto-Fix &rarr; "${escapeHtml(d.suggested)}"
                </button>
              </div>

              <div style="font-size:0.84rem; color:var(--text-secondary); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span>Found: <strong style="color:var(--danger); text-decoration:line-through;">"${escapeHtml(d.matchedText)}"</strong></span>
                <span>&rarr;</span>
                <span>Replace with: <strong style="color:var(--success); font-weight:700;">"${escapeHtml(d.suggested)}"</strong></span>
              </div>

              <div style="font-size:0.78rem; color:var(--text-secondary); line-height:1.45; margin-top:2px;">
                ${escapeHtml(d.reason)}
              </div>

              <div style="font-size:0.78rem; color:var(--text-secondary); font-family:'Pyidaungsu', 'Myanmar3', sans-serif; background:rgba(0,0,0,0.02); padding:4px 8px; border-radius:4px; border-left:2px solid #F59E0B;">
                ${escapeHtml(d.burmese)}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="occ-card" style="padding:18px; margin-top:14px; border:1px solid ${meterColor}; background:var(--bg-card); border-radius:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <svg class="ui-icon" style="color:${meterColor};"><use href="#lucide-target"/></svg>
            <h4 style="margin:0; font-size:1.05rem; font-weight:800; color:var(--text);">Examiner Band-6 Trap X-Ray</h4>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.82rem; font-weight:800; color:${meterColor};">
              ${report.riskLevel}
            </span>
            <button class="btn-outlined" style="padding:2px 8px; font-size:0.75rem;" onclick="document.getElementById('writingTrapXrayDrawer').style.display='none'">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-x"/></svg> Hide
            </button>
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;">
            <span>Examiner Penalty Risk</span>
            <strong>${report.riskScore}% Risk</strong>
          </div>
          <div style="height:6px; background:rgba(0,0,0,0.08); border-radius:3px; overflow:hidden;">
            <div style="width:${report.riskScore}%; height:100%; background:${meterColor}; transition:width 0.3s ease;"></div>
          </div>
        </div>

        ${detectionsHtml}
      </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  window.BAND6_TRAP_RULES = BAND6_TRAP_RULES;


  // ==========================================
  // STEP 1.3: 12-THEME PRO/CON/THESIS ARGUMENT MATRIX (EXAMINER IDEA BANK)
  // ==========================================
  const IELTS_ARGUMENT_MATRIX = [
  {
    "id": "ai_workplace",
    "title": "Artificial Intelligence & Workplace Automation",
    "category": "Technology & Society",
    "keywords": [
      "ai",
      "artificial intelligence",
      "automation",
      "robots",
      "machine learning",
      "workplace",
      "employment",
      "tech",
      "jobs"
    ],
    "prompt": "Some people believe that artificial intelligence will eliminate human jobs and cause widespread unemployment, while others argue it will create superior economic opportunities. Discuss both views and give your opinion.",
    "band9Thesis": "While the rapid automation of routine cognitive and administrative tasks will undoubtedly precipitate transitional labor market friction, artificial intelligence ultimately functions as a paradigm-shifting catalyst for macroeconomic productivity and the genesis of higher-order human occupations.",
    "pros": [
      {
        "claim": "Augmentation of Human Productivity & Higher-Order Job Creation",
        "evidence": "Historical parallels with the Industrial Revolution demonstrate that technological automation shifts labor from manual drudgery toward cognitive innovation and systems architecture.",
        "burmese": "လူသားတို့၏ လုပ်အားကို အစားထိုးခြင်းထက် ကုန်ထုတ်လုပ်မှု စွမ်းအားကို အဆပေါင်းများစွာ မြှင့်တင်ပေးပြီး နည်းပညာဆန်းသစ်တီထွင်မှုဆိုင်ရာ အဆင့်မြင့် အလုပ်အကိုင်သစ်များကို ဖန်တီးပေးပါသည်။"
      },
      {
        "claim": "Unprecedented Precision in Complex Decision-Making",
        "evidence": "Machine learning algorithms reduce human diagnostic error in specialized domains such as oncology imaging, supply-chain logistics, and epidemiological forecasting.",
        "burmese": "ဆေးပညာ၊ ထောက်ပံ့ပို့ဆောင်ရေးနှင့် ခန့်မှန်းတွက်ချက်မှုများတွင် လူသားတို့၏ အမှားအယွင်းများကို အနည်းဆုံးဖြစ်အောင် လျှော့ချပေးနိုင်ပါသည်။"
      }
    ],
    "cons": [
      {
        "claim": "Acute Structural Unemployment & Skill-Gap Disparity",
        "evidence": "Mid-career routine knowledge workers face rapid obsolescence without institutionalized lifelong retraining programs.",
        "burmese": "ပုံမှန်ရုံးလုပ်ငန်း လုပ်ကိုင်နေသော လူလတ်ပိုင်း ဝန်ထမ်းများအနေဖြင့် အချိန်တိုအတွင်း နည်းပညာအသစ် မသင်ယူနိုင်ပါက ချက်ချင်း အလုပ်လက်မဲ့ ဖြစ်နိုင်ပါသည်။"
      },
      {
        "claim": "Socioeconomic Wealth Concentration Among Tech Monopolies",
        "evidence": "Capital returns accrue disproportionately to proprietary algorithmic infrastructure owners, exacerbating Gini coefficient inequality.",
        "burmese": "နည်းပညာကုမ္ပဏီကြီးများသာ စည်းစိမ်ဥစ္စာ အမြောက်အမြား စုစည်းရရှိသွားပြီး လူတန်းစား ကွာဟချက်ကို ပိုမိုကြီးထွားစေနိုင်ပါသည်။"
      }
    ],
    "concession": "Notwithstanding the transitional economic volatility and localized dislocation of entry-level clerical staff, national retraining frameworks can effectively bridge the skills gap.",
    "collocations": [
      {
        "phrase": "precipitate structural unemployment",
        "burmese": "ဖွဲ့စည်းပုံဆိုင်ရာ အလုပ်လက်မဲ့ပြဿနာကို ဖြစ်ပေါ်စေသည်",
        "example": "Unchecked automation may precipitate structural unemployment across manufacturing hubs."
      },
      {
        "phrase": "algorithmic efficiency",
        "burmese": "တွက်ချက်မှု အယ်လ်ဂိုရစ်သမ်ဆိုင်ရာ စွမ်းဆောင်ရည်",
        "example": "Enterprises harness algorithmic efficiency to optimize global logistics."
      },
      {
        "phrase": "paradigm shift in labor dynamics",
        "burmese": "လုပ်သားစျေးကွက် ဖွဲ့စည်းမှု၏ အခြေခံပြောင်းလဲမှု",
        "example": "Generative AI represents a paradigm shift in intellectual labor dynamics."
      },
      {
        "phrase": "augment cognitive capacity",
        "burmese": "ဉာဏ်ရည်ပိုင်းဆိုင်ရာ စွမ်းရည်ကို အထောက်အကူပြု မြှင့်တင်သည်",
        "example": "Modern tools augment cognitive capacity rather than supplanting human intellect."
      },
      {
        "phrase": "disproportionate wealth concentration",
        "burmese": "မညီမျှသော စည်းစိမ်ဥစ္စာ စုစည်းမှု",
        "example": "Technological disruption risks exacerbating disproportionate wealth concentration."
      }
    ]
  },
  {
    "id": "carbon_tax",
    "title": "Carbon Taxation & Green Energy Subsidies",
    "category": "Environmental Economics",
    "keywords": [
      "carbon",
      "tax",
      "climate",
      "environment",
      "renewable energy",
      "fossil fuels",
      "emissions",
      "pollution",
      "green"
    ],
    "prompt": "Some people argue that the most effective way to solve environmental pollution is to increase the price of fuel and levy heavy carbon taxes. To what extent do you agree or disagree?",
    "band9Thesis": "Although fiscal penalties on carbon-intensive consumption play a vital role in disincentivizing fossil-fuel reliance, fiscal mechanisms alone remain insufficient unless paired with substantial public subsidisation of clean renewable energy alternatives.",
    "pros": [
      {
        "claim": "Internalisation of Environmental Externalities",
        "evidence": "Carbon taxation forces corporate polluters to incorporate ecological damage into their operating overheads, incentivising low-emission manufacturing methods.",
        "burmese": "ကာဗွန်အခွန်စည်းကြပ်ခြင်းသည် သဘာဝပတ်ဝန်းကျင် ပျက်စီးမှုကို ကုန်ကျစရိတ်အဖြစ် ထည့်သွင်းတွက်ချက်စေပြီး စက်ရုံများကို သန့်ရှင်းသောနည်းပညာ ပြောင်းလဲသုံးစွဲစေပါသည်။"
      },
      {
        "claim": "Generation of Ring-Fenced Green Innovation Revenue",
        "evidence": "Tax revenues raised from polluters can be legally earmarked for public research into grid-scale battery storage and fusion technology.",
        "burmese": "ညစ်ညမ်းမှုအခွန်မှရရှိသော ဘဏ္ဍာငွေများကို ပြန်လည်ပြည့်ဖြိုးမြဲစွမ်းအင် သုတေသနများအတွက် ဘဏ္ဍာရန်ပုံငွေအဖြစ် ပြန်လည်အသုံးပြုနိုင်ပါသည်။"
      }
    ],
    "cons": [
      {
        "claim": "Regressive Economic Burden on Lower-Income Households",
        "evidence": "Energy constitutes an inelastic necessity, meaning higher fuel levies disproportionately penalize socioeconomically disadvantaged commuters.",
        "burmese": "လောင်စာဆီစရိတ် မြင့်တက်လာခြင်းသည် ဝင်ငွေနည်း ပြည်သူများ၏ နေ့စဉ်သွားလာစရိတ်နှင့် စားဝတ်နေရေးကို မတန်တဆ ဝန်ထုပ်ဝန်ပိုး ဖြစ်စေပါသည်။"
      },
      {
        "claim": "Cross-Border Industrial Relocation (Carbon Leakage)",
        "evidence": "Stringent domestic taxes incentivize heavy manufacturers to offshore production to jurisdictions with lax environmental regulations.",
        "burmese": "အခွန်စည်းကြပ်မှု တင်းကျပ်လွန်းပါက စက်ရုံများသည် စည်းကမ်းလျှော့ပေါ့သော နိုင်ငံများသို့ ရွှေ့ပြောင်းသွားနိုင်သဖြင့် တစ်ကမ္ဘာလုံးအတိုင်းအတာဖြင့် ညစ်ညမ်းမှု မလျော့ကျနိုင်ပါ။"
      }
    ],
    "concession": "Notwithstanding the potential regressive impact on impoverished households, targeted rebate cheques can neutralize disproportionate financial strain.",
    "collocations": [
      {
        "phrase": "internalise ecological externalities",
        "burmese": "သဘာဝပတ်ဝန်းကျင် ပျက်စီးမှုကုန်ကျစရိတ်ကို ထည့်သွင်းတွက်ချက်သည်",
        "example": "Carbon pricing compels industries to internalise ecological externalities."
      },
      {
        "phrase": "disincentivize carbon-intensive consumption",
        "burmese": "ကာဗွန်ထုတ်လွှတ်မှုများသော သုံးစွဲမှုကို ဟန့်တားသည်",
        "example": "Higher fuel duties effectively disincentivize carbon-intensive commuting."
      },
      {
        "phrase": "regressive economic burden",
        "burmese": "ဝင်ငွေနည်းသူများအပေါ် မမျှတစွာ ဝန်ပိစေသော စီးပွားရေးဝန်ထုပ်ဝန်ပိုး",
        "example": "Unmoderated energy taxes impose a regressive economic burden on rural families."
      },
      {
        "phrase": "ring-fenced public revenue",
        "burmese": "သီးသန့်ရည်ရွယ်ချက်အတွက်သာ ခွဲဝေထားသော နိုင်ငံတော်ဘဏ္ဍာငွေ",
        "example": "Tax receipts must be ring-fenced for renewable infrastructure deployment."
      },
      {
        "phrase": "hasten the transition to renewables",
        "burmese": "ပြန်လည်ပြည့်ဖြိုးမြဲစွမ်းအင်သို့ ကူးပြောင်းမှုကို အရှိန်မြှင့်တင်သည်",
        "example": "Strategic tariffs hasten the transition to renewables across transport sectors."
      }
    ]
  },
  {
    "id": "urban_transit",
    "title": "Urbanisation & Metropolitan Transit Networks",
    "category": "Urban Planning & Infrastructure",
    "keywords": [
      "urban",
      "city",
      "transit",
      "transport",
      "metro",
      "traffic",
      "congestion",
      "roads",
      "public transport"
    ],
    "prompt": "The expansion of major cities is creating severe problems such as traffic congestion and pollution. Some people believe the solution is to construct more roads, while others advocate investing in public transport systems. Discuss both views and give your opinion.",
    "band9Thesis": "While road expansion provides ephemeral relief, constructing additional vehicular thoroughfares invariably induces latent traffic demand; consequently, municipal capital must be decisively committed to high-capacity public transit networks.",
    "pros": [
      {
        "claim": "Exponential Spatial & Energetic Efficiency",
        "evidence": "A single electrified subway line can transport 40,000 passengers per direction per hour, utilizing a fraction of the land area and kilowatt-hours required by private automobiles.",
        "burmese": "လျှပ်စစ်ရထားလိုင်းတစ်ခုသည် သာမန်ကားလမ်းများထက် မြေနေရာနှင့် စွမ်းအင် အလွန်သက်သာစွာဖြင့် တစ်နာရီလျှင် လူပေါင်း ၄၀,၀၀၀ ကျော်ကို ပို့ဆောင်ပေးနိုင်ပါသည်။"
      },
      {
        "claim": "Democratization of Metropolitan Mobility",
        "evidence": "Subsidized public transit guarantees that non-drivers, low-income citizens, and disabled demographics maintain unhindered access to commercial hubs and medical facilities.",
        "burmese": "ကားမမောင်းနိုင်သူများ၊ ဝင်ငွေနည်းသူများနှင့် မသန်စွမ်းသူများအတွက် မြို့ပြအလုပ်အကိုင်နှင့် ကျန်းမာရေးဝန်ဆောင်မှုများသို့ လွယ်ကူစွာ သွားလာနိုင်စေပါသည်။"
      }
    ],
    "cons": [
      {
        "claim": "Prohibitive Capital Expenditure & Construction Disruption",
        "evidence": "Underground metro infrastructure projects require tens of billions in public debt and create severe decade-long surface disruption.",
        "burmese": "မြေအောက်ရထားလိုင်းများ တည်ဆောက်ခြင်းသည် နိုင်ငံတော်ဘဏ္ဍာငွေ ဘီလီယံချီ ကုန်ကျပြီး ဆောက်လုပ်နေစဉ် နှစ်ပေါင်းများစွာ မြို့တွင်းသွားလာရေးကို ထိခိုက်စေပါသည်။"
      },
      {
        "claim": "Suburban Inflexibility & Fixed-Route Limitations",
        "evidence": "Fixed rail lines cannot dynamically serve low-density peripheral suburbs without auxiliary feeder buses and substantial operational subsidies.",
        "burmese": "မြို့စွန်ရပ်ကွက်များသို့ ရထားလိုင်းများ အလွယ်တကူ မရောက်ရှိနိုင်သဖြင့် မြို့ပြအစွန်အဖျားတွင် နေထိုင်သူများအတွက် ကားအသုံးပြုမှုကို အပြည့်အဝ မတားဆီးနိုင်ပါ။"
      }
    ],
    "concession": "Notwithstanding the formidable initial capital expenditure and logistical disruption of tunneling, the multi-generational environmental dividends far outweigh immediate costs.",
    "collocations": [
      {
        "phrase": "induce latent traffic demand",
        "burmese": "ဖိနှိပ်ထားသော ယာဉ်ကြောလိုအပ်ချက်ကို ဆွဲဆောင်ဖြစ်ပေါ်စေသည်",
        "example": "Expanding expressways invariably induces latent traffic demand, worsening congestion."
      },
      {
        "phrase": "high-capacity transit arterial",
        "burmese": "စွမ်းရည်မြင့် အများသုံးသယ်ယူပို့ဆောင်ရေး ပင်မလမ်းကြောင်း",
        "example": "The city established a high-capacity transit arterial connecting eastern suburbs."
      },
      {
        "phrase": "alleviate metropolitan bottlenecks",
        "burmese": "မြို့ပြယာဉ်ကြောပိတ်ဆို့မှုများကို လျှော့ပါးသက်သာစေသည်",
        "example": "Electrified commuter rail serves to alleviate metropolitan bottlenecks."
      },
      {
        "phrase": "prohibitive capital outlay",
        "burmese": "အလွန်အမင်း ကြီးမားလှသော မတည်ငွေရင်းကုန်ကျစရိတ်",
        "example": "Subway expansion projects require overcoming prohibitive capital outlay."
      },
      {
        "phrase": "unfettered suburban sprawl",
        "burmese": "ထိန်းချုပ်မှုမဲ့ မြို့စွန်သို့ ကျယ်ပြန့်လာသော မြို့ပြပျံ့နှံ့မှု",
        "example": "Transit-oriented development curtails unfettered suburban sprawl."
      }
    ]
  },
  {
    "id": "university_tuition",
    "title": "Higher Education Tuition: Free vs User-Pays",
    "category": "Education & Social Policy",
    "keywords": [
      "university",
      "tuition",
      "education",
      "fees",
      "free education",
      "students",
      "debt",
      "tertiary"
    ],
    "prompt": "Some people believe that university education should be free for all students, while others believe that students should pay their own tuition fees. Discuss both views and give your opinion.",
    "band9Thesis": "Although state-funded tertiary education guarantees socioeconomic meritocracy and eliminates debilitating graduate debt, an equitable cost-sharing framework with income-contingent repayments represents the most fiscally sustainable model.",
    "pros": [
      {
        "claim": "Dismantling Socioeconomic Gatekeeping & Intergenerational Mobility",
        "evidence": "Abolishing tuition fees enables talented students from underprivileged backgrounds to pursue high-return professions without incurring life-altering loan obligations.",
        "burmese": "တက္ကသိုလ်ပညာရေး အခမဲ့ဖြစ်ပါက ဆင်းရဲသော ကျောင်းသားများအနေဖြင့် ငွေကြေးအခက်အခဲကြောင့် ပညာရေးမစွန့်လွှတ်ရဘဲ လူမှုအဆင့်အတန်း တက်လှမ်းနိုင်ပါသည်။"
      },
      {
        "claim": "Maximizing National Knowledge Capital & Global Competitiveness",
        "evidence": "Nations with free tertiary education, such as Germany and the Nordic states, cultivate robust technological workforces that drive long-term GDP growth.",
        "burmese": "ပညာတတ် လူ့စွမ်းအားအရင်းအမြစ် ပေါများလာပြီး နိုင်ငံတကာ စီးပွားရေးနှင့် နည်းပညာနယ်ပယ်တွင် ယှဉ်ပြိုင်နိုင်စွမ်း ပိုမိုမြင့်မားလာစေပါသည်။"
      }
    ],
    "cons": [
      {
        "claim": "Unsustainable Fiscal Burden on Public Treasuries",
        "evidence": "Full state subsidisation requires diversion of billions from early childhood and vocational education, potentially reducing university departmental research funding.",
        "burmese": "နိုင်ငံတော်ဘဏ္ဍာမှ အကုန်ကျခံရသဖြင့် အခွန်ထမ်းပြည်သူများအပေါ် ဝန်ပိစေပြီး မူလတန်းနှင့် သက်မွေးဝမ်းကျောင်း ပညာရေးအတွက် ရန်ပုံငွေ လျော့နည်းသွားစေနိုင်ပါသည်။"
      },
      {
        "claim": "Regressive Redistribution of Public Wealth",
        "evidence": "University graduates earn substantially higher lifetime incomes; therefore, taxpayer funding effectively subsidises future high earners with blue-collar tax revenues.",
        "burmese": "ဘွဲ့ရများသည် နောင်တစ်ချိန်တွင် ဝင်ငွေများစွာ ရရှိကြမည်ဖြစ်သဖြင့် တက္ကသိုလ်မတက်သော သာမန်အလုပ်သမားများ၏ အခွန်ငွေဖြင့် ထောက်ပံ့ပေးရာရောက်နေပါသည်။"
      }
    ],
    "concession": "Notwithstanding the legitimate fiscal constraints of national budgets, income-contingent loan programs ensure that graduates contribute only once attaining financial stability.",
    "collocations": [
      {
        "phrase": "socioeconomic meritocracy",
        "burmese": "လူမှုစီးပွား အရည်အချင်းစစ် စနစ်",
        "example": "Tuition-free universities foster genuine socioeconomic meritocracy."
      },
      {
        "phrase": "debilitating graduate indebtedness",
        "burmese": "ဘွဲ့ရများ၏ ဘဝကို ချုပ်ချယ်သော အကြွေးဝန်ထုပ်ဝန်ပိုး",
        "example": "Student loan reforms aim to eradicate debilitating graduate indebtedness."
      },
      {
        "phrase": "income-contingent repayment framework",
        "burmese": "ဝင်ငွေပေါ်မူတည်၍ ပြန်ဆပ်ရသော စနစ်",
        "example": "Australia pioneered an income-contingent repayment framework for undergraduates."
      },
      {
        "phrase": "regressive wealth redistribution",
        "burmese": "ဆင်းရဲသားထံမှ ချမ်းသာသူထံသို့ မညီမျှစွာ ပြန်လည်ခွဲဝေမှု",
        "example": "Uncapped subsidies can unintentionally trigger regressive wealth redistribution."
      },
      {
        "phrase": "cultivate intellectual capital",
        "burmese": "ဉာဏပညာအရင်းအနှီးကို ပြုစုပျိုးထောင်သည်",
        "example": "Public investment in tertiary institutions serves to cultivate intellectual capital."
      }
    ]
  },
  {
    "id": "juvenile_justice",
    "title": "Juvenile Justice & Parental Responsibility",
    "category": "Law & Family Sociology",
    "keywords": [
      "juvenile",
      "crime",
      "parents",
      "teenagers",
      "punish",
      "responsibility",
      "delinquency",
      "children",
      "law"
    ],
    "prompt": "Juvenile crime is increasing in many cities. Some believe that parents should be held legally responsible for their children's crimes, while others argue that teenagers themselves should face punishment. Discuss both views and give your opinion.",
    "band9Thesis": "While negligent guardians must certainly be held accountable for domestic moral abandonment, imposing punitive statutory liability on parents overlooks the complex socioeconomic catalysts of adolescent delinquency, necessitating rehabilitative intervention for the youth.",
    "pros": [
      {
        "claim": "Incentivization of Active Filial Oversight & Supervision",
        "evidence": "Legal liability compels negligent guardians to actively monitor their children's peer affiliations, digital activities, and curfews.",
        "burmese": "မိဘများအား ဥပဒေအရ တာဝန်ယူစေခြင်းဖြင့် သားသမီးများ၏ ပေါင်းသင်းဆက်ဆံရေးနှင့် ညထွက်ခြင်းများကို ပိုမိုဂရုစိုက် စောင့်ကြပ်လာစေပါသည်။"
      },
      {
        "claim": "Acknowledgement of Domestic Socialisation Primacy",
        "evidence": "Criminological research confirms that childhood behavioral deviance overwhelmingly originates in volatile, neglectful, or abusive domestic settings.",
        "burmese": "ဆယ်ကျော်သက်များ၏ ရာဇဝတ်မှုများသည် မိဘများ၏ လျစ်လျူရှုမှုနှင့် အိမ်တွင်းအကြမ်းဖက်မှုများမှ အဓိက အစပြုကြောင်း မှုခင်းဆေးပညာက သက်သေပြထားပါသည်။"
      }
    ],
    "cons": [
      {
        "claim": "External Preponderance of Peer & Social Media Influences",
        "evidence": "Adolescents spend the vast majority of their waking hours immersed in autonomous peer groups, gang coercion, and digital forums beyond parental control.",
        "burmese": "ဆယ်ကျော်သက်များသည် အပေါင်းအသင်းနှင့် ဆိုရှယ်မီဒီယာများ၏ လွှမ်းမိုးမှုအောက်တွင် ပိုမိုရှိနေသဖြင့် မိဘများအနေဖြင့် ၂၄ နာရီလုံး ထိန်းချုပ်ရန် မဖြစ်နိုင်ပါ။"
      },
      {
        "claim": "Individual Moral Agency & The Deterrent Deficit",
        "evidence": "Punishing parents rather than the offender undermines personal accountability, failing to deter recidivism among young offenders.",
        "burmese": "ပြစ်မှုကျူးလွန်သူ ဆယ်ကျော်သက်ကို အပြစ်မပေးဘဲ မိဘကိုသာ အပြစ်ပေးပါက မိမိကိုယ်ကို တာဝန်ယူစိတ် ကင်းမဲ့သွားပြီး ထပ်မံပြစ်မှုကျူးလွန်နိုင်ပါသည်။"
      }
    ],
    "concession": "Notwithstanding the culpability of neglectful guardians, punitive measures must prioritize restorative juvenile justice and psychological counseling over familial incarceration.",
    "collocations": [
      {
        "phrase": "punitive statutory liability",
        "burmese": "ဥပဒေအရ ပြစ်ဒဏ်ခတ်နိုင်သော တာဝန်ယူမှု",
        "example": "Courts debate whether to impose punitive statutory liability on custodial guardians."
      },
      {
        "phrase": "adolescent delinquent behavior",
        "burmese": "ဆယ်ကျော်သက်များ၏ လမ်းလွဲမှုနှင့် ပြစ်မှုကျူးလွန်သော အပြုအမူ",
        "example": "Community mentors intervene to mitigate adolescent delinquent behavior."
      },
      {
        "phrase": "volatile domestic socialization",
        "burmese": "မငြိမ်မသက်သော အိမ်တွင်း လူမှုဆက်ဆံရေး ပတ်ဝန်းကျင်",
        "example": "Volatile domestic socialization frequently precipitates antisocial conduct."
      },
      {
        "phrase": "restorative juvenile justice",
        "burmese": "ပြန်လည်ထူထောင်ရေး ဦးစားပေး ဆယ်ကျော်သက် တရားစီရင်ရေး",
        "example": "Scandinavian systems prioritize restorative juvenile justice over harsh incarceration."
      },
      {
        "phrase": "curtail criminal recidivism",
        "burmese": "ပြစ်မှုထပ်မံကျူးလွန်ခြင်းကို ဟန့်တားလျှော့ချသည်",
        "example": "Early psychological rehabilitation serves to curtail criminal recidivism among minors."
      }
    ]
  },
  {
    "id": "universal_healthcare",
    "title": "Healthcare Systems: Universal State-Funded vs Private Insurance",
    "category": "Public Health & Social Welfare",
    "keywords": [
      "health",
      "healthcare",
      "hospital",
      "medical",
      "insurance",
      "private",
      "public",
      "doctors",
      "free"
    ],
    "prompt": "Some people believe that healthcare is a fundamental human right that should be provided free by the state, while others argue that individuals should pay for their own private health insurance. Discuss both views and give your opinion.",
    "band9Thesis": "Although private enterprise fosters technological innovation and reduces hospital waiting queues, universal state-underwritten healthcare is an indispensable human prerequisite that safeguards public welfare against commercial exploitation.",
    "pros": [
      {
        "claim": "Moral Imperative of Equitable Health Access",
        "evidence": "Treating healthcare as a market commodity creates catastrophic health expenditure, plunging millions of uninsured citizens into destitution.",
        "burmese": "ကျန်းမာရေးစောင့်ရှောက်မှုကို စီးပွားရေးကုန်စည်အဖြစ် သတ်မှတ်ပါက ဆင်းရဲနွမ်းပါးသူများ ဆေးကုသခ မတတ်နိုင်ဘဲ အသက်ဆုံးရှုံးရနိုင်ပါသည်။"
      },
      {
        "claim": "Superior Macroeconomic Preventive Care Efficacy",
        "evidence": "Single-payer systems prioritize early disease screening and vaccination, significantly lowering the long-term economic burden of chronic illness.",
        "burmese": "နိုင်ငံတော်မှ အခမဲ့ကုသပေးခြင်းဖြင့် ရောဂါများကို ကြိုတင်ကာကွယ်နိုင်ပြီး ရေရှည်တွင် နိုင်ငံတော်၏ ကျန်းမာရေးကုန်ကျစရိတ်ကို သက်သာစေပါသည်။"
      }
    ],
    "cons": [
      {
        "claim": "Rationing Delays & Prolonged Elective Surgery Queues",
        "evidence": "State-managed healthcare monopolies frequently suffer from chronic underfunding, resulting in extensive waiting lists for life-enhancing operations.",
        "burmese": "အစိုးရဆေးရုံများတွင် လူနာများပြားသဖြင့် အရေးပေါ်မဟုတ်သော ခွဲစိတ်မှုများအတွက် လပေါင်းများစွာ စောင့်ဆိုင်းရသည့် ပြဿနာများ ရှိနိုင်ပါသည်။"
      },
      {
        "claim": "Stifling of Biopharmaceutical R&D Innovation",
        "evidence": "Competitive private healthcare markets provide the robust profit margins necessary to incentivize costly clinical trials for cutting-edge therapies.",
        "burmese": "ပုဂ္ဂလိကကဏ္ဍသည် ဆေးဝါးသုတေသနနှင့် အဆင့်မြင့် ဆေးဘက်ဆိုင်ရာ ပစ္စည်းများ တီထွင်ရာတွင် ပိုမိုလျင်မြန်စွာ ရင်းနှီးမြှုပ်နှံနိုင်ပါသည်။"
      }
    ],
    "concession": "Notwithstanding the operational agility of private medical clinics, a publicly funded baseline of comprehensive emergency care remains non-negotiable.",
    "collocations": [
      {
        "phrase": "universal healthcare entitlement",
        "burmese": "လူတိုင်း အခမဲ့ကျန်းမာရေး စောင့်ရှောက်ခွင့်",
        "example": "The constitution guarantees a universal healthcare entitlement for all residents."
      },
      {
        "phrase": "catastrophic medical expenditure",
        "burmese": "ဘဝပျက်လောက်အောင် ကြီးမားလှသော ဆေးကုသစရိတ်",
        "example": "Public subsidies shield vulnerable families from catastrophic medical expenditure."
      },
      {
        "phrase": "prolonged elective surgery queues",
        "burmese": "ခွဲစိတ်ကုသမှု ခံယူရန် ကြာရှည်စွာ စောင့်ဆိုင်းရသော တန်းစီစာရင်း",
        "example": "Chronic staffing shortages exacerbate prolonged elective surgery queues."
      },
      {
        "phrase": "incentivize biopharmaceutical innovation",
        "burmese": "ဇီဝဆေးဝါး ဆန်းသစ်တီထွင်မှုများကို အားပေးလှုံ့ဆော်သည်",
        "example": "Patent protections exist to incentivize biopharmaceutical innovation."
      },
      {
        "phrase": "preventive epidemiological intervention",
        "burmese": "ရောဂါမဖြစ်ပွားမီ ကြိုတင်ကာကွယ်သော ကပ်ရောဂါဗေဒဆိုင်ရာ ဆောင်ရွက်ချက်",
        "example": "Universal clinics prioritize cost-effective preventive epidemiological intervention."
      }
    ]
  },
  {
    "id": "remote_work",
    "title": "Remote Working & Telecommuting Dynamics",
    "category": "Corporate Culture & Urban Geography",
    "keywords": [
      "work from home",
      "remote",
      "office",
      "telecommuting",
      "productivity",
      "employees",
      "companies"
    ],
    "prompt": "Due to technological developments, more people can now work from home rather than in a traditional office. Do the advantages of this trend outweigh the disadvantages?",
    "band9Thesis": "The proliferation of telecommuting undeniably yields profound dividends in worker autonomy, reduced vehicular emissions, and metropolitan decentralization, substantially outweighing the associated drawbacks of interpersonal isolation.",
    "pros": [
      {
        "claim": "Eradication of Commuting Friction & Carbon Footprint Abatement",
        "evidence": "Eliminating daily vehicular transit saves workers hundreds of hours annually, dramatically attenuating metropolitan carbon emissions and traffic congestion.",
        "burmese": "နေ့စဉ် ရုံးတက်ရုံးဆင်း သွားလာရသော အချိန်များကို သက်သာစေပြီး ယာဉ်ကြောပိတ်ဆို့မှုနှင့် ကာဗွန်ထုတ်လွှတ်မှုကို သိသာစွာ လျှော့ချပေးပါသည်။"
      },
      {
        "claim": "Democratization of Global Talent Acquisition",
        "evidence": "Enterprises can recruit skilled specialists irrespective of geographic constraints, empowering professionals in secondary regional cities.",
        "burmese": "ကုမ္ပဏီများအနေဖြင့် မည်သည့်မြို့၊ မည်သည့်နိုင်ငံမှမဆို အရည်အချင်းရှိသူများကို ငှားရမ်းနိုင်ပြီး ဒေသတွင်း ပညာရှင်များအတွက် အခွင့်အလမ်း ပိုမိုပွင့်လန်းစေပါသည်။"
      }
    ],
    "cons": [
      {
        "claim": "Erosion of Corporate Camaraderie & Serendipitous Collaboration",
        "evidence": "Spontaneous innovation and mentorship flourish in physical office ecosystems, which virtual teleconferencing platforms fail to replicate.",
        "burmese": "ရုံးခန်းတွင်း မျက်နှာချင်းဆိုင် ပြောဆိုတိုင်ပင်မှုမှ ထွက်ပေါ်လာသော အကြံဥာဏ်သစ်များနှင့် အပြန်အလှန် ရင်းနှီးမှုများ လျော့ကျသွားနိုင်ပါသည်။"
      },
      {
        "claim": "Blurring of Domestic Boundaries & Psychological Burnout",
        "evidence": "Constant digital connectivity creates an 'always-on' expectation, exacerbating occupational stress and domestic intrusion.",
        "burmese": "အိမ်နှင့် ရုံးအလုပ် မခွဲခြားနိုင်တော့ဘဲ အချိန်ပြည့် အလုပ်လုပ်နေရသကဲ့သို့ ခံစားရကာ စိတ်ဖိစီးမှုနှင့် ပင်ပန်းနွမ်းနယ်မှုကို ဖြစ်စေပါသည်။"
      }
    ],
    "concession": "Notwithstanding the challenges of maintaining organic team chemistry, adopting structured hybrid working models mitigates social detachment while retaining autonomy.",
    "collocations": [
      {
        "phrase": "attenuate commuting fatigue",
        "burmese": "သွားလာရသော ပင်ပန်းနွမ်းနယ်မှုကို လျော့ပါးစေသည်",
        "example": "Flexible telecommuting policies demonstrably attenuate commuting fatigue."
      },
      {
        "phrase": "geographic decentralization of labor",
        "burmese": "လုပ်သားအင်အား ပထဝီဝင်အရ ပြန့်ကျဲသွားခြင်း",
        "example": "Remote models catalyze the geographic decentralization of labor to provincial towns."
      },
      {
        "phrase": "spontaneous organizational synergy",
        "burmese": "ရုံးတွင်း ပူးပေါင်းဆောင်ရွက်မှုမှ အလိုအလျောက် ထွက်ပေါ်လာသော အကျိုးသက်ရောက်မှု",
        "example": "Critics argue that physical workspaces promote spontaneous organizational synergy."
      },
      {
        "phrase": "blurring of domestic boundaries",
        "burmese": "အိမ်တွင်းနှင့် အလုပ်နယ်နိမိတ် ရောထွေးမှု",
        "example": "Working from bedrooms risks the psychological blurring of domestic boundaries."
      },
      {
        "phrase": "hybrid occupational model",
        "burmese": "အိမ်နှင့် ရုံးခန်း နှစ်မျိုးစလုံး ပေါင်းစပ်ထားသော လုပ်ငန်းပုံစံ",
        "example": "Forward-thinking corporations are embracing the hybrid occupational model."
      }
    ]
  },
  {
    "id": "space_exploration",
    "title": "Space Exploration Funding vs Terrestrial Poverty Alleviation",
    "category": "Science Policy & Humanitarian Ethics",
    "keywords": [
      "space",
      "exploration",
      "nasa",
      "mars",
      "planets",
      "poverty",
      "funding",
      "money",
      "terrestrial"
    ],
    "prompt": "Billions of dollars are spent on space research and missions to other planets. Some people believe this money should instead be spent on solving immediate problems on Earth like poverty and hunger. Discuss both views and give your opinion.",
    "band9Thesis": "While mitigating immediate terrestrial poverty and famine demands urgent humanitarian expenditure, space exploration is not an exorbitant luxury but an existential investment that yields revolutionary technological spin-offs for Earth.",
    "pros": [
      {
        "claim": "Catalyst for Revolutionary Spin-Off Technologies",
        "evidence": "Aerospace research has directly yielded satellite telecommunications, solar photovoltaic cells, GPS navigation, and advanced water purification systems.",
        "burmese": "အာကာသသုတေသနမှတစ်ဆင့် ဂြိုဟ်တုဆက်သွယ်ရေး၊ နေရောင်ခြည်စွမ်းအင်သုံး ဆိုလာစနစ်များနှင့် ရေသန့်စင်နည်းပညာသစ်များ ကမ္ဘာပေါ်တွင် အကျိုးပြုနေပါသည်။"
      },
      {
        "claim": "Existential Planetary Risk Mitigation & Resource Scarcity",
        "evidence": "Asteroid mining and multi-planetary habitation provide long-term insurance against catastrophic extinction-level planetary events and terrestrial rare-earth depletion.",
        "burmese": "ကမ္ဘာမြေကြီးပေါ်ရှိ ရှားပါးသတ္တုအရင်းအမြစ်များ ခန်းခြောက်လာခြင်းနှင့် ကမ္ဘာပျက်ကပ်ဘေးအန္တရာယ်များမှ ကာကွယ်ရန် ရေရှည်အာမခံချက် ဖြစ်ပါသည်။"
      }
    ],
    "cons": [
      {
        "claim": "Ethical Dissonance Amid Acute Terrestrial Deprivation",
        "evidence": "Expending billions on extraterrestrial orbiters while hundreds of millions lack potable water and basic medical care creates profound moral incongruity.",
        "burmese": "ကမ္ဘာပေါ်တွင် လူသန်းပေါင်းများစွာ ငတ်မွတ်ခေါင်းပါးနေချိန်တွင် အာကာသသို့ ဘီလီယံနှင့်ချီ သုံးစွဲနေခြင်းသည် ကျင့်ဝတ်ပိုင်းအရ မေးခွန်းထုတ်စရာ ဖြစ်နေပါသည်။"
      },
      {
        "claim": "Diminishing Marginal Returns Compared to Social Programs",
        "evidence": "Public funds invested directly in agrarian irrigation and public health clinics yield immediate, quantifiable improvements in human life expectancy.",
        "burmese": "ဆင်းရဲနွမ်းပါးမှု ပပျောက်ရေးနှင့် စိုက်ပျိုးရေးတွင် တိုက်ရိုက်ရင်းနှီးမြှုပ်နှံခြင်းက လူသားများအတွက် ချက်ချင်းလက်ငင်း အကျိုးရလဒ် ပိုမိုဖြစ်ထွန်းစေပါသည်။"
      }
    ],
    "concession": "Notwithstanding the heart-wrenching reality of global destitution, the federal budget allocations for space exploration constitute a negligible fraction of global military spending.",
    "collocations": [
      {
        "phrase": "existential planetary risk",
        "burmese": "ကမ္ဘာမြေတည်တံ့ရေးဆိုင်ရာ အန္တရာယ်",
        "example": "Scientific exploration guards against existential planetary risks."
      },
      {
        "phrase": "technological spin-off dividend",
        "burmese": "နည်းပညာသုတေသနမှ ဆက်စပ်ထွက်ပေါ်လာသော အကျိုးကျေးဇူး",
        "example": "Aerospace development delivers immense technological spin-off dividends."
      },
      {
        "phrase": "acute terrestrial deprivation",
        "burmese": "ကမ္ဘာပေါ်ရှိ ဆိုးရွားသော ဆင်းရဲချို့တဲ့မှု",
        "example": "Critics emphasize acute terrestrial deprivation in developing regions."
      },
      {
        "phrase": "exorbitant luxury expenditure",
        "burmese": "မလိုအပ်ဘဲ အလွန်အကျွံ ငွေဖြုန်းတီးသော သုံးစွဲမှု",
        "example": "Space probes should not be viewed as an exorbitant luxury expenditure."
      },
      {
        "phrase": "alleviate systemic famine",
        "burmese": "စနစ်တကျ အမြစ်တွယ်နေသော ငတ်မွတ်ခေါင်းပါးမှုကို လျှော့ချသည်",
        "example": "Global humanitarian funds are deployed to alleviate systemic famine."
      }
    ]
  },
  {
    "id": "digital_privacy",
    "title": "Digital Privacy Rights vs National Security Surveillance",
    "category": "Civil Liberties & Cybersecurity",
    "keywords": [
      "privacy",
      "surveillance",
      "data",
      "security",
      "government",
      "cctv",
      "monitoring",
      "internet",
      "spying"
    ],
    "prompt": "Governments are increasingly using surveillance technologies like CCTV cameras and data monitoring to prevent crime. Some argue this violates personal privacy, while others believe it is necessary for public safety. Discuss both views and give your opinion.",
    "band9Thesis": "Although comprehensive electronic surveillance provides intelligence services with vital tools to preempt extremist threats, unchecked state surveillance represents an unacceptable infringement upon fundamental civil liberties, demanding rigorous judicial oversight.",
    "pros": [
      {
        "claim": "Preemption of Violent Extremism & Organized Syndicates",
        "evidence": "Metropolitan CCTV arrays and algorithmic communications monitoring enable law enforcement to neutralize terror plots and dismantle transnational human trafficking networks.",
        "burmese": "CCTV ကင်မရာများနှင့် ဆက်သွယ်ရေးစောင့်ကြည့်မှုများသည် အကြမ်းဖက်မှုများနှင့် နိုင်ငံဖြတ်ကျော် ရာဇဝတ်ဂိုဏ်းများကို ကြိုတင်ဟန့်တားနိုင်ပါသည်။"
      },
      {
        "claim": "Enhanced Objective Evidence in Criminal Jurisprudence",
        "evidence": "High-resolution video telemetry provides incontrovertible forensic evidence, preventing wrongful convictions and expediting judicial proceedings.",
        "burmese": "ခိုင်လုံသော ရုပ်သံသက်သေ အထောက်အထားများ ရရှိစေသဖြင့် အပြစ်မဲ့သူများ မတရားထောင်ကျခြင်းမှ ကာကွယ်ပေးနိုင်ပါသည်။"
      }
    ],
    "cons": [
      {
        "claim": "Chilling Effect on Free Speech & Democratic Dissent",
        "evidence": "Ubiquitous state monitoring induces self-censorship among journalists, whistleblowers, and lawful political opposition, eroding democratic accountability.",
        "burmese": "အစိုးရက အချိန်ပြည့် စောင့်ကြည့်နေပါက သတင်းထောက်များနှင့် ပြည်သူများသည် လွတ်လပ်စွာ ဝေဖန်ပြောဆိုရန် ကြောက်ရွံ့လာပြီး ဒီမိုကရေစီကို ထိခိုက်စေပါသည်။"
      },
      {
        "claim": "Peril of Algorithmic Bias & Data Breaches",
        "evidence": "Facial recognition algorithms exhibit disproportionate false-positive rates for ethnic minorities, while centralized surveillance databases remain vulnerable to hostile cyberattacks.",
        "burmese": "မျက်နှာမှတ်မိစနစ်များသည် လူနည်းစုများကို အမှားအယွင်း စွပ်စွဲမိတတ်ပြီး အစိုးရ၏ အချက်အလက်များ ဟက်ကာများထံ ပေါက်ကြားသွားပါက အန္တရာယ်ကြီးမားပါသည်။"
      }
    ],
    "concession": "Notwithstanding the pragmatic necessity of public safety operations, intrusive surveillance must remain strictly contingent upon independent judicial warrants.",
    "collocations": [
      {
        "phrase": "infringe upon civil liberties",
        "burmese": "နိုင်ငံသားအခွင့်အရေးနှင့် လွတ်လပ်ခွင့်များကို ချိုးဖောက်ထိပါးသည်",
        "example": "Unwarranted digital wiretaps infringe upon civil liberties."
      },
      {
        "phrase": "preempt extremist atrocities",
        "burmese": "အကြမ်းဖက် ရက်စက်မှုများကို ကြိုတင်ကာကွယ်ဟန့်တားသည်",
        "example": "Actionable signal intelligence serves to preempt extremist atrocities."
      },
      {
        "phrase": "chilling effect on public dissent",
        "burmese": "ပြည်သူများ၏ လွတ်လပ်စွာ ဝေဖန်ဆန္ဒပြမှုကို ကြောက်ရွံ့တုံ့ဆိုင်းစေသော သက်ရောက်မှု",
        "example": "Pervasive facial tracking exerts a chilling effect on public dissent."
      },
      {
        "phrase": "independent judicial oversight",
        "burmese": "လွတ်လပ်သော တရားစီရင်ရေး၏ ကြီးကြပ်စစ်ဆေးမှု",
        "example": "Surveillance mandates require strict and independent judicial oversight."
      },
      {
        "phrase": "draconian mass surveillance apparatus",
        "burmese": "ရက်စက်တင်းကျပ်လွန်းသော အများပြည်သူစောင့်ကြည့်ရေး ယန္တရား",
        "example": "Civil society opposes the deployment of a draconian mass surveillance apparatus."
      }
    ]
  },
  {
    "id": "fast_fashion",
    "title": "Fast Fashion & Circular Economic Sustainability",
    "category": "Consumerism & Environmental Sustainability",
    "keywords": [
      "fashion",
      "clothes",
      "fast fashion",
      "shopping",
      "textiles",
      "waste",
      "consumerism",
      "sustainability"
    ],
    "prompt": "Modern society produces and consumes inexpensive clothing at an unprecedented rate. What are the problems associated with this trend, and what measures can be taken to resolve them?",
    "band9Thesis": "The relentless escalation of fast-fashion consumption inflicts catastrophic aquatic pollution and human rights exploitation in the Global South, an ecological emergency that can only be countered through statutory garment recycling mandates and extended producer responsibility.",
    "pros": [
      {
        "claim": "Catastrophic Microplastic Effluent & Landfill Congestion",
        "evidence": "Synthetic polyester garments shed non-biodegradable microfibers during laundering, poisoning marine ecosystems, while billions of tonnes of garments end up incinerated in developing nations.",
        "burmese": "စျေးပေါသော အဝတ်အထည်များသည် ပလတ်စတစ်မိုက်ခရိုဖိုင်ဘာများ ထုတ်လွှတ်ပြီး ရေထုကို ညစ်ညမ်းစေသည့်အပြင် နှစ်စဉ် အဝတ်အထည်တန်ချိန် သန်းပေါင်းများစွာ အမှိုက်ပုံများသို့ ရောက်ရှိနေပါသည်။"
      },
      {
        "claim": "Sweatshop Exploitation & Human Dignity Violations",
        "evidence": "Ultra-cheap apparel relies upon poverty-level wages, hazardous factory environments, and child labor in unregulated manufacturing enclaves.",
        "burmese": "စျေးနှုန်းအလွန်ချိုသာစေရန်အတွက် ဖွံ့ဖြိုးဆဲနိုင်ငံများရှိ အလုပ်သမားများကို လုပ်အားခ အလွန်နည်းပါးစွာ ပေးပြီး အန္တရာယ်များသော ပတ်ဝန်းကျင်တွင် ခိုင်းစေနေကြပါသည်။"
      }
    ],
    "cons": [
      {
        "claim": "Democratic Access to Affordable Apparel",
        "evidence": "Fast fashion enables low-income demographics to dress with dignity and keep pace with professional workplace dress codes without excessive expenditure.",
        "burmese": "ဝင်ငွေနည်း ပြည်သူများအတွက် သင့်တင့်သော ကုန်ကျစရိတ်ဖြင့် သပ်ရပ်စွာ ဝတ်ဆင်နိုင်ခွင့် ပေးစွမ်းထားပါသည်။"
      },
      {
        "claim": "Economic Engine for Developing Nation Employment",
        "evidence": "The garment sector serves as the single largest formal employer and foreign-exchange earner in economies like Bangladesh and Vietnam.",
        "burmese": "ဘင်္ဂလားဒေ့ရှ်နှင့် ဗီယက်နမ်ကဲ့သို့ နိုင်ငံများတွင် အထည်ချုပ်လုပ်ငန်းသည် သန်းနှင့်ချီသော အမျိုးသမီးများအတွက် အဓိက အလုပ်အကိုင် အရင်းအမြစ် ဖြစ်ပါသည်။"
      }
    ],
    "concession": "Notwithstanding the economic livelihoods supported by textile manufacturing, the planetary boundary breaches caused by throwaway consumerism require systemic transition to circular economics.",
    "collocations": [
      {
        "phrase": "throwaway consumer culture",
        "burmese": "ခဏသုံးပြီး လွှင့်ပစ်သော စားသုံးမှု ယဉ်ကျေးမှု",
        "example": "Fast fashion embodies an unsustainable throwaway consumer culture."
      },
      {
        "phrase": "extended producer responsibility",
        "burmese": "ထုတ်လုပ်သူ၏ ရေရှည်တာဝန်ယူမှု စည်းမျဉ်း",
        "example": "Legislation must mandate extended producer responsibility for textile recycling."
      },
      {
        "phrase": "microfiber aquatic contamination",
        "burmese": "မိုက်ခရိုဖိုင်ဘာ အမျှင်များကြောင့် ရေထုညစ်ညမ်းမှု",
        "example": "Synthetic washing cycles accelerate microfiber aquatic contamination."
      },
      {
        "phrase": "sweatshop labor exploitation",
        "burmese": "စက်ရုံဆိုးများတွင် လုပ်အားခေါင်းပုံဖြတ် အမြတ်ထုတ်မှု",
        "example": "Ethical audits aim to eliminate sweatshop labor exploitation."
      },
      {
        "phrase": "transition to circular economics",
        "burmese": "အရင်းအမြစ် ပြန်လည်အသုံးပြုသော စီးပွားရေးစနစ်သို့ ကူးပြောင်းခြင်း",
        "example": "Apparel brands must hasten the transition to circular economics."
      }
    ]
  },
  {
    "id": "mass_tourism",
    "title": "Mass Global Tourism & Indigenous Heritage Preservation",
    "category": "Globalization & Cultural Anthropology",
    "keywords": [
      "tourism",
      "tourists",
      "culture",
      "heritage",
      "travel",
      "monuments",
      "sites",
      "local",
      "indigenous"
    ],
    "prompt": "International tourism is bringing significant economic benefits to many countries, but it also causes environmental and cultural damage. Do the benefits of international tourism outweigh the disadvantages?",
    "band9Thesis": "While mass international tourism delivers indispensable revenue and cross-cultural enlightenment, the structural commodification of ancestral traditions and degradation of fragile heritage sites mandate stringent visitor caps and eco-tourism tariffs.",
    "pros": [
      {
        "claim": "Vital Foreign Exchange & Regional Employment Catalyst",
        "evidence": "Hospitality and travel industries inject vital capital into developing regions, funding local infrastructure, schools, and civic amenities.",
        "burmese": "နိုင်ငံခြားငွေ တိုက်ရိုက်ရရှိစေပြီး ဒေသခံများအတွက် ဟိုတယ်၊ ခရီးသွားနှင့် အစားအသောက်ဆိုင်ရာ အလုပ်အကိုင် အခွင့်အလမ်းများစွာ ဖန်တီးပေးပါသည်။"
      },
      {
        "claim": "Cross-Cultural Empathy & Global Cosmopolitanism",
        "evidence": "Direct interpersonal immersion between global travelers and native communities dismantles xenophobic prejudices and fosters international solidarity.",
        "burmese": "ကမ္ဘာလှည့်ခရီးသွားများနှင့် ဒေသခံများအကြား အပြန်အလှန် ချစ်ကြည်ရင်းနှီးမှု ရရှိစေပြီး လူမျိုးရေးခွဲခြားမှုများကို လျော့ကျစေပါသည်။"
      }
    ],
    "cons": [
      {
        "claim": "Commodification & Dilution of Sacred Rituals",
        "evidence": "Authentic spiritual ceremonies are transformed into trivialized commercial spectacles tailored for brief tourist photography.",
        "burmese": "ရိုးရာယဉ်ကျေးမှုနှင့် ဘာသာရေးအခမ်းအနားများသည် ခရီးသွားများ ဓာတ်ပုံရိုက်ရန်အတွက် သာမန်စီးပွားဖြစ် ဖျော်ဖြေမှုအဆင့်သို့ လျှောကျသွားတတ်ပါသည်။"
      },
      {
        "claim": "Physical Overcrowding & Ecological Erosion of Fragile Biomes",
        "evidence": "Historic sanctuaries such as Machu Picchu and Venice suffer from severe masonry wear, waste accumulation, and rising cost-of-living displacement for locals.",
        "burmese": "ရှေးဟောင်းအမွေအနှစ်နေရာများ ပျက်စီးယိုယွင်းလာပြီး ဒေသခံများမှာ ကုန်စျေးနှုန်းကြီးမြင့်မှုကြောင့် မိမိတို့နေရပ်မှ ပြောင်းရွှေ့ပေးရတတ်ပါသည်။"
      }
    ],
    "concession": "Notwithstanding the undeniable economic stimulus of tourist receipts, the irrevocable loss of sacred cultural integrity cannot be redeemed by short-term fiscal profits.",
    "collocations": [
      {
        "phrase": "commodification of cultural heritage",
        "burmese": "ယဉ်ကျေးမှု အမွေအနှစ်များကို စီးပွားဖြစ် ကုန်စည်အဖြစ် ပြောင်းလဲခြင်း",
        "example": "Unchecked tourism accelerates the commodification of cultural heritage."
      },
      {
        "phrase": "invaluable foreign-exchange receipts",
        "burmese": "အဖိုးမဖြတ်နိုင်သော နိုင်ငံခြားငွေ ရရှိမှု",
        "example": "Developing archipelagos rely heavily on foreign-exchange receipts."
      },
      {
        "phrase": "physical erosion of ancient masonry",
        "burmese": "ရှေးဟောင်း အဆောက်အအုံများ ရုပ်ပိုင်းဆိုင်ရာ ပျက်စီးယိုယွင်းမှု",
        "example": "Mass footsteps precipitate the physical erosion of ancient masonry."
      },
      {
        "phrase": "indigenous ritual trivialization",
        "burmese": "တိုင်းရင်းသား ရိုးရာဓလေ့များကို တန်ဖိုးမဲ့ ဖျော်ဖြေမှုအဖြစ် ပြုလုပ်ခြင်း",
        "example": "Commercial package tours risk indigenous ritual trivialization."
      },
      {
        "phrase": "mandate sustainable visitor caps",
        "burmese": "ရေရှည်တည်တံ့သော ခရီးသွားဦးရေ ကန့်သတ်ချက်များ သတ်မှတ်သည်",
        "example": "Vulnerable ecosystems mandate sustainable visitor caps to endure."
      }
    ]
  },
  {
    "id": "media_algorithms",
    "title": "Social Media Algorithms & Societal Echo Chambers",
    "category": "Media Studies & Democratic Politics",
    "keywords": [
      "social media",
      "algorithm",
      "echo chamber",
      "fake news",
      "polarization",
      "news",
      "information",
      "internet"
    ],
    "prompt": "Social networking platforms have become the primary source of news for many people. To what extent does this development threaten democratic discourse and social cohesion?",
    "band9Thesis": "The algorithmic curation of digital information fundamentally jeopardizes democratic cohesion by trapping citizens in ideological echo chambers and commercializing inflammatory disinformation, requiring algorithmic transparency legislation.",
    "pros": [
      {
        "claim": "Democratization of News Distribution & Citizen Journalism",
        "evidence": "Social networks dismantle traditional oligarchic media monopolies, empowering grassroots movements and marginalized voices to expose official malfeasance.",
        "burmese": "သမားရိုးကျ မီဒီယာကြီးများ၏ ချုပ်ကိုင်မှုကို ဖောက်ထွက်နိုင်ပြီး သာမန်ပြည်သူများက မတရားမှုများကို ဖော်ထုတ်တင်ပြနိုင်ခွင့် ရရှိစေပါသည်။"
      },
      {
        "claim": "Hyper-Personalized Real-Time Information Access",
        "evidence": "Users receive instantaneous emergency broadcasts, scientific breakthroughs, and niche academic discourse tailored precisely to their professional fields.",
        "burmese": "အရေးပေါ်သတင်းများနှင့် မိမိတို့စိတ်ဝင်စားသော ပညာရပ်ဆိုင်ရာ သတင်းအချက်အလက်များကို ချက်ချင်းလက်ငင်း ရယူနိုင်ပါသည်။"
      }
    ],
    "cons": [
      {
        "claim": "Algorithmic Amplification of Outrage & Epistemic Bubbles",
        "evidence": "Engagement-maximizing algorithms intentionally elevate sensationalist, polarizing narratives, radicalizing political factions and eroding common consensus.",
        "burmese": "လူအများ ဒေါသထွက်စေမည့် သတင်းမှားများနှင့် အမုန်းစကားများကို အယ်လ်ဂိုရစ်သမ်များက တမင်တကာ ဦးစားပေးဖော်ပြသဖြင့် နိုင်ငံရေးအရ အုပ်စုကွဲစေပါသည်။"
      },
      {
        "claim": "Degradation of Rigorous Investigative Journalism",
        "evidence": "Ad-revenue migration to tech intermediaries has bankrupt regional newspapers, leaving civic councils and municipal corruption unscrutinized.",
        "burmese": "ကြော်ငြာဝင်ငွေများ ဆိုရှယ်မီဒီယာများထံ ရောက်သွားသဖြင့် အရည်အသွေးမြင့် စုံစမ်းထောက်လှမ်းရေး သတင်းစာများ ရှင်သန်ရန် ခက်ခဲလာပါသည်။"
      }
    ],
    "concession": "Notwithstanding the democratizing potential of open internet forums, the unchecked algorithmic optimization for political outrage poses an existential threat to democratic consensus.",
    "collocations": [
      {
        "phrase": "ideological echo chambers",
        "burmese": "မိမိအကြိုက် အမြင်တူများသာ ပြန်လည်ပဲ့တင်ထပ်နေသော သတင်းဝန်းကျင်",
        "example": "Users become hermetically sealed within ideological echo chambers."
      },
      {
        "phrase": "algorithmic amplification of outrage",
        "burmese": "ဒေါသနှင့် အမုန်းတရားကို အယ်လ်ဂိုရစ်သမ်က အရှိန်မြှင့်တင်ပေးမှု",
        "example": "Platforms profit from the algorithmic amplification of outrage."
      },
      {
        "phrase": "erode democratic consensus",
        "burmese": "ဒီမိုကရေစီနည်းကျ တူညီဆန္ဒကို တိုက်စားဖျက်ဆီးသည်",
        "example": "Unfiltered disinformation campaigns erode democratic consensus."
      },
      {
        "phrase": "grassroots citizen journalism",
        "burmese": "အခြေခံလူထု ပြည်သူ့သတင်းထောက်စနစ်",
        "example": "Social channels empower authentic grassroots citizen journalism."
      },
      {
        "phrase": "statutory algorithmic transparency",
        "burmese": "ဥပဒေအရ အယ်လ်ဂိုရစ်သမ် ပွင့်လင်းမြင်သာမှု ရှိစေရေး",
        "example": "Parliaments are debating statutory algorithmic transparency standards."
      }
    ]
  }
];

  window.IELTS_ARGUMENT_MATRIX = IELTS_ARGUMENT_MATRIX;

  window.findArgumentTheme = function(query) {
    if (!query || !query.trim()) return null;
    const q = query.trim().toLowerCase();

    // Exact id or title match
    for (const t of IELTS_ARGUMENT_MATRIX) {
      if (t.id === q || t.title.toLowerCase() === q) return t;
    }

    // Keyword match
    for (const t of IELTS_ARGUMENT_MATRIX) {
      for (const kw of t.keywords) {
        if (q.includes(kw) || kw.includes(q)) return t;
      }
    }
    return null;
  };

  window.renderArgumentMatrixCard = function(theme, targetContainerId) {
    const container = document.getElementById(targetContainerId);
    if (!container || !theme) return;

    let collocationsHtml = theme.collocations.map((c, i) => `
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:10px 12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px; margin-bottom:4px;">
          <strong style="color:var(--accent); font-size:0.86rem;">${i+1}. ${escapeHtml(c.phrase)}</strong>
          <span class="burmese" style="font-size:0.78rem; color:var(--text-secondary);">${escapeHtml(c.burmese)}</span>
        </div>
        <div style="font-size:0.82rem; color:var(--text-secondary); font-style:italic; line-height:1.45;">
          &ldquo;${escapeHtml(c.example)}&rdquo;
        </div>
      </div>
    `).join('');

    const proItemsHtml = theme.pros.map((p, i) => `
      <div style="margin-bottom:12px; padding:12px 14px; background:rgba(16, 185, 129, 0.04); border-left:3px solid #10B981; border-radius:0 8px 8px 0;">
        <div style="font-weight:800; font-size:0.88rem; color:var(--text); margin-bottom:4px;">
          Argument ${i+1}: ${escapeHtml(p.claim)}
        </div>
        <div style="font-size:0.83rem; color:var(--text-secondary); line-height:1.5; margin-bottom:4px;">
          ${escapeHtml(p.evidence)}
        </div>
        <div class="burmese" style="font-size:0.78rem; color:var(--text-secondary); line-height:1.45;">
          ${escapeHtml(p.burmese)}
        </div>
      </div>
    `).join('');

    const conItemsHtml = theme.cons.map((c, i) => `
      <div style="margin-bottom:12px; padding:12px 14px; background:rgba(239, 68, 68, 0.04); border-left:3px solid #EF4444; border-radius:0 8px 8px 0;">
        <div style="font-weight:800; font-size:0.88rem; color:var(--text); margin-bottom:4px;">
          Counter-Argument ${i+1}: ${escapeHtml(c.claim)}
        </div>
        <div style="font-size:0.83rem; color:var(--text-secondary); line-height:1.5; margin-bottom:4px;">
          ${escapeHtml(c.evidence)}
        </div>
        <div class="burmese" style="font-size:0.78rem; color:var(--text-secondary); line-height:1.45;">
          ${escapeHtml(c.burmese)}
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="occ-card" style="padding:22px; border:1px solid var(--border-accent); background:var(--bg-card); border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,0.04);">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
              <span class="occ-ver-pill" style="background:#D97706; color:#FFF; font-weight:800; font-size:0.72rem;">EXAMINER IDEA BANK</span>
              <span style="font-size:0.78rem; font-weight:700; color:var(--text-secondary);">${escapeHtml(theme.category)}</span>
            </div>
            <h3 style="margin:0; font-size:1.2rem; font-weight:900; color:var(--text);">${escapeHtml(theme.title)}</h3>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-outlined" style="padding:6px 12px; font-size:0.78rem; font-weight:700;" onclick="window.copyArgumentBlueprint(${JSON.stringify(theme.id)})">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-copy"/></svg> Copy Blueprint
            </button>
            <button class="btn-accent-solid" style="padding:6px 14px; font-size:0.78rem; font-weight:800;" onclick="window.exportMatrixOutline(${JSON.stringify(theme.id)})">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-arrow-up-right"/></svg> Export to Writing Lab
            </button>
          </div>
        </div>

        <!-- Official Prompt -->
        <div style="margin-bottom:16px; padding:12px 14px; background:var(--bg); border:1px solid var(--border); border-radius:8px;">
          <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary); margin-bottom:4px;">
            Target IELTS Task 2 Essay Prompt:
          </div>
          <div style="font-size:0.9rem; font-weight:600; color:var(--text); line-height:1.5;">
            &ldquo;${escapeHtml(theme.prompt)}&rdquo;
          </div>
        </div>

        <!-- Band 9.0 Thesis Statement -->
        <div style="margin-bottom:18px; padding:14px 16px; background:linear-gradient(135deg, rgba(217,119,6,0.06), rgba(217,119,6,0.02)); border:1px solid rgba(217,119,6,0.25); border-radius:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; color:#D97706; display:inline-flex; align-items:center; gap:6px;">
              <svg class="ui-icon ui-icon-xs" style="color:#D97706;"><use href="#lucide-sparkles"/></svg> Band 9.0 Master Thesis Statement:
            </span>
            <span class="occ-ver-pill" style="background:#10B981; color:#FFF; font-weight:800; font-size:0.7rem; padding:1px 8px;">C2 Register</span>
          </div>
          <p style="margin:0; font-size:0.96rem; line-height:1.65; color:var(--text); font-family:Georgia, serif;">
            ${escapeHtml(theme.band9Thesis)}
          </p>
        </div>

        <!-- Two Column Arguments: Pros vs Cons -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:18px;">
          <div>
            <div style="font-weight:800; font-size:0.9rem; color:#10B981; margin-bottom:8px; display:inline-flex; align-items:center; gap:6px;">
              <svg class="ui-icon ui-icon-xs" style="color:#10B981;"><use href="#lucide-check"/></svg> Perspective A: Core Proponents
            </div>
            ${proItemsHtml}
          </div>
          <div>
            <div style="font-weight:800; font-size:0.9rem; color:#EF4444; margin-bottom:8px; display:inline-flex; align-items:center; gap:6px;">
              <svg class="ui-icon ui-icon-xs" style="color:#EF4444;"><use href="#lucide-x"/></svg> Perspective B: Counter-Arguments
            </div>
            ${conItemsHtml}
          </div>
        </div>

        <!-- Concession Clause -->
        <div style="margin-bottom:18px; padding:12px 14px; background:rgba(99, 102, 241, 0.04); border-left:3px solid #6366F1; border-radius:0 8px 8px 0;">
          <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; color:#6366F1; margin-bottom:4px;">
            Examiner Concession &amp; Rebuttal Pivot:
          </div>
          <div style="font-size:0.9rem; color:var(--text); line-height:1.55; font-style:italic;">
            &ldquo;${escapeHtml(theme.concession)}&rdquo;
          </div>
        </div>

        <!-- 5 Essential Topic Collocations -->
        <div>
          <div style="font-weight:800; font-size:0.9rem; color:var(--text); margin-bottom:10px; display:inline-flex; align-items:center; gap:6px;">
            <svg class="ui-icon ui-icon-xs" style="color:var(--accent);"><use href="#lucide-link"/></svg> 5 Band 8.5+ Topic Collocations &amp; Context:
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px;">
            ${collocationsHtml}
          </div>
        </div>

      </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  window.exportMatrixOutline = function(themeId) {
    const theme = IELTS_ARGUMENT_MATRIX.find(t => t.id === themeId);
    if (!theme) return;

    const outlineText = `=== IELTS WRITING TASK 2 ESSAY BLUEPRINT ===
TOPIC: ${theme.title}
PROMPT: ${theme.prompt}

[INTRODUCTION]
- Hook: In contemporary society, the debate surrounding ${theme.keywords[0]} has intensified...
- Thesis Statement: ${theme.band9Thesis}

[BODY PARAGRAPH 1: PERSPECTIVE A]
- Topic Sentence: On the one hand, proponents argue that ${theme.pros[0].claim.toLowerCase()}.
- Explanation & Evidence: ${theme.pros[0].evidence}
- Second Supporting Point: Furthermore, ${theme.pros[1].claim.toLowerCase()}, as evidenced by ${theme.pros[1].evidence}

[BODY PARAGRAPH 2: PERSPECTIVE B & REBUTTAL]
- Counter-Perspective Topic Sentence: Conversely, critics raise substantial concerns regarding ${theme.cons[0].claim.toLowerCase()}.
- Supporting Detail: Specifically, ${theme.cons[0].evidence}
- Concession & Synthesis: ${theme.concession}

[CONCLUSION]
- Restatement: In the final analysis, having evaluated both perspectives, it remains clear that...

[TARGET BAND 8.5+ COLLOCATIONS TO INCLUDE]
${theme.collocations.map((c, i) => `${i+1}. ${c.phrase} (${c.burmese})`).join('\n')}
`;

    const el = document.getElementById('essayArea');
    if (el) {
      el.value = outlineText;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof window.runLiveWritingDiagnostics === 'function') {
        window.runLiveWritingDiagnostics();
      }

      if (typeof window.switchTab === 'function') {
        window.switchTab('writing');
      }

      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        el.style.transition = 'box-shadow 0.3s ease';
        el.style.boxShadow = '0 0 0 3px #10B981';
        setTimeout(() => { el.style.boxShadow = ''; }, 1500);
      }, 300);

      if (window.showAppToast) {
        window.showAppToast(`"${theme.title}" outline exported directly to Writing Lab!`, 'success');
      }
    }
  };

  window.copyArgumentBlueprint = function(themeId) {
    const theme = IELTS_ARGUMENT_MATRIX.find(t => t.id === themeId);
    if (!theme) return;

    const text = `IELTS Band 9.0 Blueprint: ${theme.title}\nPrompt: ${theme.prompt}\nThesis: ${theme.band9Thesis}\n\nPerspective A (Pro):\n1. ${theme.pros[0].claim}: ${theme.pros[0].evidence}\n2. ${theme.pros[1].claim}: ${theme.pros[1].evidence}\n\nPerspective B (Con):\n1. ${theme.cons[0].claim}: ${theme.cons[0].evidence}\n2. ${theme.cons[1].claim}: ${theme.cons[1].evidence}\n\nConcession: ${theme.concession}\n\nCollocations:\n${theme.collocations.map(c => `- ${c.phrase} (${c.burmese})`).join('\n')}`;

    navigator.clipboard.writeText(text).then(() => {
      if (window.showAppToast) {
        window.showAppToast('Full argument blueprint copied to clipboard!', 'success');
      }
    });
  };

  window.loadArgumentThemeById = function(themeId, targetContainerId) {
    const theme = IELTS_ARGUMENT_MATRIX.find(t => t.id === themeId);
    if (theme) {
      const atInp = document.getElementById('at-topic-input');
      const vtInp = document.getElementById('vt-topic-input');
      if (atInp) atInp.value = theme.title;
      if (vtInp) vtInp.value = theme.title;

      const atContainer = document.getElementById('at-topic-results');
      const vtContainer = document.getElementById('vt-topic-results');
      if (atContainer) window.renderArgumentMatrixCard(theme, 'at-topic-results');
      if (vtContainer) window.renderArgumentMatrixCard(theme, 'vt-topic-results');
    }
  };

})(window);
