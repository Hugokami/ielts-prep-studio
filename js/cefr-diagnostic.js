/**
 * IELTS Prep Studio - Cambridge CEFR 50-Question Diagnostic Placement Engine
 * 5 Independent Batches (250 Calibrated Questions Total)
 * Multi-tier assessment (B1, B2, C1, C2) with bilingual English/Burmese examiner rationales,
 * account persistence, and personalized study pathway integration.
 */

(function(window) {
  'use strict';

  // Master Calibrated 5-Batch Question Bank (Embedded Default for 0ms Instant Rendering)
  let RAW_BATCHES = [
  {
    "id": "batch_1",
    "name": "Diagnostic Form Alpha (Standard Comprehensive)",
    "questions": [
      {
        "id": "b1_01",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Uncountable Nouns",
        "question": "We bought some new gym _______ last week.",
        "options": [
          "equipment",
          "equipments",
          "piece of equipment",
          "equippings"
        ],
        "answer": "equipment",
        "rationale": "'Equipment' is an uncountable noun in English and never takes a plural '-s'.",
        "rationaleMm": "'Equipment' သည် ရေတွက်မရသော နာမ် (uncountable noun) ဖြစ်၍ 's' ပေါင်းစရာမလိုပါ။"
      },
      {
        "id": "b1_02",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Confusing Words",
        "question": "I write my daily thoughts and experiences in my _______.",
        "options": [
          "diary",
          "dairy",
          "daily",
          "dial"
        ],
        "answer": "diary",
        "rationale": "'Diary' is a daily record of personal thoughts/events; 'dairy' relates to milk and milk products.",
        "rationaleMm": "'Diary' (ဒိုင်ယာရီမှတ်တမ်း) နှင့် 'Dairy' (နို့ထွက်ပစ္စည်း) ကို ခွဲခြားအသုံးပြုရပါမည်။"
      },
      {
        "id": "b1_03",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Confusing Words",
        "question": "She made a delicious chocolate _______ for dinner.",
        "options": [
          "dessert",
          "desert",
          "deserve",
          "disaster"
        ],
        "answer": "dessert",
        "rationale": "'Dessert' (with double 's') is a sweet dish eaten after dinner; 'desert' is an arid dry land.",
        "rationaleMm": "'Dessert' (အချိုပွဲ) သည် 's' နှစ်လုံးဖြစ်ပြီး 'Desert' (သဲကန္တာရ) နှင့် ကွဲပြားပါသည်။"
      },
      {
        "id": "b1_04",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Vocabulary Discrimination",
        "question": "The football team hired a talented new _______ to train them for the finals.",
        "options": [
          "coach",
          "couch",
          "crouch",
          "clutch"
        ],
        "answer": "coach",
        "rationale": "'Coach' is a sports trainer/instructor; 'couch' is a sofa for sitting or lying on.",
        "rationaleMm": "'Coach' (နည်းပြ) ဖြစ်ပြီး 'Couch' (ဆိုဖာထိုင်ခုံ) မဟုတ်ပါ။"
      },
      {
        "id": "b1_05",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Collocations",
        "question": "That ancient temple is a famous tourist _______.",
        "options": [
          "site",
          "sight",
          "cite",
          "side"
        ],
        "answer": "site",
        "rationale": "'Tourist site' refers to a location or venue visited by tourists; 'sight' is the ability to see or a visible view.",
        "rationaleMm": "ခရီးသွားလည်ပတ်ရာ နေရာဒေသကို ရည်ညွှန်းလိုလျှင် 'Tourist site' ကို သုံးရပါမည်။"
      },
      {
        "id": "b1_06",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Gerund vs Infinitive",
        "question": "I am really looking forward _______ you at the conference next week.",
        "options": [
          "to seeing",
          "to see",
          "seeing",
          "see"
        ],
        "answer": "to seeing",
        "rationale": "'Look forward to' is a phrasal verb where 'to' is a preposition, requiring a gerund (-ing).",
        "rationaleMm": "'Look forward to' တွင် 'to' သည် preposition ဖြစ်သဖြင့် နောက်တွင် gerund (-ing) လိုက်ရပါသည်။"
      },
      {
        "id": "b1_07",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Narrative Tenses",
        "question": "By the time we arrived at the cinema, the film _______.",
        "options": [
          "had already started",
          "already started",
          "has already started",
          "was already starting"
        ],
        "answer": "had already started",
        "rationale": "Past perfect is required for an action completed before another past event.",
        "rationaleMm": "အတိတ်တွင် အခြားအဖြစ်အပျက်တစ်ခုမတိုင်မီ ပြီးစီးခဲ့သောအပြုအမူကို Past Perfect (had + V3) ဖြင့် ဖော်ပြရပါသည်။"
      },
      {
        "id": "b1_08",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Collocations",
        "question": "Could you please _______ me a favor and lend me your grammar dictionary?",
        "options": [
          "do",
          "make",
          "give",
          "take"
        ],
        "answer": "do",
        "rationale": "The standard English collocation is 'to do someone a favor', never 'make a favor'.",
        "rationaleMm": "အကူအညီတောင်းခံရာတွင် 'do a favor' ဟူသော တွဲဖက်စကားလုံး (collocation) ကို သုံးရပါမည်။"
      },
      {
        "id": "b1_09",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Time Prepositions",
        "question": "He has been living and working in Yangon _______ five years.",
        "options": [
          "for",
          "since",
          "during",
          "from"
        ],
        "answer": "for",
        "rationale": "'For' is used with a duration of time (five years); 'since' specifies a starting point.",
        "rationaleMm": "အချိန်ကာလအတိုင်းအတာ (duration) ကို ဖော်ပြလိုလျှင် 'for' ကို သုံးရပါမည်။"
      },
      {
        "id": "b1_10",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Conditionals",
        "question": "Unless you _______ consistently every day, you will not achieve Band 7.5.",
        "options": [
          "practice",
          "don't practice",
          "will practice",
          "practiced"
        ],
        "answer": "practice",
        "rationale": "'Unless' means 'if not' and takes a positive verb in the present tense for future conditions.",
        "rationaleMm": "'Unless' သည် 'if not' အဓိပ္ပာယ်ဆောင်သဖြင့် နောက်တွင် အငြင်းဝါကျ မလိုက်ရပါ။"
      },
      {
        "id": "b1_11",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Astronomical Terms",
        "question": "I saw an amazing shooting _______ in the night sky yesterday.",
        "options": [
          "meteor",
          "meter",
          "metal",
          "meadow"
        ],
        "answer": "meteor",
        "rationale": "'Meteor' is a space rock burning up in Earth's atmosphere; 'meter' is a unit of measurement.",
        "rationaleMm": "ကောင်းကင်မှ ဥက္ကာပျံကို 'Meteor' ဟု ခေါ်ဆိုပြီး 'Meter' (မီတာ) နှင့် ကွဲပြားပါသည်။"
      },
      {
        "id": "b1_12",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Vocabulary Discrimination",
        "question": "There is a severe water _______ in this arid agricultural region.",
        "options": [
          "scarcity",
          "scare",
          "scared",
          "scar"
        ],
        "answer": "scarcity",
        "rationale": "'Scarcity' denotes a state of being in short supply or shortage; 'scare' means to frighten.",
        "rationaleMm": "'Scarcity' (ရှားပါးမှု၊ ပြတ်လပ်မှု) ဖြစ်ပြီး 'Scare' (ကြောက်လန့်စေခြင်း) မဟုတ်ပါ။"
      },
      {
        "id": "b1_13",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Medical Collocations",
        "question": "The physician determined that the child suffered from an iron _______.",
        "options": [
          "deficiency",
          "efficient",
          "efficiency",
          "deficit"
        ],
        "answer": "deficiency",
        "rationale": "'Deficiency' refers to a medical lack or shortage of a necessary substance in the body.",
        "rationaleMm": "ခန္ဓာကိုယ်တွင်း အာဟာရဓာတ်ချို့တဲ့မှုကို 'Deficiency' ဟု သုံးနှုန်းပါသည်။"
      },
      {
        "id": "b1_14",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Economic Terms",
        "question": "The emerging country is currently facing severe _______ stagnation and high inflation.",
        "options": [
          "economic",
          "economical",
          "economics",
          "economize"
        ],
        "answer": "economic",
        "rationale": "'Economic' refers to the economy of a country; 'economical' means thrifty, inexpensive, or saving money.",
        "rationaleMm": "နိုင်ငံစီးပွားရေးနှင့် သက်ဆိုင်သောပြဿနာကို 'economic' ဟုသုံးပြီး 'economical' (ငွေချွေတာသော) နှင့် မတူပါ။"
      },
      {
        "id": "b1_15",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Leadership Roles",
        "question": "The Chief _______ Officer made the final corporate restructuring decision.",
        "options": [
          "Executive",
          "Execution",
          "Executory",
          "Exemplar"
        ],
        "answer": "Executive",
        "rationale": "'Chief Executive Officer' (CEO) is the senior managerial title in corporate governance.",
        "rationaleMm": "အမှုဆောင်အရာရှိချုပ် ရာထူးအမည်မှာ 'Chief Executive Officer' (CEO) ဖြစ်ပါသည်။"
      },
      {
        "id": "b1_16",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Future Perfect",
        "question": "By this time next autumn, she _______ her Master's degree in Educational Linguistics.",
        "options": [
          "will have completed",
          "will complete",
          "completes",
          "is completing"
        ],
        "answer": "will have completed",
        "rationale": "Future perfect ('will have completed') is used for an action that will be finished before a specific future time.",
        "rationaleMm": "အနာဂတ်သတ်မှတ်ချိန်တစ်ခု မတိုင်မီ ပြီးစီးပြီးဖြစ်မည့် အခြေအနေကို Future Perfect ဖြင့် ဖော်ပြပါသည်။"
      },
      {
        "id": "b1_17",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Subjunctive / Urgency",
        "question": "It's high time you _______ taking your IELTS academic preparation seriously.",
        "options": [
          "started",
          "start",
          "have started",
          "will start"
        ],
        "answer": "started",
        "rationale": "'It's high time' takes the past simple subjunctive to express that an action is overdue.",
        "rationaleMm": "'It's high time' ၏နောက်တွင် အတိတ်ကာလပုံစံ (past subjunctive) ကို အသုံးပြုရပါသည်။"
      },
      {
        "id": "b1_18",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Correlative Inversion",
        "question": "No sooner had the professor commenced the lecture _______ the fire alarm sounded.",
        "options": [
          "than",
          "when",
          "then",
          "that"
        ],
        "answer": "than",
        "rationale": "'No sooner had [subject] [V3] than [clause]' is the strict correlative pair, unlike 'hardly... when'.",
        "rationaleMm": "'No sooner had...' နှင့် တွဲဖက်အသုံးပြုရသော စကားလုံးမှာ 'than' ဖြစ်ပါသည်။"
      },
      {
        "id": "b1_19",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Contrast Connectors",
        "question": "_______ working overtime every evening, he failed to meet the strict project deadline.",
        "options": [
          "Despite",
          "Although",
          "In spite",
          "Even though"
        ],
        "answer": "Despite",
        "rationale": "'Despite' is a preposition followed by a gerund or noun phrase without 'of'.",
        "rationaleMm": "'Despite' နောက်တွင် gerund (-ing) တိုက်ရိုက်လိုက်ပြီး 'of' ထည့်ရန်မလိုပါ။"
      },
      {
        "id": "b1_20",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Passive Gerunds",
        "question": "This analytical report needs _______ thoroughly before we present it to the board.",
        "options": [
          "editing",
          "to edit",
          "edited",
          "edit"
        ],
        "answer": "editing",
        "rationale": "'Need + -ing' carries a passive meaning equivalent to 'needs to be edited'.",
        "rationaleMm": "'Need + -ing' သည် Passive အဓိပ္ပာယ် (needs to be edited) ကို ဆောင်ပါသည်။"
      },
      {
        "id": "b1_21",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Concession Structures",
        "question": "Hard _______ he attempted to convince the committee, they rejected the proposal.",
        "options": [
          "as",
          "although",
          "however",
          "despite"
        ],
        "answer": "as",
        "rationale": "'Adverb/Adjective + as + subject + verb' is an inverted concession structure meaning 'although he tried hard'.",
        "rationaleMm": "Adverb + as + subject + verb သည် 'Although' ကဲ့သို့ ဆန့်ကျင်ဘက် အဓိပ္ပာယ်ဆောင်ပါသည်။"
      },
      {
        "id": "b1_22",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Hypothetical Preference",
        "question": "I'd rather you _______ share confidential test materials with unauthorized parties.",
        "options": [
          "didn't",
          "don't",
          "won't",
          "hadn't"
        ],
        "answer": "didn't",
        "rationale": "'I'd rather + subject + past simple' expresses a present/future preference regarding someone else's action.",
        "rationaleMm": "အခြားသူတစ်ဦး၏ လုပ်ဆောင်ချက်အပေါ် ဆန္ဒပြုရာတွင် 'I'd rather + subject + past simple' ကို သုံးရပါသည်။"
      },
      {
        "id": "b1_23",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Reporting Verbs",
        "question": "The researcher is believed _______ the breakthrough discovery several months ago.",
        "options": [
          "to have made",
          "to make",
          "making",
          "having made"
        ],
        "answer": "to have made",
        "rationale": "A perfect infinitive ('to have made') is required because the discovery occurred prior to the present belief.",
        "rationaleMm": "ယခုယုံကြည်မှုမတိုင်မီ အတိတ်ကပြီးစီးခဲ့သော လုပ်ဆောင်ချက်ဖြစ်၍ Perfect Infinitive ကို သုံးရပါသည်။"
      },
      {
        "id": "b1_24",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Prepositional Collocations",
        "question": "The junior accountant was accused _______ manipulating the quarterly financial ledgers.",
        "options": [
          "of",
          "for",
          "with",
          "about"
        ],
        "answer": "of",
        "rationale": "The verb 'accuse' strictly pairs with 'of' ('accuse someone of something').",
        "rationaleMm": "'Accuse' ကြိယာသည် 'of' နှင့် အမြဲတွဲဖက်ရပါသည် (accuse of)."
      },
      {
        "id": "b1_25",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Professional Collocations",
        "question": "The university is seeking a candidate who can _______ well under extreme examination pressure.",
        "options": [
          "perform",
          "function",
          "operate",
          "act"
        ],
        "answer": "perform",
        "rationale": "'Perform well under pressure' is the standard professional and academic collocation.",
        "rationaleMm": "ဖိအားအောက်တွင် စွမ်းဆောင်ရည်ကောင်းမွန်ခြင်းကို 'perform under pressure' ဟု သုံးနှုန်းပါသည်။"
      },
      {
        "id": "b1_26",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Academic Verbs",
        "question": "Formal lectures will _______ promptly at 08:30 next Monday morning.",
        "options": [
          "commence",
          "command",
          "comment",
          "commend"
        ],
        "answer": "commence",
        "rationale": "'Commence' is the formal academic register equivalent of 'begin' or 'start'.",
        "rationaleMm": "တက္ကသိုလ်ပညာရေးဆိုင်ရာ အခမ်းအနားများ စတင်ခြင်းကို 'commence' ဟု တရားဝင်သုံးနှုန်းပါသည်။"
      },
      {
        "id": "b1_27",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Collocations",
        "question": "The economic sanctions had a _______ impact on local industrial output.",
        "options": [
          "profound",
          "found",
          "prolong",
          "profuse"
        ],
        "answer": "profound",
        "rationale": "'Profound impact' is an advanced Band 8.0 academic collocation meaning deep, far-reaching effect.",
        "rationaleMm": "နက်ရှိုင်းကျယ်ပြန့်သော သက်ရောက်မှုကို 'profound impact' ဟု အဆင့်မြင့်စွာ တွဲဖက်သုံးပါသည်။"
      },
      {
        "id": "b1_28",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Historical Memorials",
        "question": "The municipal council erected a stone _______ in the park to honor fallen soldiers.",
        "options": [
          "monument",
          "moment",
          "mountain",
          "momentum"
        ],
        "answer": "monument",
        "rationale": "'Monument' is a statue or structure erected to commemorate a person or event.",
        "rationaleMm": "အောက်မေ့ဖွယ် အထိမ်းအမှတ်ကျောက်တိုင်ကို 'Monument' ဟု ခေါ်ဆိုပါသည်။"
      },
      {
        "id": "b1_29",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Academic Disasters",
        "question": "A devastating situation wherein large populations suffer extreme nutritional starvation is known as _______.",
        "options": [
          "famine",
          "feminine",
          "famous",
          "feline"
        ],
        "answer": "famine",
        "rationale": "'Famine' denotes widespread extreme scarcity of food; 'feminine' refers to female qualities.",
        "rationaleMm": "အစာရေစာ ပြင်းထန်စွာ ငတ်မွတ်ခေါင်းပါးသော ဘေးဒုက္ခကို 'Famine' ဟု သတ်မှတ်ပါသည်။"
      },
      {
        "id": "b1_30",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Litotes & Double Negation",
        "question": "In academic writing, stating that a phenomenon 'is not uncommon' means that it is _______.",
        "options": [
          "quite frequent and ordinary",
          "exceptionally rare",
          "strictly impossible",
          "never occurring"
        ],
        "answer": "quite frequent and ordinary",
        "rationale": "'Not uncommon' is litotes (understatement via double negative) meaning common or frequent.",
        "rationaleMm": "'Not uncommon' (အဆန်းမဟုတ်ပါ) ဆိုသည်မှာ တကယ်တမ်းတွင် အများအားဖြင့် ဖြစ်လေ့ရှိသည်ဟု ဆိုလိုပါသည်။"
      },
      {
        "id": "b1_31",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Negative Inversion",
        "question": "Seldom _______ such an eloquent and persuasive exposition of macroeconomic theory.",
        "options": [
          "have I encountered",
          "I have encountered",
          "I encountered",
          "encountered I"
        ],
        "answer": "have I encountered",
        "rationale": "Negative adverbial 'Seldom' fronted in a sentence triggers mandatory subject-auxiliary inversion.",
        "rationaleMm": "'Seldom' (ခဲယဉ်းစွာ) ဝါကျအစတွင်ရှိပါက auxiliary verb သည် subject ရှေ့သို့ ပြောင်းရွေ့ရပါသည် (Inversion)."
      },
      {
        "id": "b1_32",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Phrasal Verbs",
        "question": "Bilateral trade talks completely broke _______ due to disputes over carbon border tariffs.",
        "options": [
          "down",
          "off",
          "out",
          "away"
        ],
        "answer": "down",
        "rationale": "'Break down' means negotiations, talks, or machines have collapsed and failed to continue.",
        "rationaleMm": "ဆွေးနွေးပွဲများ သဘောထားကွဲလွဲ၍ ပျက်ပြားသွားခြင်းကို 'break down' ဟု သုံးပါသည်။"
      },
      {
        "id": "b1_33",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Third Conditional Inversion",
        "question": "_______ the adverse weather conditions, we would have completed the field expedition on schedule.",
        "options": [
          "Had I known about",
          "If I knew",
          "Did I know",
          "Knowing"
        ],
        "answer": "Had I known about",
        "rationale": "Inverted third conditional ('Had I known' = 'If I had known') removes 'if' and fronts the auxiliary.",
        "rationaleMm": "'If I had known' အစား 'Had I known' ဖြင့် 'If' ကို ဖြုတ်၍ အဆင့်မြင့် Inversion တည်ဆောက်နိုင်ပါသည်။"
      },
      {
        "id": "b1_34",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Mandative Subjunctive",
        "question": "The dean strongly recommended that every thesis candidate _______ a comprehensive literature review.",
        "options": [
          "submit",
          "submits",
          "submitted",
          "will submit"
        ],
        "answer": "submit",
        "rationale": "The mandative subjunctive following 'recommend that' requires the bare base form of the verb.",
        "rationaleMm": "Recommend, insist, demand ကဲ့သို့သော စကားလုံးများနောက် 'that' clause တွင် Base Form (Subjunctive) ကို သုံးရပါသည်။"
      },
      {
        "id": "b1_35",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Negative Inversion",
        "question": "Not until the audit results were published _______ the extent of the budgetary deficit.",
        "options": [
          "did the board comprehend",
          "the board comprehended",
          "comprehended the board",
          "the board did comprehend"
        ],
        "answer": "did the board comprehend",
        "rationale": "When 'Not until...' clause precedes the main clause, the main clause undergoes subject-auxiliary inversion.",
        "rationaleMm": "'Not until' ဝါကျအစတွင်ပါဝင်ပါက ပင်မဝါကျတွင် Inversion (did the board comprehend) ပြုလုပ်ရပါမည်။"
      },
      {
        "id": "b1_36",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Prepositional Collocations",
        "question": "Aggressive promotional discounting resulted _______ a 45% surge in retail sales volumes.",
        "options": [
          "in",
          "to",
          "from",
          "at"
        ],
        "answer": "in",
        "rationale": "'Result in' signifies producing an effect/outcome; 'result from' identifies the underlying cause.",
        "rationaleMm": "အကျိုးရလဒ်တစ်ခု ဖြစ်ပေါ်စေခြင်းကို 'result in' ဟု သုံးပြီး အကြောင်းရင်းကို ညွှန်းပါက 'result from' ဖြစ်ပါသည်။"
      },
      {
        "id": "b1_37",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Academic Connectors",
        "question": "Early indicators suggested market expansion; _______, consumer sentiment plummeted sharply.",
        "options": [
          "conversely",
          "consequently",
          "furthermore",
          "simultaneously"
        ],
        "answer": "conversely",
        "rationale": "'Conversely' introduces an idea or situation that is the reverse or direct contrast of the preceding statement.",
        "rationaleMm": "ရှေ့ဝါကျနှင့် လုံးဝဆန့်ကျင်ဘက် အခြေအနေကို ဖော်ပြရာတွင် 'conversely' (တစ်ဖက်တွင်မူ) ကို အသုံးပြုပါသည်။"
      },
      {
        "id": "b1_38",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Idiomatic Collocations",
        "question": "The minister's sudden resignation gave rise _______ widespread political speculation.",
        "options": [
          "to",
          "for",
          "with",
          "into"
        ],
        "answer": "to",
        "rationale": "'Give rise to' is a fixed high-level idiom meaning to cause or trigger something to happen.",
        "rationaleMm": "ကောလာဟလ သို့မဟုတ် အခြေအနေတစ်ခုကို ပေါ်ပေါက်စေခြင်းကို 'give rise to' ဟု သုံးနှုန်းပါသည်။"
      },
      {
        "id": "b1_39",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Negative Inversion",
        "question": "Little _______ that their archaeological excavation would uncover a subterranean royal tomb.",
        "options": [
          "did the explorers suspect",
          "the explorers suspected",
          "had suspected the explorers",
          "suspected the explorers"
        ],
        "answer": "did the explorers suspect",
        "rationale": "Fronted restrictive negative adverb 'Little' forces subject-auxiliary inversion ('did the explorers suspect').",
        "rationaleMm": "'Little' ဝါကျအစတွင် ရောက်ရှိသောအခါ Inversion (did the explorers suspect) ဖြစ်ပေါ်ရပါမည်။"
      },
      {
        "id": "b1_40",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Prepositional Nuances",
        "question": "The pilot scheme was implemented _______ varying degrees of success across pilot districts.",
        "options": [
          "with",
          "by",
          "under",
          "in"
        ],
        "answer": "with",
        "rationale": "The idiomatic prepositional phrase is 'with varying degrees of success'.",
        "rationaleMm": "အတိုင်းအတာအမျိုးမျိုးဖြင့် အောင်မြင်မှုကို 'with varying degrees of success' ဟု သုံးပါသည်။"
      },
      {
        "id": "b1_41",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Subtle Nuance (Imply vs Infer)",
        "question": "Are you _______ that my empirical methodology was fundamentally flawed?",
        "options": [
          "implying",
          "inferring",
          "implementing",
          "inflicting"
        ],
        "answer": "implying",
        "rationale": "'Imply' means to hint or suggest indirectly as a speaker; 'infer' means to deduce as a listener.",
        "rationaleMm": "ပြောဆိုသူဘက်မှ သွယ်ဝိုက်ပြောဆိုခြင်းကို 'imply' ဟုသုံးပြီး နားထောင်သူဘက်မှ ကောက်ချက်ဆွဲခြင်းကို 'infer' ဟု သုံးပါသည်။"
      },
      {
        "id": "b1_42",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Legal Precision",
        "question": "The attorney sought to rigorously _______ the hostile witness on cross-examination.",
        "options": [
          "interrogate",
          "integrate",
          "intimidate",
          "intercept"
        ],
        "answer": "interrogate",
        "rationale": "'Interrogate' means to question formally and systematically, especially in a judicial or legal context.",
        "rationaleMm": "တရားရုံးတွင် သက်သေအား စနစ်တကျ မေးမြန်းစစ်ဆေးခြင်းကို 'interrogate' ဟု တိကျစွာ သုံးပါသည်။"
      },
      {
        "id": "b1_43",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Idiomatic Rhetoric",
        "question": "What does the expression 'He is nothing if not meticulous' signify?",
        "options": [
          "He is exceptionally and unquestionably meticulous",
          "He is completely disorganized",
          "He pretends to be meticulous",
          "He is careless about details"
        ],
        "answer": "He is exceptionally and unquestionably meticulous",
        "rationale": "'Nothing if not [adjective]' is an emphatic rhetorical idiom meaning intensely or undeniably possessing that trait.",
        "rationaleMm": "'Nothing if not...' ဆိုသည်မှာ ထိုအရည်အချင်း အလွန်ပြည့်စုံထင်ရှားကြောင်း အလေးပေးဖော်ပြသော အီဒီယမ်ဖြစ်ပါသည်။"
      },
      {
        "id": "b1_44",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Idiomatic Precision",
        "question": "If an academic candidate declares 'I couldn't care less', it literally implies that _______.",
        "options": [
          "their level of care is already at absolute zero",
          "they care a moderate amount",
          "they care deeply and passionately",
          "they are considering the matter carefully"
        ],
        "answer": "their level of care is already at absolute zero",
        "rationale": "'I couldn't care less' means it is impossible to care any less because one does not care at all.",
        "rationaleMm": "'I couldn't care less' ဆိုသည်မှာ စိတ်ဝင်စားမှု လုံးဝ (သုည) မရှိတော့ကြောင်း အဓိပ္ပာယ်ရပါသည်။"
      },
      {
        "id": "b1_45",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Financial Legality",
        "question": "The rogue trader was imprisoned for manufacturing and circulating _______ currency notes.",
        "options": [
          "counterfeit",
          "imitation",
          "artificial",
          "synthetic"
        ],
        "answer": "counterfeit",
        "rationale": "'Counterfeit' specifically applies to fraudulent, unauthorized copies of money or official legal instruments.",
        "rationaleMm": "ငွေစက္ကူအတု ပြုလုပ်ခြင်းကို ဥပဒေကြောင်းအရ 'counterfeit money' ဟု တိကျစွာ ခေါ်ဆိုပါသည်။"
      },
      {
        "id": "b1_46",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Lexical Sophistication",
        "question": "The antique manuscript was _______ with luminous gold leaf illustrations and rare marginalia.",
        "options": [
          "replete",
          "replete of",
          "deplete",
          "complied"
        ],
        "answer": "replete",
        "rationale": "'Replete with' is a C2 literary collocation meaning abundantly supplied or filled with something.",
        "rationaleMm": "'Replete with' သည် အရာဝတ္ထုတစ်ခုခုဖြင့် ပြည့်နှက်နေခြင်းကို ညွှန်းဆိုသော C2 အဆင့် စကားလုံးဖြစ်ပါသည်။"
      },
      {
        "id": "b1_47",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Fixed Idioms",
        "question": "To all _______ and purposes, the two competing software architectures are identical.",
        "options": [
          "intents",
          "intentions",
          "attempts",
          "interests"
        ],
        "answer": "intents",
        "rationale": "'To all intents and purposes' is a fixed formal C2 idiom meaning practically speaking or in effect.",
        "rationaleMm": "'To all intents and purposes' သည် လက်တွေ့သဘောအရ (practically speaking) တူညီသည်ဟု ဆိုလိုပါသည်။"
      },
      {
        "id": "b1_48",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Advanced Lexis",
        "question": "Her critical review offered an _______ analysis that sliced right through the academic rhetoric.",
        "options": [
          "incisive",
          "inclusive",
          "incidental",
          "insidious"
        ],
        "answer": "incisive",
        "rationale": "'Incisive' means penetrating, remarkably sharp, intelligent, and directly addressing the core issue.",
        "rationaleMm": "'Incisive' (ထက်မြက်ပြတ်သားသော) သုံးသပ်ချက်သည် ပြဿနာ၏ အနှစ်သာရကို တိုက်ရိုက်ထိမိစေပါသည်။"
      },
      {
        "id": "b1_49",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Sophisticated Lexis",
        "question": "The defense counsel dismissed the prosecutor's hypothesis as based on _______ circumstantial evidence.",
        "options": [
          "tenuous",
          "tense",
          "tenacious",
          "tender"
        ],
        "answer": "tenuous",
        "rationale": "'Tenuous' denotes something very weak, slight, flimsy, and lacking substantive grounding.",
        "rationaleMm": "'Tenuous' ဆိုသည်မှာ အခြေအမြစ်မခိုင်လုံသော၊ အလွန်အားနည်းသော အထောက်အထားကို ရည်ညွှန်းပါသည်။"
      },
      {
        "id": "b1_50",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Rare Academic Vocabulary",
        "question": "Subsequent court rulings rendered the contested contractual clause entirely _______.",
        "options": [
          "nugatory",
          "notorious",
          "negligent",
          "nominal"
        ],
        "answer": "nugatory",
        "rationale": "'Nugatory' is a formal legal/academic C2 term meaning having no validity, purpose, or practical value.",
        "rationaleMm": "'Nugatory' သည် ဥပဒေကြောင်းအရ အကျုံးမဝင်သော သို့မဟုတ် အရေးမပါတော့သော အဓိပ္ပာယ်ဆောင် C2 ဝေါဟာရဖြစ်ပါသည်။"
      }
    ]
  },
  {
    "id": "batch_2",
    "name": "Diagnostic Form Beta (Advanced Grammar & Synonyms)",
    "questions": [
      {
        "id": "b2_01",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Prepositional Verbs",
        "question": "Whether we go on a field trip or not depends _______ the weather conditions.",
        "options": [
          "on",
          "in",
          "at",
          "from"
        ],
        "answer": "on",
        "rationale": "'Depend' strictly pairs with the preposition 'on' (or 'upon'), never 'in' or 'from'.",
        "rationaleMm": "'Depend' ကြိယာသည် preposition 'on' နှင့်သာ အမြဲတွဲဖက်ရပါသည် (depend on)."
      },
      {
        "id": "b2_02",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Modal Auxiliary",
        "question": "You _______ smoke anywhere on campus; university regulations strictly forbid it.",
        "options": [
          "mustn't",
          "don't have to",
          "needn't",
          "couldn't"
        ],
        "answer": "mustn't",
        "rationale": "'Mustn't' expresses absolute prohibition, whereas 'don't have to' merely indicates lack of obligation.",
        "rationaleMm": "လုံးဝတားမြစ်ထားသော အရာများအတွက် 'mustn't' ကို သုံးရပါသည် (don't have to သည် မလုပ်လည်းရသည်ဟု ဆိုလိုသည်)။"
      },
      {
        "id": "b2_03",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Comparative Structures",
        "question": "My younger brother is not nearly as _______ as our grandfather was.",
        "options": [
          "tall",
          "taller",
          "tallest",
          "more tall"
        ],
        "answer": "tall",
        "rationale": "In the equative construction 'as... as', the positive base form of the adjective ('tall') is required.",
        "rationaleMm": "'as... as' ဖွဲ့စည်းပုံတွင် adjective ၏ မူလ base form (tall) ကိုသာ ထည့်သွင်းရပါမည်။"
      },
      {
        "id": "b2_04",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Indirect Questions",
        "question": "The university admissions officer asked me where I _______ during the pandemic.",
        "options": [
          "had lived",
          "did I live",
          "have lived",
          "was I living"
        ],
        "answer": "had lived",
        "rationale": "Reported/indirect questions use normal statement word order (subject before verb), not question inversion.",
        "rationaleMm": "Indirect Question (အမေးဆင့်ဝါကျ) တွင် subject သည် verb ၏ အရှေ့သို့ ပုံမှန်အတိုင်း လာရပါမည်။"
      },
      {
        "id": "b2_05",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Adverb vs Adjective",
        "question": "Although English is not her native tongue, she articulates ideas remarkably _______.",
        "options": [
          "fluently",
          "fluent",
          "good",
          "fluidity"
        ],
        "answer": "fluently",
        "rationale": "An adverb of manner ('fluently') is required to modify the main verb 'articulates'.",
        "rationaleMm": "ကြိယာ 'articulates' (ရှင်းလင်းစွာပြောဆိုသည်) ကို modify လုပ်ရန် Adverb 'fluently' လိုအပ်ပါသည်။"
      },
      {
        "id": "b2_06",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Habitual Structures",
        "question": "When I was an undergraduate, I used _______ up at 05:00 every morning to study vocabulary.",
        "options": [
          "to get",
          "getting",
          "get",
          "got"
        ],
        "answer": "to get",
        "rationale": "'Used to + base verb' expresses a discontinued past habit, distinct from 'be used to + -ing'.",
        "rationaleMm": "အတိတ်က အလေ့အထကို ဖော်ပြရာတွင် 'used to + infinitive' (used to get) ကို အသုံးပြုရပါသည်။"
      },
      {
        "id": "b2_07",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Suggestions",
        "question": "How about _______ to the academic library to review today's lecture notes?",
        "options": [
          "going",
          "to go",
          "go",
          "gone"
        ],
        "answer": "going",
        "rationale": "'How about / What about' is followed by a gerund (-ing) when making informal suggestions.",
        "rationaleMm": "'How about' ဖြင့် အကြံပြုတိုက်တွန်းရာတွင် gerund (-ing) ပုံစံ လိုက်ရပါသည်။"
      },
      {
        "id": "b2_08",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Passive Voice",
        "question": "The confidential examination papers _______ to the headmaster's office yesterday.",
        "options": [
          "were delivered",
          "delivered",
          "have delivered",
          "were delivering"
        ],
        "answer": "were delivered",
        "rationale": "Passive voice in the past simple ('were delivered') is required because papers received the action.",
        "rationaleMm": "စာမေးပွဲမေးခွန်းများကိုယ်တိုင် မပို့ဆောင်ဘဲ ပို့ဆောင်ခြင်းခံရသဖြင့် Passive (were delivered) ဖြစ်ပါသည်။"
      },
      {
        "id": "b2_09",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Relative Clauses",
        "question": "The university library is the quiet place _______ I usually study for my examinations.",
        "options": [
          "where",
          "which",
          "that",
          "whose"
        ],
        "answer": "where",
        "rationale": "'Where' is the relative adverb used to refer to a physical location or place.",
        "rationaleMm": "နေရာဒေသကို ရည်ညွှန်းသော relative adverb မှာ 'where' ဖြစ်ပါသည်။"
      },
      {
        "id": "b2_10",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Verb Patterns",
        "question": "She promised _______ me with the challenging statistical analysis this weekend.",
        "options": [
          "to assist",
          "assisting",
          "assist",
          "assisted"
        ],
        "answer": "to assist",
        "rationale": "The verb 'promise' is followed by a to-infinitive ('promise to do something').",
        "rationaleMm": "'Promise' ကြိယာနောက်တွင် to-infinitive (to assist) လိုက်ရပါသည်။"
      },
      {
        "id": "b2_11",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Second Conditional",
        "question": "If I _______ more free time this semester, I would join the university debate club.",
        "options": [
          "had",
          "have",
          "would have",
          "had had"
        ],
        "answer": "had",
        "rationale": "Second conditional (hypothetical present/future) takes 'if + past simple, would + base verb'.",
        "rationaleMm": "လက်ရှိတွင် မဖြစ်နိုင်သေးသော စိတ်ကူးယဉ်အခြေအနေအတွက် Second Conditional (If + Past Simple) သုံးပါသည်။"
      },
      {
        "id": "b2_12",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Third Conditional",
        "question": "If you had warned me about the heavy traffic, I _______ on time.",
        "options": [
          "would have arrived",
          "would arrive",
          "will arrive",
          "arrived"
        ],
        "answer": "would have arrived",
        "rationale": "Third conditional (counterfactual past) takes 'if + past perfect, would have + past participle'.",
        "rationaleMm": "အတိတ်က မဖြစ်ခဲ့သော အခြေအနေကို နောင်တရဖော်ပြရာတွင် Third Conditional (would have + V3) ကို သုံးပါသည်။"
      },
      {
        "id": "b2_13",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Present Wishes",
        "question": "I really wish I _______ fluent conversational French for my upcoming research trip.",
        "options": [
          "spoke",
          "speak",
          "have spoken",
          "would speak"
        ],
        "answer": "spoke",
        "rationale": "'Wish + past simple' expresses a desire for a present situation to be different.",
        "rationaleMm": "လက်ရှိအခြေအနေကို ဆန့်ကျင်၍ တောင့်တဆန္ဒပြုရာတွင် 'wish + past simple' (spoke) ကို သုံးရပါသည်။"
      },
      {
        "id": "b2_14",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Causative Verbs",
        "question": "We need to have our laboratory instruments _______ by an certified technician.",
        "options": [
          "calibrated",
          "calibrating",
          "calibrate",
          "to calibrate"
        ],
        "answer": "calibrated",
        "rationale": "Causative structure: 'have + object + past participle' denotes arranging for a service to be done.",
        "rationaleMm": "မိမိကိုယ်တိုင်မဟုတ်ဘဲ ကျွမ်းကျင်သူကို ပြုပြင်စေခြင်းအတွက် Causative (have + object + V3) ကို သုံးပါသည်။"
      },
      {
        "id": "b2_15",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Correlative Inversion",
        "question": "Scarcely had the keynote speaker commenced _______ the projector malfunctioned.",
        "options": [
          "when",
          "than",
          "then",
          "after"
        ],
        "answer": "when",
        "rationale": "'Scarcely had [subject] [V3] when [clause]' is the strict correlative construction.",
        "rationaleMm": "'Scarcely had...' နှင့် တွဲဖက်ရသော စကားလုံးမှာ 'when' ဖြစ်ပါသည်။ ('than' မဟုတ်ပါ)။"
      },
      {
        "id": "b2_16",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Modal Deduction",
        "question": "She _______ left her phone in the lecture hall; she was checking emails right before leaving.",
        "options": [
          "must have",
          "can't have",
          "should have",
          "would have"
        ],
        "answer": "must have",
        "rationale": "'Must have + V3' expresses a strong logical deduction about an event in the past.",
        "rationaleMm": "အတိတ်က ဖြစ်ရပ်တစ်ခုအပေါ် သေချာသလောက် ယုတ္တိရှိစွာ ခန့်မှန်းရာတွင် 'must have + V3' ကို သုံးပါသည်။"
      },
      {
        "id": "b2_17",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Gerund vs Infinitive",
        "question": "Please remember _______ off the laboratory ovens before exiting the facility.",
        "options": [
          "to switch",
          "switching",
          "switch",
          "switched"
        ],
        "answer": "to switch",
        "rationale": "'Remember to do' refers to not forgetting an obligation; 'remember doing' is recalling a past memory.",
        "rationaleMm": "'Remember to switch' (မေ့မသွားဘဲ ပိတ်ရန်) သည် တာဝန်ဝတ္တရားဖြစ်ပြီး 'remember switching' သည် အတိတ်အမှတ်တရဖြစ်ပါသည်။"
      },
      {
        "id": "b2_18",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Contrastive Adverbs",
        "question": "He was brilliant at theoretical physics; _______, his experimental laboratory skills were weak.",
        "options": [
          "however",
          "furthermore",
          "therefore",
          "moreover"
        ],
        "answer": "however",
        "rationale": "'However' is used to contrast a positive attribute with an opposing drawback.",
        "rationaleMm": "ဆန့်ကျင်ဘက် အချက်အလက်ကို ဆက်စပ်ဖော်ပြရာတွင် 'however' (သို့သော်လည်း) ကို သုံးပါသည်။"
      },
      {
        "id": "b2_19",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Phrasal Verbs",
        "question": "The department chair decided to _______ the faculty meeting until next Thursday.",
        "options": [
          "put off",
          "call off",
          "take off",
          "turn off"
        ],
        "answer": "put off",
        "rationale": "'Put off' means to postpone or delay; 'call off' means to cancel completely.",
        "rationaleMm": "'Put off' (ရွှေ့ဆိုင်းသည်) ဖြစ်ပြီး 'Call off' (ဖျက်သိမ်းသည်) နှင့် ကွဲပြားပါသည်။"
      },
      {
        "id": "b2_20",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Prepositional Collocations",
        "question": "The research team succeeded _______ isolating the previously uncharacterized enzyme.",
        "options": [
          "in",
          "on",
          "at",
          "for"
        ],
        "answer": "in",
        "rationale": "The verb 'succeed' strictly pairs with the preposition 'in' followed by a gerund.",
        "rationaleMm": "'Succeed' ကြိယာသည် 'in' နှင့်သာ အမြဲတွဲဖက်အသုံးပြုရပါသည် (succeed in doing)."
      },
      {
        "id": "b2_21",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Concession Clauses",
        "question": "Much _______ I admire his intellectual curiosity, I cannot support his research ethics.",
        "options": [
          "as",
          "though",
          "although",
          "despite"
        ],
        "answer": "as",
        "rationale": "'Much as' is a formal concession structure meaning 'although I admire him very much'.",
        "rationaleMm": "'Much as' သည် 'ခပ်သိမ်းသော အားကျမှုရှိသော်ငြားလည်း' ဟူသော အဆင့်မြင့် ဆန့်ကျင်ဘက် အဖွင့်ဖြစ်ပါသည်။"
      },
      {
        "id": "b2_22",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Mixed Conditionals",
        "question": "If she had accepted the scholarship last year, she _______ studying in Cambridge right now.",
        "options": [
          "would be",
          "would have been",
          "will be",
          "had been"
        ],
        "answer": "would be",
        "rationale": "Mixed conditional: a past condition ('if she had accepted') with a present result ('would be studying right now').",
        "rationaleMm": "အတိတ်က အကြောင်းရင်းနှင့် လက်ရှိအကျိုးရလဒ်ကို ဆက်စပ်သော Mixed Conditional တွင် 'would be' ကို သုံးပါသည်။"
      },
      {
        "id": "b2_23",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Dependent Prepositions",
        "question": "Many young scholars are completely unaware _______ the revised ethics disclosure protocols.",
        "options": [
          "of",
          "about",
          "for",
          "with"
        ],
        "answer": "of",
        "rationale": "The adjective 'unaware' strictly collocates with the preposition 'of'.",
        "rationaleMm": "'Unaware' နာမဝိသေသနသည် 'of' နှင့်သာ အမြဲတွဲဖက်ရပါသည် (unaware of)."
      },
      {
        "id": "b2_24",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Collocations",
        "question": "The committee reached a unanimous _______ after five grueling hours of debate.",
        "options": [
          "decision",
          "solution",
          "resolution",
          "determination"
        ],
        "answer": "decision",
        "rationale": "'Reach a decision' is the standard academic collocation for coming to a collective choice.",
        "rationaleMm": "ဆုံးဖြတ်ချက်တစ်ခု ချမှတ်နိုင်ခဲ့ခြင်းကို 'reach a decision' ဟု တွဲဖက်သုံးပါသည်။"
      },
      {
        "id": "b2_25",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Word Formation",
        "question": "The professor commended her paper for its remarkable clarity and intellectual _______.",
        "options": [
          "depth",
          "deepness",
          "deep",
          "deeply"
        ],
        "answer": "depth",
        "rationale": "The abstract noun form of the adjective 'deep' is 'depth'.",
        "rationaleMm": "'Deep' ၏ စိတ်ကူးအတွေးအခေါ်ဆိုင်ရာ နာမ် (noun) ပုံစံမှာ 'depth' (နက်ရှိုင်းမှု) ဖြစ်ပါသည်။"
      },
      {
        "id": "b2_26",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Negative Inversion",
        "question": "Under no circumstances _______ personal data be transmitted over unencrypted networks.",
        "options": [
          "should",
          "personal data should",
          "must not",
          "shall not"
        ],
        "answer": "should",
        "rationale": "Negative prepositional phrase 'Under no circumstances' fronted forces subject-auxiliary inversion.",
        "rationaleMm": "'Under no circumstances' (မည်သည့်အခြေအနေတွင်မျှ) ဝါကျအစ၌ ပါရှိပါက Inversion ပြုလုပ်ရပါမည်။"
      },
      {
        "id": "b2_27",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Subjunctive Mood",
        "question": "It is imperative that the research protocol _______ strictly adhered to by all clinical staff.",
        "options": [
          "be",
          "is",
          "was",
          "will be"
        ],
        "answer": "be",
        "rationale": "The mandative subjunctive form 'be' is required after impersonal expressions of necessity ('It is imperative that...').",
        "rationaleMm": "'It is imperative that...' နောက်တွင် Base Form ဖြစ်သော Subjunctive 'be' ကို သုံးရပါမည်။"
      },
      {
        "id": "b2_28",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Cleft Sentences",
        "question": "It was only after re-evaluating the statistical variance _______ the discrepancy became evident.",
        "options": [
          "that",
          "when",
          "which",
          "then"
        ],
        "answer": "that",
        "rationale": "'It is/was [element] that [clause]' is the canonical it-cleft structure for focal emphasis.",
        "rationaleMm": "အလေးပေးဖော်ပြသော Cleft Sentence တွင် 'It was... that...' ဖွဲ့စည်းပုံကို သုံးရပါသည်။"
      },
      {
        "id": "b2_29",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Hedging & Nuance",
        "question": "The newly discovered evidence serves to _______ previous assumptions regarding glacial retreat rates.",
        "options": [
          "undermine",
          "underline",
          "undertake",
          "undergo"
        ],
        "answer": "undermine",
        "rationale": "'Undermine' means to erode the basis or validity of a theory or hypothesis.",
        "rationaleMm": "ယူဆချက်အဟောင်းများ၏ အခြေအမြစ်ကို လျော့ပါးအားနည်းသွားစေခြင်းကို 'undermine' ဟု သုံးပါသည်။"
      },
      {
        "id": "b2_30",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Advanced Linking",
        "question": "The policy was enacted swiftly; _______, public opposition mounted with unprecedented speed.",
        "options": [
          "nevertheless",
          "consequently",
          "likewise",
          "hence"
        ],
        "answer": "nevertheless",
        "rationale": "'Nevertheless' is a concessive conjunctive adverb equivalent to 'in spite of that'.",
        "rationaleMm": "ထိုသို့ဖြစ်သော်လည်း ဟူသော အဆင့်မြင့် ဆက်စပ်စကားလုံးအဖြစ် 'nevertheless' ကို သုံးပါသည်။"
      },
      {
        "id": "b2_31",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Inversion with Adverbs",
        "question": "Only by examining long-term empirical datasets _______ identify recurring climatic cycles.",
        "options": [
          "can researchers",
          "researchers can",
          "do researchers",
          "are researchers"
        ],
        "answer": "can researchers",
        "rationale": "'Only by [gerund]' fronted in a sentence triggers inversion in the subsequent main clause.",
        "rationaleMm": "'Only by...' ဝါကျအစတွင် ပါရှိပါက အဓိကဝါကျတွင် Inversion (can researchers) ဖြစ်ပေါ်ရပါမည်။"
      },
      {
        "id": "b2_32",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Academic Collocations",
        "question": "The sudden collapse of the regional bank _______ shockwaves throughout the global financial sector.",
        "options": [
          "sent",
          "threw",
          "drove",
          "pushed"
        ],
        "answer": "sent",
        "rationale": "'Send shockwaves through' is the idiomatic academic and journalistic collocation.",
        "rationaleMm": "တုန်လှုပ်ချောက်ချားဖွယ် အကျိုးသက်ရောက်မှု ဖြစ်စေခြင်းကို 'send shockwaves through' ဟု တွဲဖက်သုံးပါသည်။"
      },
      {
        "id": "b2_33",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Participle Clauses",
        "question": "_______ the preliminary laboratory trials, the team moved on to human clinical testing.",
        "options": [
          "Having concluded",
          "Concluding",
          "Concluded",
          "To conclude"
        ],
        "answer": "Having concluded",
        "rationale": "A perfect participle clause ('Having concluded') indicates an action fully finished before the main verb.",
        "rationaleMm": "ပထမလုပ်ဆောင်ချက် ပြီးဆုံးပြီးမှ နောက်တစ်ခုစတင်ကြောင်း ဖော်ပြရန် Perfect Participle ကို သုံးပါသည်။"
      },
      {
        "id": "b2_34",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Advanced Prepositions",
        "question": "The judicial decision was made _______ of any partisan political influence.",
        "options": [
          "irrespective",
          "regardless",
          "respectless",
          "unrespective"
        ],
        "answer": "irrespective",
        "rationale": "'Irrespective of' is the formal academic collocation meaning regardless of or without consideration of.",
        "rationaleMm": "မည်သည့်အရာကိုမျှ ထည့်မတွက်ဘဲ ဟူသော အဓိပ္ပာယ်တွင် 'irrespective of' ကို သုံးပါသည်။"
      },
      {
        "id": "b2_35",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Phrasal Verbs",
        "question": "The university's legal department decided to _______ into the allegations of plagiarism.",
        "options": [
          "look",
          "see",
          "watch",
          "glance"
        ],
        "answer": "look",
        "rationale": "'Look into' means to formally investigate or examine the facts of a situation.",
        "rationaleMm": "စုံစမ်းစစ်ဆေးခြင်းကို phrasal verb အနေဖြင့် 'look into' ဟု သုံးနှုန်းပါသည်။"
      },
      {
        "id": "b2_36",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Collocations",
        "question": "Her groundbreaking research paper _______ doubt on the validity of established quantum models.",
        "options": [
          "cast",
          "threw",
          "shed",
          "spread"
        ],
        "answer": "cast",
        "rationale": "'Cast doubt on' is the precise academic collocation meaning to make something appear uncertain.",
        "rationaleMm": "သံသယဖြစ်ဖွယ် အခြေအနေကို ဖန်တီးပြခြင်းကို 'cast doubt on' ဟု သုံးပါသည်။"
      },
      {
        "id": "b2_37",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Inverted Conditionals",
        "question": "_______ you encounter any discrepancies during the data auditing, please notify IT immediately.",
        "options": [
          "Should",
          "Were",
          "Had",
          "Could"
        ],
        "answer": "Should",
        "rationale": "'Should you encounter' is the formal inverted first conditional equivalent of 'If you should encounter'.",
        "rationaleMm": "'If you encounter' အစား တရားဝင်စာရေးသားမှုတွင် 'Should you encounter' ဖြင့် Inversion သုံးပါသည်။"
      },
      {
        "id": "b2_38",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Complex Conjunctions",
        "question": "The proposed infrastructure reforms are viable _______ sufficient public funding is guaranteed.",
        "options": [
          "provided that",
          "as far as",
          "unless",
          "in case of"
        ],
        "answer": "provided that",
        "rationale": "'Provided that' means 'on condition that' or 'only if', introducing a conditional requirement.",
        "rationaleMm": "'အကယ်၍ ထိုအချက် ပြည့်စုံမှသာ' ဟူသော သတ်မှတ်ချက်ကို 'provided that' ဖြင့် ဖော်ပြပါသည်။"
      },
      {
        "id": "b2_39",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Formal Prepositions",
        "question": "The treaty was signed in strict _______ with established international maritime conventions.",
        "options": [
          "accordance",
          "agreement",
          "conform",
          "cooperation"
        ],
        "answer": "accordance",
        "rationale": "'In accordance with' is the formal legal/academic collocation meaning in compliance with rules.",
        "rationaleMm": "စည်းမျဉ်းဥပဒေများနှင့် ကိုက်ညီညီညွတ်စွာ ဆောင်ရွက်ခြင်းကို 'in accordance with' ဟု သုံးပါသည်။"
      },
      {
        "id": "b2_40",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Vocabulary Discrimination",
        "question": "The company's rapid expansion proved to be an _______ success, exceeding all financial targets.",
        "options": [
          "unmitigated",
          "unmatched",
          "unbroken",
          "unlimited"
        ],
        "answer": "unmitigated",
        "rationale": "'Unmitigated' means absolute, complete, and unqualified (often paired with success or disaster).",
        "rationaleMm": "'Unmitigated success' ဆိုသည်မှာ မည်သည့်အပြစ်အနာအဆာမျှ မရှိသော ပြီးပြည့်စုံသည့် အောင်မြင်မှုဖြစ်ပါသည်။"
      },
      {
        "id": "b2_41",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Archaic / Fixed Subjunctive",
        "question": "Be that as it _______, we must nevertheless allocate capital to ongoing infrastructure projects.",
        "options": [
          "may",
          "is",
          "be",
          "were"
        ],
        "answer": "may",
        "rationale": "'Be that as it may' is a fixed C2 concessive phrase meaning 'nevertheless' or 'regardless of that fact'.",
        "rationaleMm": "'Be that as it may' (မည်သို့ပင်ဖြစ်စေကာမူ) သည် C2 အဆင့် မဖြစ်မနေသိထားရမည့် Fixed Idiom ဖြစ်ပါသည်။"
      },
      {
        "id": "b2_42",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Idiomatic Expressions",
        "question": "The resignation of the chief researcher came as a bolt from the _______, stunning the entire faculty.",
        "options": [
          "blue",
          "sky",
          "dark",
          "storm"
        ],
        "answer": "blue",
        "rationale": "'A bolt from the blue' is a C2 idiom meaning a complete and utterly unexpected surprise or shock.",
        "rationaleMm": "'A bolt from the blue' ဆိုသည်မှာ မျှော်လင့်မထားဘဲ ရုတ်တရက် အံ့အားသင့်ဖွယ် ဖြစ်ပေါ်လာသော အဖြစ်အပျက်ကို ရည်ညွှန်းပါသည်။"
      },
      {
        "id": "b2_43",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Advanced Lexis",
        "question": "The architectural restoration was executed with _______ attention to 18th-century historical detail.",
        "options": [
          "painstaking",
          "pained",
          "painful",
          "painless"
        ],
        "answer": "painstaking",
        "rationale": "'Painstaking' means displaying meticulous, extremely diligent, and thorough care.",
        "rationaleMm": "'Painstaking' (အလွန်အပင်ပန်းခံ၍ စေ့စပ်သေချာသော) သည် C2 အဆင့် အထူးသတိထားမှုပြ နာမဝိသေသနဖြစ်ပါသည်။"
      },
      {
        "id": "b2_44",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Academic Quibbles",
        "question": "Let us dismiss petty semantic _______ and focus directly upon empirical methodology.",
        "options": [
          "quibbles",
          "queries",
          "qualms",
          "quests"
        ],
        "answer": "quibbles",
        "rationale": "'Semantic quibbles' refers to minor, trivial, or petty arguments over words rather than substantive issues.",
        "rationaleMm": "'Semantic quibbles' ဆိုသည်မှာ အဓိကပြဿနာမဟုတ်ဘဲ စကားလုံး အသုံးအနှုန်းအသေးအမွှားကို ငြင်းခုံခြင်းကို ဆိုလိုပါသည်။"
      },
      {
        "id": "b2_45",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Dramatic Catastrophe",
        "question": "The unexpected burst of the speculative housing bubble precipitated a _______ economic crash.",
        "options": [
          "cataclysmic",
          "catatonic",
          "categorical",
          "cathartic"
        ],
        "answer": "cataclysmic",
        "rationale": "'Cataclysmic' denotes an event causing violent, massive upheaval, or immense devastating collapse.",
        "rationaleMm": "'Cataclysmic' သည် ကြီးမားပြင်းထန်သော ကပ်ဘေးသဖွယ် ပျက်စီးပြိုလဲမှုကို ညွှန်းဆိုသော စကားလုံးဖြစ်ပါသည်။"
      },
      {
        "id": "b2_46",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Inverted Hypotheticals",
        "question": "Were it _______ for her tireless philanthropic patronage, the laboratory would have closed years ago.",
        "options": [
          "not",
          "had",
          "been",
          "without"
        ],
        "answer": "not",
        "rationale": "'Were it not for + noun' is the inverted second conditional form of 'If it were not for'.",
        "rationaleMm": "'If it were not for' အစား 'Were it not for' (သူမ၏ ကူညီမှုသာ မရှိခဲ့လျှင်) ဖြင့် အဆင့်မြင့် Inversion တည်ဆောက်ပါသည်။"
      },
      {
        "id": "b2_47",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Sophisticated Adjectives",
        "question": "A noisy, chaotic open-office configuration is rarely _______ to deep academic concentration.",
        "options": [
          "conducive",
          "conductive",
          "consequent",
          "congruent"
        ],
        "answer": "conducive",
        "rationale": "'Conducive to' means making a certain situation or outcome likely or possible.",
        "rationaleMm": "'Conducive to' သည် အခြေအနေကောင်းတစ်ခု ဖြစ်ပေါ်လာစေရန် အထောက်အကူပြုသည်ဟု အဓိပ္ပာယ်ရပါသည်။"
      },
      {
        "id": "b2_48",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Literary Vocabulary",
        "question": "His philosophical lecture was plagued by convoluted syntax and _______ obfuscation.",
        "options": [
          "willful",
          "willing",
          "wishful",
          "wistful"
        ],
        "answer": "willful",
        "rationale": "'Willful' means intentional, deliberate, and obstinate, showing stubborn intent.",
        "rationaleMm": "'Willful' ဆိုသည်မှာ တမင်ရည်ရွယ်ချက်ရှိရှိ ခေါင်းမာစွာ လုပ်ဆောင်ခြင်းကို ဆိုလိုပါသည်။"
      },
      {
        "id": "b2_49",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Rhetorical Subjunctive",
        "question": "Suffice it to _______ that the exploratory hypothesis was validated beyond all reasonable doubt.",
        "options": [
          "say",
          "tell",
          "speak",
          "state"
        ],
        "answer": "say",
        "rationale": "'Suffice it to say' is a fixed formal C2 idiom meaning 'it is enough to say'.",
        "rationaleMm": "'Suffice it to say' (ဤမျှပြောရုံနှင့် လုံလောက်ပါသည်) သည် ပညာရပ်ဆိုင်ရာ စာတမ်းများတွင် သုံးသော အီဒီယမ်ဖြစ်ပါသည်။"
      },
      {
        "id": "b2_50",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Nuanced Verbs",
        "question": "The diplomat sought to _______ the brewing international hostility through discreet backchannel dialogue.",
        "options": [
          "defuse",
          "diffuse",
          "refuse",
          "infuse"
        ],
        "answer": "defuse",
        "rationale": "'Defuse' means to de-escalate tension or remove danger; 'diffuse' means to scatter or spread widely.",
        "rationaleMm": "တင်းမာမှုအခြေအနေကို လျှော့ချပြေငြိမ်းစေခြင်းကို 'defuse' ဟု သုံးပြီး 'diffuse' (ပျံ့နှံ့စေခြင်း) နှင့် မတူပါ။"
      }
    ]
  },
  {
    "id": "batch_3",
    "name": "Diagnostic Form Gamma (Academic Collocations & Inversions)",
    "questions": [
      {
        "id": "b3_01",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Prepositional Collocations",
        "question": "She is remarkably interested _______ learning international environmental law.",
        "options": [
          "in",
          "on",
          "at",
          "about"
        ],
        "answer": "in",
        "rationale": "The adjective 'interested' strictly takes the preposition 'in'.",
        "rationaleMm": "'Interested' နာမဝိသေသနသည် 'in' နှင့်သာ အမြဲတွဲဖက်ရပါသည် (interested in)."
      },
      {
        "id": "b3_02",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Quantifiers",
        "question": "There was very _______ furniture inside the newly leased apartment.",
        "options": [
          "little",
          "few",
          "many",
          "a few"
        ],
        "answer": "little",
        "rationale": "'Furniture' is an uncountable noun and therefore pairs with 'little', not 'few'.",
        "rationaleMm": "'Furniture' သည် ရေတွက်မရသော နာမ်ဖြစ်သောကြောင့် 'little' ဖြင့်သာ တွဲဖက်ရပါမည်။"
      },
      {
        "id": "b3_03",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Articles & Nouns",
        "question": "Can you give me some helpful _______ regarding my university application?",
        "options": [
          "advice",
          "advices",
          "advise",
          "advises"
        ],
        "answer": "advice",
        "rationale": "'Advice' is an uncountable noun (no plural 's'); 'advise' is the verb form.",
        "rationaleMm": "'Advice' (အကြံဉာဏ်) သည် ရေတွက်မရသဖြင့် 's' မပါရပါ၊ 'Advise' မှာ ကြိယာဖြစ်ပါသည်။"
      },
      {
        "id": "b3_04",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Modal Verbs",
        "question": "You _______ show your student ID card at the entrance to access the computer lab.",
        "options": [
          "have to",
          "might",
          "can",
          "may"
        ],
        "answer": "have to",
        "rationale": "'Have to' expresses external obligation imposed by institutional rules.",
        "rationaleMm": "တက္ကသိုလ်စည်းကမ်းအရ မဖြစ်မနေ လိုက်နာရသော တာဝန်ကို 'have to' ဖြင့် ဖော်ပြပါသည်။"
      },
      {
        "id": "b3_05",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Subject-Verb Agreement",
        "question": "Neither of the proposed solutions _______ satisfactory to the committee.",
        "options": [
          "was",
          "were",
          "are",
          "have been"
        ],
        "answer": "was",
        "rationale": "'Neither of' takes a singular verb ('was') in formal standard English.",
        "rationaleMm": "Standard English တွင် 'Neither of' ၏နောက်၌ Singular verb (was) လိုက်ရပါသည်။"
      },
      {
        "id": "b3_06",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Past Continuous",
        "question": "While she _______ across campus, it suddenly started to rain heavily.",
        "options": [
          "was walking",
          "walked",
          "is walking",
          "has walked"
        ],
        "answer": "was walking",
        "rationale": "Past continuous ('was walking') describes an ongoing background action interrupted by a past simple event.",
        "rationaleMm": "အတိတ်တွင် တစ်စုံတစ်ခုဖြစ်ပျက်နေစဉ် အခြားအရာတစ်ခု ဝင်ရောက်ဖြစ်ပျက်ပါက Past Continuous ကို သုံးပါသည်။"
      },
      {
        "id": "b3_07",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Pronouns",
        "question": "The scholarship committee awarded the grant to Hugo and _______.",
        "options": [
          "me",
          "I",
          "myself",
          "mine"
        ],
        "answer": "me",
        "rationale": "Object pronoun 'me' is required after the preposition 'to' ('to Hugo and me').",
        "rationaleMm": "Preposition 'to' ၏နောက်တွင် Object pronoun 'me' ကိုသာ သုံးရပါမည် ('I' မဟုတ်ပါ)။"
      },
      {
        "id": "b3_08",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Present Perfect",
        "question": "I have not visited the National Museum in Naypyidaw _______ last year.",
        "options": [
          "since",
          "for",
          "from",
          "during"
        ],
        "answer": "since",
        "rationale": "'Since' is used with a specific point in time in the past ('last year').",
        "rationaleMm": "အတိတ်က တိကျသော အချိန်မှတ်တစ်ခုကို ဖော်ပြလိုပါက 'since' ကို သုံးရပါသည်။"
      },
      {
        "id": "b3_09",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "First Conditional",
        "question": "If the flight _______ delayed, we will reschedule our orientation meeting.",
        "options": [
          "is",
          "will be",
          "was",
          "would be"
        ],
        "answer": "is",
        "rationale": "In first conditional 'if-clauses', present simple ('is') is used, not 'will be'.",
        "rationaleMm": "First Conditional ၏ 'if' ဝါကျအပိုင်းတွင် 'will' မသုံးဘဲ Present Simple (is) ကို သုံးရပါသည်။"
      },
      {
        "id": "b3_10",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Collocations",
        "question": "Students must _______ attention to the examiner's oral instructions during Section 1.",
        "options": [
          "pay",
          "make",
          "give",
          "take"
        ],
        "answer": "pay",
        "rationale": "'Pay attention' is the standard fixed collocation meaning to listen carefully.",
        "rationaleMm": "အာရုံစိုက်နားထောင်ခြင်းကို 'pay attention' ဟု သုံးနှုန်းပါသည်။"
      },
      {
        "id": "b3_11",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Dependent Prepositions",
        "question": "The university curriculum is focused _______ developing critical analytical skills.",
        "options": [
          "on",
          "in",
          "with",
          "at"
        ],
        "answer": "on",
        "rationale": "'Focus' strictly pairs with 'on' ('focused on developing').",
        "rationaleMm": "'Focus' ကြိယာသည် 'on' နှင့် အမြဲတွဲဖက်ရပါသည် (focus on)."
      },
      {
        "id": "b3_12",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Gerund vs Infinitive",
        "question": "He regretted _______ so aggressively during the departmental debate.",
        "options": [
          "speaking",
          "to speak",
          "speak",
          "having spoke"
        ],
        "answer": "speaking",
        "rationale": "'Regret + -ing' expresses sorrow or remorse about a past action.",
        "rationaleMm": "အတိတ်က လုပ်ဆောင်ခဲ့မိသောအရာအတွက် နောင်တရခြင်းကို 'regret + gerund' (speaking) ဖြင့် ဖော်ပြပါသည်။"
      },
      {
        "id": "b3_13",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Modal Deduction",
        "question": "He _______ been at the library; it was completely closed for renovation all day yesterday.",
        "options": [
          "can't have",
          "must have",
          "should have",
          "might have"
        ],
        "answer": "can't have",
        "rationale": "'Can't have + V3' expresses an impossibility deduction about the past.",
        "rationaleMm": "အတိတ်က လုံးဝမဖြစ်နိုင်သောအရာကို ယုတ္တိနည်းကျ ကောက်ချက်ချရာတွင် 'can't have + V3' ကို သုံးပါသည်။"
      },
      {
        "id": "b3_14",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Contrast Connectors",
        "question": "In _______ of the intense humidity, the athletes completed the marathon.",
        "options": [
          "spite",
          "despite",
          "contrast",
          "terms"
        ],
        "answer": "spite",
        "rationale": "'In spite of' is the three-word prepositional phrase equivalent to 'despite'.",
        "rationaleMm": "'In spite of' သည် 'despite' နှင့် အဓိပ္ပာယ်တူပြီး 'in spite of' တွင် 'of' ပါဝင်ပါသည်။"
      },
      {
        "id": "b3_15",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Relative Pronouns",
        "question": "The candidate _______ essay scored Band 9.0 received a prestigious scholarship.",
        "options": [
          "whose",
          "who's",
          "whom",
          "which"
        ],
        "answer": "whose",
        "rationale": "'Whose' is the possessive relative pronoun modifying 'essay'.",
        "rationaleMm": "ပိုင်ဆိုင်မှုကိုပြသော relative pronoun မှာ 'whose' (whose essay) ဖြစ်ပါသည်။"
      },
      {
        "id": "b3_16",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Inverted Conditionals",
        "question": "_______ you need further assistance with your citation formats, do not hesitate to ask.",
        "options": [
          "Should",
          "Had",
          "Were",
          "Did"
        ],
        "answer": "Should",
        "rationale": "Inverted first conditional ('Should you need') replaces 'If you should need'.",
        "rationaleMm": "'If you need' အစား တရားဝင်စာရေးသားရာတွင် 'Should you need' ဟု Inversion သုံးပါသည်။"
      },
      {
        "id": "b3_17",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Phrasal Verbs",
        "question": "The scientific panel decided to _______ out further clinical trials on the vaccine.",
        "options": [
          "carry",
          "bring",
          "take",
          "run"
        ],
        "answer": "carry",
        "rationale": "'Carry out' is the standard academic phrasal verb meaning to conduct or perform an experiment.",
        "rationaleMm": "စမ်းသပ်မှုများ ပြုလုပ်ဆောင်ရွက်ခြင်းကို 'carry out trials' ဟု သုံးနှုန်းပါသည်။"
      },
      {
        "id": "b3_18",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Collocations",
        "question": "Before formulating your thesis, you must take previous scholarship into _______.",
        "options": [
          "account",
          "mind",
          "regard",
          "view"
        ],
        "answer": "account",
        "rationale": "'Take something into account' is an academic collocation meaning to consider or factor in.",
        "rationaleMm": "ထည့်သွင်းစဉ်းစားခြင်းကို 'take into account' သို့မဟုတ် 'take into consideration' ဟု သုံးပါသည်။"
      },
      {
        "id": "b3_19",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Clauses of Purpose",
        "question": "She organized her research notes meticulously in _______ not to misplace any citations.",
        "options": [
          "order",
          "case",
          "so",
          "view"
        ],
        "answer": "order",
        "rationale": "'In order not to' expresses negative purpose, followed by a base infinitive.",
        "rationaleMm": "မဖြစ်စေရန် ရည်ရွယ်ချက်ကို 'in order not to + verb' ဖြင့် ဖော်ပြပါသည်။"
      },
      {
        "id": "b3_20",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Passive Constructions",
        "question": "The ancient architectural manuscript is believed _______ destroyed during the fire.",
        "options": [
          "to have been",
          "to be",
          "having been",
          "being"
        ],
        "answer": "to have been",
        "rationale": "Perfect passive infinitive ('to have been destroyed') refers to an event prior to present belief.",
        "rationaleMm": "အတိတ်က ဖျက်ဆီးခံခဲ့ရမှုကို ယခုယုံကြည်သဖြင့် Perfect Passive Infinitive (to have been destroyed) ကို သုံးပါသည်။"
      },
      {
        "id": "b3_21",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Concessive Adverbs",
        "question": "The initial cost was high; _______, the long-term energy savings proved substantial.",
        "options": [
          "nevertheless",
          "furthermore",
          "otherwise",
          "similarly"
        ],
        "answer": "nevertheless",
        "rationale": "'Nevertheless' links a concession to an overarching contrasting benefit.",
        "rationaleMm": "ဆန့်ကျင်ဘက် အကျိုးရလဒ်ကို ဆက်စပ်ဖော်ပြရာတွင် 'nevertheless' ကို သုံးပါသည်။"
      },
      {
        "id": "b3_22",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Prepositional Collocations",
        "question": "The new environmental legislation will come _______ effect starting on January 1st.",
        "options": [
          "into",
          "to",
          "in",
          "on"
        ],
        "answer": "into",
        "rationale": "'Come into effect' is the fixed collocation meaning to become legally operational.",
        "rationaleMm": "ဥပဒေ စတင်အာဏာတည်ခြင်းကို 'come into effect' ဟု သုံးပါသည်။"
      },
      {
        "id": "b3_23",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Hypothetical Conditionals",
        "question": "Had they acted more decisively, the financial losses _______ averted.",
        "options": [
          "could have been",
          "can be",
          "would be",
          "will have been"
        ],
        "answer": "could have been",
        "rationale": "Third conditional inverted apodosis requiring modal + have been + past participle.",
        "rationaleMm": "Third Conditional ၏ အကျိုးရလဒ်တွင် 'could have been + V3' (ရှောင်လွှဲနိုင်ခဲ့ပေလိမ့်မည်) ကို သုံးပါသည်။"
      },
      {
        "id": "b3_24",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Word Formation",
        "question": "The discovery of antibiotics marked a _______ breakthrough in medical science.",
        "options": [
          "revolutionary",
          "revolution",
          "revolutionize",
          "revolutionist"
        ],
        "answer": "revolutionary",
        "rationale": "The adjective 'revolutionary' modifies the noun 'breakthrough'.",
        "rationaleMm": "နာမ် 'breakthrough' (အောင်မြင်မှု) ကို modify လုပ်ရန် Adjective 'revolutionary' လိုအပ်ပါသည်။"
      },
      {
        "id": "b3_25",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Collocations",
        "question": "He made a remarkable _______ to the university's renewable energy research group.",
        "options": [
          "contribution",
          "donation",
          "dedication",
          "distribution"
        ],
        "answer": "contribution",
        "rationale": "'Make a contribution to' is the standard academic collocation for adding value to a team or field.",
        "rationaleMm": "ပညာရပ်ဆိုင်ရာ ပါဝင်ကူညီဖြည့်ဆည်းမှုကို 'make a contribution to' ဟု သုံးပါသည်။"
      },
      {
        "id": "b3_26",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Advanced Inversion",
        "question": "Not only _______ the mathematical proof, but she also demonstrated its practical application.",
        "options": [
          "did she publish",
          "she published",
          "published she",
          "she did publish"
        ],
        "answer": "did she publish",
        "rationale": "Correlative negative marker 'Not only' at clause head mandates subject-auxiliary inversion.",
        "rationaleMm": "'Not only' ဝါကျအစတွင်ပါက Inversion (did she publish) ပြုလုပ်ရပါမည်။"
      },
      {
        "id": "b3_27",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Mandative Subjunctive",
        "question": "The ethics board insisted that the lead investigator _______ all raw experimental datasets.",
        "options": [
          "preserve",
          "preserves",
          "preserved",
          "must preserve"
        ],
        "answer": "preserve",
        "rationale": "Mandative subjunctive after 'insist that' requires bare infinitive ('preserve').",
        "rationaleMm": "'Insist that' နောက်တွင် Subjunctive Base Form (preserve) လိုက်ရပါသည်။"
      },
      {
        "id": "b3_28",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Advanced Inversion",
        "question": "Hardly _______ down to draft the summary when the emergency power outage occurred.",
        "options": [
          "had I sat",
          "did I sit",
          "I had sat",
          "I sat"
        ],
        "answer": "had I sat",
        "rationale": "'Hardly had [subject] [V3] when...' is the canonical temporal correlative inversion.",
        "rationaleMm": "'Hardly had I sat... when' သည် ရုတ်တရက် ဆက်တိုက်ဖြစ်ပျက်မှုပြ Inversion ဖွဲ့စည်းပုံဖြစ်ပါသည်။"
      },
      {
        "id": "b3_29",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Hedging Language",
        "question": "The findings suggest that the hypothesis is _______ accurate, albeit with minor caveats.",
        "options": [
          "substantially",
          "substance",
          "substantial",
          "substantiate"
        ],
        "answer": "substantially",
        "rationale": "'Substantially' functions as an academic hedge meaning 'for the most part' or 'largely'.",
        "rationaleMm": "'Substantially accurate' ဆိုသည်မှာ အဓိကအားဖြင့် တိကျမှန်ကန်ကြောင်း အဆင့်မြင့် အထောက်အထားပြစကားလုံးဖြစ်ပါသည်။"
      },
      {
        "id": "b3_30",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Cleft Sentences",
        "question": "What surprised the peer reviewers _______ the unprecedented elegance of the statistical model.",
        "options": [
          "was",
          "were",
          "is",
          "being"
        ],
        "answer": "was",
        "rationale": "Wh-cleft clause functioning as a singular subject takes the singular verb 'was'.",
        "rationaleMm": "Wh-cleft clause တစ်ခုလုံးသည် Singular Subject သဘောဆောင်သဖြင့် 'was' လိုက်ရပါသည်။"
      },
      {
        "id": "b3_31",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Collocations",
        "question": "The prolonged drought wreaked _______ upon rural agrarian livelihoods across the basin.",
        "options": [
          "havoc",
          "damage",
          "harm",
          "ruin"
        ],
        "answer": "havoc",
        "rationale": "'Wreak havoc on/upon' is an advanced Band 8.5 collocation meaning to inflict widespread destruction.",
        "rationaleMm": "ဆိုးရွားသော ပျက်စီးဆုံးရှုံးမှု ဖြစ်စေခြင်းကို 'wreak havoc upon' ဟု အဆင့်မြင့်စွာ သုံးပါသည်။"
      },
      {
        "id": "b3_32",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Formal Prepositions",
        "question": "_______ to popular belief, autonomous electric vehicles generate localized particulate emissions from tires.",
        "options": [
          "Contrary",
          "Opposite",
          "Contrasting",
          "Unlike"
        ],
        "answer": "Contrary",
        "rationale": "'Contrary to popular belief' is the established academic collocation.",
        "rationaleMm": "လူအများ၏ အထင်နှင့် ဆန့်ကျင်လျက်ဟု ဆိုလိုရာတွင် 'contrary to popular belief' ဟု သုံးပါသည်။"
      },
      {
        "id": "b3_33",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Fronted Participles",
        "question": "_______ by the adverse feedback, the author revised the manuscript from scratch.",
        "options": [
          "Undaunted",
          "Dismayed",
          "Dismaying",
          "To dismay"
        ],
        "answer": "Undaunted",
        "rationale": "'Undaunted' means not discouraged by difficulty, perfectly contextualizing perseverance.",
        "rationaleMm": "'Undaunted' ဆိုသည်မှာ အခက်အခဲ သို့မဟုတ် ဝေဖန်မှုများကို မမှုဘဲ သတ္တိရှိရှိ ဆက်လက်ဆောင်ရွက်ခြင်းဖြစ်ပါသည်။"
      },
      {
        "id": "b3_34",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Academic Register",
        "question": "The newly elected governor pledged to _______ transparency across state procurement agencies.",
        "options": [
          "foster",
          "fertilize",
          "found",
          "favor"
        ],
        "answer": "foster",
        "rationale": "'Foster' means to encourage or promote the development of an institutional value.",
        "rationaleMm": "ပွင့်လင်းမြင်သာမှုကဲ့သို့သော ကောင်းမွန်သောအလေ့အထကို ပြုစုပျိုးထောင်ခြင်းကို 'foster' ဟု သုံးပါသည်။"
      },
      {
        "id": "b3_35",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Connectors",
        "question": "The budget deficit expanded rapidly; _______, social service spending was slashed.",
        "options": [
          "consequently",
          "nevertheless",
          "conversely",
          "meanwhile"
        ],
        "answer": "consequently",
        "rationale": "'Consequently' expresses a direct cause-and-effect logical deduction.",
        "rationaleMm": "အကြောင်းရင်းတစ်ခုကြောင့် တိုက်ရိုက်ဖြစ်ပေါ်လာသော အကျိုးဆက်ကို 'consequently' (ရလဒ်အနေဖြင့်) ဟု သုံးပါသည်။"
      },
      {
        "id": "b3_36",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Negative Adverbials",
        "question": "On no account _______ financial credentials be logged into public workstation browsers.",
        "options": [
          "must",
          "financial credentials must",
          "should not",
          "must not"
        ],
        "answer": "must",
        "rationale": "Negative fronted adverbial 'On no account' triggers inversion and carries inherent negative polarity.",
        "rationaleMm": "'On no account' တွင် အငြင်းသဘောပါပြီးဖြစ်သဖြင့် Inversion (must + subject + be) ပြုလုပ်ရပါသည်။"
      },
      {
        "id": "b3_37",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Dependent Prepositions",
        "question": "The archaeological team stumbled upon artifacts dating _______ to the third century BCE.",
        "options": [
          "back",
          "from",
          "at",
          "to"
        ],
        "answer": "back",
        "rationale": "'Date back to' is the fixed idiomatic phrasal collocation for historical origins.",
        "rationaleMm": "အတိတ်သမိုင်းကြောင်းသို့ ပြန်လည်ခြေရာကောက်ရာတွင် 'date back to' ဟု သုံးပါသည်။"
      },
      {
        "id": "b3_38",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Advanced Collocations",
        "question": "The university's legal department stepped in to _______ light on the ambiguous patent ownership.",
        "options": [
          "shed",
          "throw",
          "shine",
          "spark"
        ],
        "answer": "shed",
        "rationale": "'Shed light on' is an idiomatic collocation meaning to clarify or reveal explanatory information.",
        "rationaleMm": "မရှင်းလင်းသော အရာတစ်ခုကို အလင်းပြရှင်းလင်းစေခြင်းကို 'shed light on' ဟု တွဲဖက်သုံးပါသည်။"
      },
      {
        "id": "b3_39",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Gerund Prepositions",
        "question": "She has dedicated her entire academic career _______ researching neurodegenerative disease models.",
        "options": [
          "to",
          "in",
          "for",
          "with"
        ],
        "answer": "to",
        "rationale": "'Dedicate oneself / career to + -ing' requires 'to' as a preposition followed by a gerund.",
        "rationaleMm": "'Dedicate... to' တွင် 'to' သည် preposition ဖြစ်၍ နောက်တွင် gerund (-ing) လိုက်ရပါသည်။"
      },
      {
        "id": "b3_40",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Subjunctive Adjectives",
        "question": "It is vital that the quarantine perimeter _______ maintained without compromise.",
        "options": [
          "be",
          "is",
          "was",
          "will be"
        ],
        "answer": "be",
        "rationale": "'It is vital that [clause]' governs mandative subjunctive base form 'be'.",
        "rationaleMm": "'It is vital that...' နောက်တွင် Base Form ဖြစ်သော Subjunctive 'be' ကို သုံးရပါမည်။"
      },
      {
        "id": "b3_41",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "High-Level Idioms",
        "question": "He has a photographic memory; he can recite Shakespearean sonnets at the _______ of a hat.",
        "options": [
          "drop",
          "turn",
          "tip",
          "shake"
        ],
        "answer": "drop",
        "rationale": "'At the drop of a hat' is an idiom meaning instantly, without hesitation or delay.",
        "rationaleMm": "'At the drop of a hat' ဆိုသည်မှာ ချက်ချင်းလက်ငင်း၊ တွန့်ဆုတ်မနေဘဲ လုပ်ဆောင်ခြင်းကို ဆိုလိုပါသည်။"
      },
      {
        "id": "b3_42",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Nuanced Adjectives",
        "question": "The senator's claims were completely _______ of any empirical factual foundation.",
        "options": [
          "devoid",
          "deprived",
          "destitute",
          "derelict"
        ],
        "answer": "devoid",
        "rationale": "'Devoid of' is a literary C2 collocation meaning entirely lacking or empty of something.",
        "rationaleMm": "'Devoid of' ဆိုသည်မှာ အထောက်အထား လုံးဝကင်းမဲ့နေခြင်း (entirely lacking) ကို ညွှန်းဆိုပါသည်။"
      },
      {
        "id": "b3_43",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Inversion with Correlatives",
        "question": "Only when the archive was declassified _______ the full magnitude of the covert operation.",
        "options": [
          "did scholars discern",
          "scholars discerned",
          "had scholars discerned",
          "scholars did discern"
        ],
        "answer": "did scholars discern",
        "rationale": "'Only when [clause]' triggers subject-auxiliary inversion in the main clause.",
        "rationaleMm": "'Only when' ဝါကျအစတွင်ပါရှိပါက ပင်မဝါကျတွင် Inversion (did scholars discern) ဖြစ်ပေါ်ရပါမည်။"
      },
      {
        "id": "b3_44",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Sophisticated Lexis",
        "question": "The speaker's argument was so _______ that even seasoned dialecticians struggled to rebut it.",
        "options": [
          "cogent",
          "congenial",
          "cognitive",
          "congruous"
        ],
        "answer": "cogent",
        "rationale": "'Cogent' means clear, logical, and compellingly convincing.",
        "rationaleMm": "'Cogent' ဆိုသည်မှာ အငြင်းပွားဖွယ်မရှိအောင် ခိုင်လုံပြတ်သားပြီး ဆွဲဆောင်မှုရှိသော အဆိုပြုချက်ဖြစ်ပါသည်။"
      },
      {
        "id": "b3_45",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Nuanced Verbs",
        "question": "The prolonged institutional stalemate served only to _______ underlying sectarian animosities.",
        "options": [
          "exacerbate",
          "exaggerate",
          "exasperate",
          "exonerate"
        ],
        "answer": "exacerbate",
        "rationale": "'Exacerbate' means to make a bad situation, problem, or negative feeling significantly worse.",
        "rationaleMm": "ပြဿနာ သို့မဟုတ် မုန်းတီးမှုကို ပိုမိုဆိုးရွားပြင်းထန်လာစေခြင်းကို 'exacerbate' ဟု သုံးပါသည်။"
      },
      {
        "id": "b3_46",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Rare Literary Vocabulary",
        "question": "The critic described the film's dialogue as bloated, pretentious, and _______ with clichés.",
        "options": [
          "rife",
          "rampant",
          "rich",
          "raw"
        ],
        "answer": "rife",
        "rationale": "'Rife with' is a C2 collocation meaning abundantly filled with something undesirable or harmful.",
        "rationaleMm": "'Rife with' သည် မနှစ်မြို့ဖွယ် အရာများဖြင့် ပြည့်လျှံနေခြင်းကို ဖော်ပြသော C2 အဆင့် စကားလုံးဖြစ်ပါသည်။"
      },
      {
        "id": "b3_47",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Hypothetical Inversion",
        "question": "Had it _______ for the emergency fiscal injection, the monetary union would have dissolved.",
        "options": [
          "not been",
          "not had",
          "been not",
          "not were"
        ],
        "answer": "not been",
        "rationale": "'Had it not been for [noun]' is the inverted third conditional counterfactual structure.",
        "rationaleMm": "'If it had not been for' အစား 'Had it not been for' ဖြင့် အဆင့်မြင့် Third Conditional Inversion တည်ဆောက်ပါသည်။"
      },
      {
        "id": "b3_48",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Advanced Legal Register",
        "question": "The disputed maritime claims fall squarely within the _______ of the International Court of Justice.",
        "options": [
          "jurisdiction",
          "judicature",
          "jurisprudence",
          "justification"
        ],
        "answer": "jurisdiction",
        "rationale": "'Jurisdiction' denotes official power to make legal decisions and judgments over an area.",
        "rationaleMm": "တရားစီရင်ပိုင်ခွင့် အာဏာနယ်ပယ်ကို 'jurisdiction' ဟု တိကျစွာ ခေါ်ဆိုပါသည်။"
      },
      {
        "id": "b3_49",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Fixed Metaphors",
        "question": "The prime minister found herself on the _______ of a dilemma regarding fiscal austerity.",
        "options": [
          "horns",
          "arms",
          "wings",
          "points"
        ],
        "answer": "horns",
        "rationale": "'On the horns of a dilemma' is a classic C2 idiom meaning faced with two equally unpleasant choices.",
        "rationaleMm": "'On the horns of a dilemma' ဆိုသည်မှာ မနှစ်သက်ဖွယ် ရွေးချယ်စရာ နှစ်ခုကြား ဗျာများနေခြင်းကို ဆိုလိုပါသည်။"
      },
      {
        "id": "b3_50",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Prepositional Nuance",
        "question": "In _______ to the senior professor's wishes, the symposium was relocated to the ceremonial hall.",
        "options": [
          "deference",
          "difference",
          "deferral",
          "defiance"
        ],
        "answer": "deference",
        "rationale": "'In deference to' is a formal C2 idiom meaning out of polite respect for someone's wishes.",
        "rationaleMm": "'In deference to' ဆိုသည်မှာ တစ်ဦးတစ်ယောက်၏ ဆန္ဒကို ရိုသေလေးစားသမှုဖြင့် လိုက်လျောခြင်းဖြစ်ပါသည်။"
      }
    ]
  },
  {
    "id": "batch_4",
    "name": "Diagnostic Form Delta (Subjunctive & Syntactic Precision)",
    "questions": [
      {
        "id": "b4_01",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Prepositional Collocations",
        "question": "He was accused of cheating, but he insists he is completely innocent _______ the charges.",
        "options": [
          "of",
          "from",
          "with",
          "about"
        ],
        "answer": "of",
        "rationale": "'Innocent' collocates with 'of' ('innocent of the crime').",
        "rationaleMm": "'Innocent' သည် 'of' နှင့် တွဲဖက်ရပါသည် (innocent of)."
      },
      {
        "id": "b4_02",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Irregular Plurals",
        "question": "Several wild _______ were grazing peacefully in the alpine meadow.",
        "options": [
          "deer",
          "deers",
          "deeres",
          "dear"
        ],
        "answer": "deer",
        "rationale": "'Deer' is an irregular noun whose plural form remains identical to its singular form.",
        "rationaleMm": "'Deer' (သမင်) ၏ အများကိန်းပုံစံမှာလည်း 'deer' ပင် ဖြစ်ပြီး 's' ပေါင်းစရာမလိုပါ။"
      },
      {
        "id": "b4_03",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Conjunctions",
        "question": "You can borrow my reference textbook _______ you promise to return it by Friday.",
        "options": [
          "as long as",
          "unless",
          "in case of",
          "although"
        ],
        "answer": "as long as",
        "rationale": "'As long as' means 'provided that' or 'on condition that'.",
        "rationaleMm": "'အကယ်၍ ထိုသို့လုပ်ပေးမည်ဆိုပါက' ဟူသော သတ်မှတ်ချက်ကို 'as long as' ဖြင့် ဖော်ပြပါသည်။"
      },
      {
        "id": "b4_04",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Modals of Ability",
        "question": "After three months of diligent practice, she was able _______ the complex computer program.",
        "options": [
          "to master",
          "mastering",
          "master",
          "mastered"
        ],
        "answer": "to master",
        "rationale": "'Be able to' requires a to-infinitive to express capability in a specific instance.",
        "rationaleMm": "'Be able to' ၏နောက်တွင် to-infinitive (to master) လိုက်ရပါသည်။"
      },
      {
        "id": "b4_05",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Past Habits",
        "question": "When we were children, my father _______ read us bedtime stories every evening.",
        "options": [
          "would",
          "used",
          "is used to",
          "had"
        ],
        "answer": "would",
        "rationale": "'Would' can express recurring characteristic past habitual actions.",
        "rationaleMm": "အတိတ်က ထပ်ခါတလဲလဲ ပြုလုပ်ခဲ့သော အလေ့အထကို 'would' ဖြင့်လည်း ဖော်ပြနိုင်ပါသည်။"
      },
      {
        "id": "b4_06",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Gerund vs Infinitive",
        "question": "He avoided _______ direct eye contact with the university disciplinary board.",
        "options": [
          "making",
          "to make",
          "make",
          "made"
        ],
        "answer": "making",
        "rationale": "The verb 'avoid' is followed strictly by a gerund (-ing).",
        "rationaleMm": "'Avoid' ကြိယာနောက်တွင် gerund (making) သာ လိုက်ရပါမည်။"
      },
      {
        "id": "b4_07",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Question Tags",
        "question": "You haven't submitted your final research abstract yet, _______?",
        "options": [
          "have you",
          "haven't you",
          "did you",
          "do you"
        ],
        "answer": "have you",
        "rationale": "A negative statement ('haven't submitted') takes a positive question tag ('have you').",
        "rationaleMm": "အငြင်းဝါကျတွင် အတည် Question Tag (have you) တွဲဖက်ရပါမည်။"
      },
      {
        "id": "b4_08",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Time Prepositions",
        "question": "The orientation seminar will commence _______ 09:00 on Monday morning.",
        "options": [
          "at",
          "in",
          "on",
          "by"
        ],
        "answer": "at",
        "rationale": "The preposition 'at' is used with specific clock times ('at 09:00').",
        "rationaleMm": "တိကျသော နာရီအချိန်များအတွက် 'at' ကို အသုံးပြုရပါသည်။"
      },
      {
        "id": "b4_09",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Causative Verbs",
        "question": "The strict professor made the undergraduate _______ the flawed essay twice.",
        "options": [
          "rewrite",
          "to rewrite",
          "rewriting",
          "rewritten"
        ],
        "answer": "rewrite",
        "rationale": "The active causative verb 'make' takes a bare infinitive without 'to' ('made him rewrite').",
        "rationaleMm": "Active causative 'make' နောက်တွင် 'to' မပါသော Bare Infinitive (rewrite) လိုက်ရပါသည်။"
      },
      {
        "id": "b4_10",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Collocations",
        "question": "The students _______ a big mistake by ignoring the examiner's word count limit.",
        "options": [
          "made",
          "did",
          "took",
          "had"
        ],
        "answer": "made",
        "rationale": "'Make a mistake' is the standard English collocation, never 'do a mistake'.",
        "rationaleMm": "အမှားတစ်ခု ပြုလုပ်မိခြင်းကို 'make a mistake' ဟု သုံးနှုန်းပါသည်။"
      },
      {
        "id": "b4_11",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Subjunctive / Preference",
        "question": "I would prefer to study in silence rather than _______ to noisy music.",
        "options": [
          "listen",
          "listening",
          "to listen",
          "listened"
        ],
        "answer": "listen",
        "rationale": "'Would prefer to [do X] rather than [do Y]' requires parallel bare infinitive after 'rather than'.",
        "rationaleMm": "'Rather than' ၏နောက်တွင် ညီမျှသော Bare Infinitive (listen) လိုက်ရပါသည်။"
      },
      {
        "id": "b4_12",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Modal Deduction",
        "question": "Given his outstanding academic credentials, he _______ be offered the fellowship.",
        "options": [
          "is bound to",
          "is bound",
          "bound to",
          "bound for"
        ],
        "answer": "is bound to",
        "rationale": "'Be bound to + verb' means certain or extremely likely to happen.",
        "rationaleMm": "'Be bound to' သည် သေချာပေါက် ဖြစ်လာလိမ့်မည် (certain to happen) ဟု ဆိုလိုပါသည်။"
      },
      {
        "id": "b4_13",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Relative Clauses",
        "question": "The research grants, none of _______ exceeded $10,000, were funded by alumni.",
        "options": [
          "which",
          "whom",
          "that",
          "whose"
        ],
        "answer": "which",
        "rationale": "Quantifier + of + 'which' is used for inanimate objects in non-defining relative clauses.",
        "rationaleMm": "အရာဝတ္ထုများကို ညွှန်းဆိုသော Quantifier structure တွင် 'none of which' ကို သုံးရပါသည်။"
      },
      {
        "id": "b4_14",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Prepositional Phrases",
        "question": "The university expanded its online offerings _______ response to surging student demand.",
        "options": [
          "in",
          "with",
          "on",
          "by"
        ],
        "answer": "in",
        "rationale": "'In response to' is the fixed prepositional phrase meaning reacting to something.",
        "rationaleMm": "တုံ့ပြန်မှုအနေဖြင့် ဟု ဆိုလိုရာတွင် 'in response to' ဟု သုံးပါသည်။"
      },
      {
        "id": "b4_15",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Gerund Prepositions",
        "question": "She succeeded _______ passing all four IELTS sub-tests on her maiden attempt.",
        "options": [
          "in",
          "at",
          "on",
          "for"
        ],
        "answer": "in",
        "rationale": "'Succeed in + gerund' is the required grammatical pattern.",
        "rationaleMm": "'Succeed' သည် 'in' နှင့် တွဲဖက်ရပါသည် (succeed in passing)."
      },
      {
        "id": "b4_16",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Conditionals",
        "question": "If you _______ to see Hugo in the library, could you ask him to call me?",
        "options": [
          "happen",
          "happened",
          "would happen",
          "are happening"
        ],
        "answer": "happen",
        "rationale": "'If you happen to [verb]' expresses chance or accidental occurrence in the present/future.",
        "rationaleMm": "'မတော်တဆ တွေ့ရှိခဲ့ပါက' ဟူသော အခွင့်အလမ်းပြ 'If you happen to see' ဖြစ်ပါသည်။"
      },
      {
        "id": "b4_17",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Phrasal Verbs",
        "question": "The company had to _______ down on unnecessary operational expenditure.",
        "options": [
          "cut",
          "take",
          "break",
          "put"
        ],
        "answer": "cut",
        "rationale": "'Cut down on' is a three-part phrasal verb meaning to reduce the amount or consumption of.",
        "rationaleMm": "အသုံးစရိတ် လျှော့ချခြင်းကို 'cut down on' ဟု သုံးနှုန်းပါသည်။"
      },
      {
        "id": "b4_18",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Collocations",
        "question": "The research team took great _______ to verify the authenticity of each primary source.",
        "options": [
          "pains",
          "efforts",
          "cares",
          "troubles"
        ],
        "answer": "pains",
        "rationale": "'Take great pains to do something' is an idiom meaning to make exceptional, thorough effort.",
        "rationaleMm": "အထူးတလည် စေ့စပ်သေချာစွာ ကြိုးပမ်းခြင်းကို 'take great pains to' ဟု သုံးပါသည်။"
      },
      {
        "id": "b4_19",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Passive Infinitive",
        "question": "The disputed archaeological artifacts are said _______ exported illegally in the 1920s.",
        "options": [
          "to have been",
          "to be",
          "having been",
          "being"
        ],
        "answer": "to have been",
        "rationale": "Perfect passive infinitive ('to have been exported') matches an event prior to the reporting verb.",
        "rationaleMm": "အတိတ်က တရားမဝင် တင်ပို့ခံခဲ့ရမှုကို ယခုပြောဆိုရာတွင် 'to have been exported' ကို သုံးပါသည်။"
      },
      {
        "id": "b4_20",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Conjunctions of Contrast",
        "question": "_______ the weather forecast predicted rain, the afternoon remained entirely dry.",
        "options": [
          "Although",
          "Despite",
          "In spite of",
          "However"
        ],
        "answer": "Although",
        "rationale": "'Although' is a subordinating conjunction followed by a full subject-verb clause.",
        "rationaleMm": "'Although' နောက်တွင် Subject + Verb ဝါကျအပြည့်အစုံ လိုက်ပါရပါသည်။"
      },
      {
        "id": "b4_21",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Dependent Prepositions",
        "question": "She is deeply committed _______ promoting universal digital literacy in rural schools.",
        "options": [
          "to",
          "in",
          "for",
          "with"
        ],
        "answer": "to",
        "rationale": "'Committed to + gerund' requires the preposition 'to'.",
        "rationaleMm": "'Committed to' တွင် 'to' သည် preposition ဖြစ်၍ နောက်တွင် gerund (promoting) လိုက်ရပါသည်။"
      },
      {
        "id": "b4_22",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Word Formation",
        "question": "His complete _______ to adhere to lab safety protocols resulted in immediate suspension.",
        "options": [
          "failure",
          "failing",
          "fail",
          "failed"
        ],
        "answer": "failure",
        "rationale": "The noun 'failure' follows the possessive determiner 'His' and adjective 'complete'.",
        "rationaleMm": "နာမ် (noun) ပုံစံ 'failure' (ပျက်ကွက်မှု) ကို သုံးရပါမည်။"
      },
      {
        "id": "b4_23",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Prepositional Phrases",
        "question": "_______ terms of lexical resource, this essay demonstrates sophisticated band 8.5 vocabulary.",
        "options": [
          "In",
          "On",
          "At",
          "With"
        ],
        "answer": "In",
        "rationale": "'In terms of' is the standard transition phrase meaning regarding or concerning.",
        "rationaleMm": "ရှုထောင့်တစ်ခုခုအရ ဟု ဖော်ပြရာတွင် 'in terms of' ကို သုံးပါသည်။"
      },
      {
        "id": "b4_24",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Verbs of Perception",
        "question": "We heard the keynote lecturer _______ the significance of ecological sustainability.",
        "options": [
          "emphasize",
          "to emphasize",
          "emphasized",
          "had emphasized"
        ],
        "answer": "emphasize",
        "rationale": "Verbs of perception ('hear someone do something') take a bare infinitive for a completed action.",
        "rationaleMm": "အာရုံခံကြိယာ 'hear someone do something' တွင် Bare Infinitive (emphasize) လိုက်ရပါသည်။"
      },
      {
        "id": "b4_25",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Collocations",
        "question": "The newly elected municipal council intends to _______ steps to alleviate urban congestion.",
        "options": [
          "take",
          "make",
          "do",
          "perform"
        ],
        "answer": "take",
        "rationale": "'Take steps' is the fixed academic/administrative collocation meaning to implement measures.",
        "rationaleMm": "အဆင့်ဆင့် ဆောင်ရွက်ချက်များ ပြုလုပ်ခြင်းကို 'take steps' ဟု သုံးနှုန်းပါသည်။"
      },
      {
        "id": "b4_26",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Subjunctive Mood",
        "question": "The university ethics charter demands that every conflict of interest _______ promptly disclosed.",
        "options": [
          "be",
          "is",
          "was",
          "must be"
        ],
        "answer": "be",
        "rationale": "Mandative subjunctive 'be' follows verbs of requirement like 'demand that'.",
        "rationaleMm": "'Demand that' နောက်တွင် Subjunctive Base Form (be) ကို သုံးရပါမည်။"
      },
      {
        "id": "b4_27",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Negative Inversion",
        "question": "No sooner _______ the research grant approved than the university froze hiring.",
        "options": [
          "was",
          "had been",
          "did",
          "would be"
        ],
        "answer": "was",
        "rationale": "Passive inversion: 'No sooner was [subject] [past participle] than [clause]'.",
        "rationaleMm": "'No sooner was the grant approved than...' သည် Passive Inversion ပုံစံဖြစ်ပါသည်။"
      },
      {
        "id": "b4_28",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Sophisticated Hedging",
        "question": "The empirical data indicates that urban density is _______ correlated with energy efficiency.",
        "options": [
          "positively",
          "positive",
          "positiveness",
          "positivity"
        ],
        "answer": "positively",
        "rationale": "The adverb 'positively' modifies the participial adjective 'correlated'.",
        "rationaleMm": "'Correlated' ကို modify လုပ်ရန် Adverb 'positively' (အပြုသဘော အချိုးကျ ဆက်စပ်မှု) ကို သုံးပါသည်။"
      },
      {
        "id": "b4_29",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Inverted Conditionals",
        "question": "_______ it not been for her vigilant supervision, the clinical anomaly would have gone unnoticed.",
        "options": [
          "Had",
          "Were",
          "Did",
          "Should"
        ],
        "answer": "Had",
        "rationale": "Third conditional inverted counterfactual: 'Had it not been for...'.",
        "rationaleMm": "'Had it not been for' သည် 'သူမ၏ ကြီးကြပ်မှုသာ မရှိခဲ့လျှင်' ဟူသော Third Conditional Inversion ဖြစ်ပါသည်။"
      },
      {
        "id": "b4_30",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Advanced Transitions",
        "question": "The preliminary simulation succeeded; _______, field testing yielded contradictory anomalies.",
        "options": [
          "nonetheless",
          "furthermore",
          "consequently",
          "namely"
        ],
        "answer": "nonetheless",
        "rationale": "'Nonetheless' functions as an adversative transitional adverb marking contrast.",
        "rationaleMm": "'Nonetheless' (သို့တိုင်အောင်) သည် ဆန့်ကျင်ဘက် အခြေအနေကို ဖော်ပြသော C1 စကားလုံးဖြစ်ပါသည်။"
      },
      {
        "id": "b4_31",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Academic Collocations",
        "question": "The unexpected tariff hike dealt a heavy _______ to domestic manufacturing exporters.",
        "options": [
          "blow",
          "hit",
          "strike",
          "knock"
        ],
        "answer": "blow",
        "rationale": "'Deal a heavy blow to' is a Band 8.0 academic idiom meaning to severely harm or damage.",
        "rationaleMm": "ပြင်းထန်သော ထိုးနှက်ချက် သို့မဟုတ် ထိခိုက်မှုဖြစ်စေခြင်းကို 'deal a heavy blow to' ဟု သုံးပါသည်။"
      },
      {
        "id": "b4_32",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Prepositional Inversion",
        "question": "In no way _______ this provisional report be regarded as an official institutional audit.",
        "options": [
          "can",
          "this report can",
          "can not",
          "could not"
        ],
        "answer": "can",
        "rationale": "Negative prepositional phrase 'In no way' fronted forces modal auxiliary inversion.",
        "rationaleMm": "'In no way' (လုံးဝမဖြစ်နိုင်) ရှေ့ရောက်ပါက Inversion (can + subject + be) ဖြစ်ရပါမည်။"
      },
      {
        "id": "b4_33",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Advanced Vocabulary",
        "question": "The economic sanctions effectively _______ the rogue regime's access to international credit.",
        "options": [
          "curtailed",
          "curtained",
          "curved",
          "cured"
        ],
        "answer": "curtailed",
        "rationale": "'Curtail' means to reduce in extent or quantity, or impose a restriction upon.",
        "rationaleMm": "အခွင့်အရေး သို့မဟုတ် လက်လှမ်းမီမှုကို ကန့်သတ်လျှော့ချခြင်းကို 'curtail' ဟု သုံးပါသည်။"
      },
      {
        "id": "b4_34",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Cleft Sentences",
        "question": "It was precisely her methodological rigor _______ persuaded the review board to endorse the grant.",
        "options": [
          "that",
          "which",
          "whom",
          "what"
        ],
        "answer": "that",
        "rationale": "In an it-cleft sentence focusing on an abstract quality, 'that' is the standard relative particle.",
        "rationaleMm": "အလေးပေး Cleft ဝါကျတွင် အရာဝတ္ထု သို့မဟုတ် အရည်အချင်းအတွက် 'that' ကို သုံးပါသည်။"
      },
      {
        "id": "b4_35",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Participle Clauses",
        "question": "_______ with sufficient experimental evidence, the team published their findings in Nature.",
        "options": [
          "Armed",
          "Arming",
          "To arm",
          "Having armed"
        ],
        "answer": "Armed",
        "rationale": "Past participle 'Armed with' means equipped with necessary knowledge or tools.",
        "rationaleMm": "'Armed with evidence' (ခိုင်လုံသော အထောက်အထားများ ပြည့်စုံစွာ တပ်ဆင်လျက်) ဟူသော Participle Clause ဖြစ်ပါသည်။"
      },
      {
        "id": "b4_36",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Academic Register",
        "question": "The minister's remarks were deliberately phrased so as to _______ accountability.",
        "options": [
          "evade",
          "invade",
          "pervade",
          "fade"
        ],
        "answer": "evade",
        "rationale": "'Evade accountability' is the formal collocation for escaping or dodging responsibility.",
        "rationaleMm": "တာဝန်ယူမှုမှ ရှောင်လွှဲခြင်းကို 'evade accountability' ဟု တရားဝင် သုံးနှုန်းပါသည်။"
      },
      {
        "id": "b4_37",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Correlative Conjunctions",
        "question": "Neither the department head nor the thesis advisors _______ willing to accept the disputed conclusion.",
        "options": [
          "were",
          "was",
          "is",
          "have been"
        ],
        "answer": "were",
        "rationale": "When subjects are joined by 'neither... nor', the verb agrees with the closer subject ('thesis advisors' -> plural 'were').",
        "rationaleMm": "'Neither... nor' တွင် verb နှင့် အနီးဆုံး subject (advisors) အများကိန်းဖြစ်သဖြင့် 'were' လိုက်ရပါသည်။"
      },
      {
        "id": "b4_38",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Collocations",
        "question": "Her groundbreaking dissertation paved the _______ for new therapies in cognitive neuroscience.",
        "options": [
          "way",
          "road",
          "path",
          "track"
        ],
        "answer": "way",
        "rationale": "'Pave the way for' is an idiomatic collocation meaning to create conditions for something to develop.",
        "rationaleMm": "လမ်းစဖောက်ပေးခြင်း သို့မဟုတ် အခွင့်အလမ်း ဖန်တီးပေးခြင်းကို 'pave the way for' ဟု သုံးပါသည်။"
      },
      {
        "id": "b4_39",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Prepositional Nuance",
        "question": "The experimental protocol was adjusted in _______ with the latest clinical safety guidelines.",
        "options": [
          "line",
          "tune",
          "sync",
          "side"
        ],
        "answer": "line",
        "rationale": "'In line with' is an academic collocation meaning conforming to or aligned with.",
        "rationaleMm": "လမ်းညွှန်ချက်များနှင့် ကိုက်ညီညီညွတ်စွာ ဆောင်ရွက်ခြင်းကို 'in line with' ဟု သုံးပါသည်။"
      },
      {
        "id": "b4_40",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Verbal Collocations",
        "question": "The dean's keynote address _______ widespread praise across international academic circles.",
        "options": [
          "garnered",
          "gathered",
          "grasped",
          "grooved"
        ],
        "answer": "garnered",
        "rationale": "'Garner praise/support' is an advanced academic collocation meaning to collect or earn recognition.",
        "rationaleMm": "ချီးကျူးဂုဏ်ပြုမှုများ ရရှိပိုင်ဆိုင်ခြင်းကို 'garner praise' ဟု သုံးနှုန်းပါသည်။"
      },
      {
        "id": "b4_41",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Archaic / Stylistic Subjunctive",
        "question": "Come what _______, we must uphold the integrity of peer-reviewed empirical publishing.",
        "options": [
          "may",
          "will",
          "can",
          "might"
        ],
        "answer": "may",
        "rationale": "'Come what may' is a fixed C2 idiom meaning no matter what happens or whatever obstacles arise.",
        "rationaleMm": "'Come what may' ဆိုသည်မှာ မည်သို့ပင်ဖြစ်လာပါစေ (no matter what happens) ဟု အဓိပ္ပာယ်ရသော C2 အီဒီယမ်ဖြစ်ပါသည်။"
      },
      {
        "id": "b4_42",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Subtle Nuance",
        "question": "The diplomat's commentary was praised for its remarkable _______ and nuanced circumspection.",
        "options": [
          "perspicacity",
          "perspiration",
          "perseverance",
          "persecution"
        ],
        "answer": "perspicacity",
        "rationale": "'Perspicacity' means the quality of having a ready insight into things; keen shrewdness.",
        "rationaleMm": "'Perspicacity' (ထိုးထွင်းသိမြင်နိုင်စွမ်းနှင့် ပညာသားပါမှု) သည် C2 အဆင့် အမြင့်မားဆုံး ဝေါဟာရဖြစ်ပါသည်။"
      },
      {
        "id": "b4_43",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Sophisticated Lexis",
        "question": "The corporation was accused of using offshore subsidiaries to _______ environmental liability.",
        "options": [
          "circumvent",
          "circumscribe",
          "circumnavigate",
          "circumstance"
        ],
        "answer": "circumvent",
        "rationale": "'Circumvent' means to cleverly find a way around an obstacle, regulation, or law.",
        "rationaleMm": "ဥပဒေ သို့မဟုတ် တာဝန်ယူမှုကို ဥာဏ်ဆင်၍ ရှောင်ကွင်းခြင်းကို 'circumvent' ဟု တိကျစွာ သုံးပါသည်။"
      },
      {
        "id": "b4_44",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Literary Adjectives",
        "question": "The author's prose is _______ with classical mythological allegories and obscure metaphors.",
        "options": [
          "fraught",
          "freighted",
          "fringed",
          "fused"
        ],
        "answer": "fraught",
        "rationale": "'Fraught with' is a C2 literary collocation meaning teeming or heavy with something.",
        "rationaleMm": "'Fraught with' ဆိုသည်မှာ ပြည့်နှက်နေခြင်း သို့မဟုတ် လေးလံစွာ သယ်ဆောင်ထားခြင်းကို ညွှန်းဆိုပါသည်။"
      },
      {
        "id": "b4_45",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Nuanced Verbs",
        "question": "The interim report served merely to _______ existing prejudices rather than enlighten the debate.",
        "options": [
          "entrench",
          "enrich",
          "engulf",
          "enmesh"
        ],
        "answer": "entrench",
        "rationale": "'Entrench' means to establish an attitude, habit, or belief so firmly that change is difficult.",
        "rationaleMm": "အစွဲအလမ်း သို့မဟုတ် အလေ့အထတစ်ခုကို အမြစ်တွယ်ခိုင်မာသွားစေခြင်းကို 'entrench' ဟု သုံးပါသည်။"
      },
      {
        "id": "b4_46",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Inverted Conditionals",
        "question": "Should disaster _______ to strike, the backup cooling systems will engage autonomously.",
        "options": [
          "chance",
          "choose",
          "aim",
          "care"
        ],
        "answer": "chance",
        "rationale": "'Should [subject] chance to [verb]' is a sophisticated literary conditional meaning 'if by chance it strikes'.",
        "rationaleMm": "'Should disaster chance to strike' (မတော်တဆ ကပ်ဘေးကြုံတွေ့လာခဲ့ပါက) သည် C2 အဆင့် Inversion ဖြစ်ပါသည်။"
      },
      {
        "id": "b4_47",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Rare Vocabulary",
        "question": "The executive board found his self-serving excuses utterly _______ and devoid of integrity.",
        "options": [
          "specious",
          "spacious",
          "species",
          "specific"
        ],
        "answer": "specious",
        "rationale": "'Specious' means superficially plausible, but actually wrong or deceitful.",
        "rationaleMm": "'Specious' ဆိုသည်မှာ အပေါ်ယံတွင် မှန်သယောင်ယောင်ရှိသော်လည်း တကယ်တမ်းတွင် မှားယွင်းလှည့်စားထားသော အကြောင်းပြချက်ဖြစ်ပါသည်။"
      },
      {
        "id": "b4_48",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Prepositional Idioms",
        "question": "His reckless unilateral decisions were at complete _______ with long-standing board policies.",
        "options": [
          "variance",
          "variation",
          "variety",
          "variable"
        ],
        "answer": "variance",
        "rationale": "'At variance with' is an advanced formal idiom meaning in total disagreement or inconsistency with.",
        "rationaleMm": "'At variance with' ဆိုသည်မှာ စည်းမျဉ်းများနှင့် လုံးဝဆန့်ကျင်ကွဲလွဲနေခြင်းကို ဖော်ပြသော အီဒီယမ်ဖြစ်ပါသည်။"
      },
      {
        "id": "b4_49",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Rare Literary Vocabulary",
        "question": "The treaty was deemed _______, granting both signatories equal sovereign maritime rights.",
        "options": [
          "equitable",
          "equivocal",
          "equestrian",
          "equivalent"
        ],
        "answer": "equitable",
        "rationale": "'Equitable' means fair, just, and impartial across all stakeholders.",
        "rationaleMm": "'Equitable' သည် နှစ်ဦးနှစ်ဖက် မျှတတိကျသော တရားမျှတမှုကို ရည်ညွှန်းပါသည်။"
      },
      {
        "id": "b4_50",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Idiomatic Expressions",
        "question": "To call his controversial treatise groundbreaking is something of a _______; it mostly rehashes old theories.",
        "options": [
          "misnomer",
          "misfit",
          "misdeed",
          "misstep"
        ],
        "answer": "misnomer",
        "rationale": "'Misnomer' refers to a wrong, inaccurate, or entirely unsuitable name or designation.",
        "rationaleMm": "'Misnomer' ဆိုသည်မှာ မသင့်လျော်သော သို့မဟုတ် အမှားအယွင်းဖြစ်စေသော အမည်တပ်ခေါ်ဝေါ်မှုဖြစ်ပါသည်။"
      }
    ]
  },
  {
    "id": "batch_5",
    "name": "Diagnostic Form Epsilon (Mastery Register & Nuance)",
    "questions": [
      {
        "id": "b5_01",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Prepositions of Place",
        "question": "The university health clinic is located _______ the second floor of the science pavilion.",
        "options": [
          "on",
          "in",
          "at",
          "by"
        ],
        "answer": "on",
        "rationale": "'On' is used for floors of a building ('on the second floor').",
        "rationaleMm": "အဆောက်အအုံတစ်ခု၏ အထပ်များကို ညွှန်းဆိုရာတွင် 'on' (on the second floor) ကို သုံးရပါသည်။"
      },
      {
        "id": "b5_02",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Past Habits",
        "question": "My grandmother _______ knit woolen scarves for all of us during cold winter months.",
        "options": [
          "used to",
          "was used to",
          "is used to",
          "use to"
        ],
        "answer": "used to",
        "rationale": "'Used to + base verb' expresses a past habitual action that no longer happens.",
        "rationaleMm": "အတိတ်က လုပ်လေ့ရှိခဲ့သော အလေ့အထအတွက် 'used to + base verb' ကို သုံးပါသည်။"
      },
      {
        "id": "b5_03",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Adjectives & Adverbs",
        "question": "The newly installed audio system sounds exceptionally _______.",
        "options": [
          "good",
          "well",
          "goodly",
          "best"
        ],
        "answer": "good",
        "rationale": "Linking/sensory verbs like 'sound' take a predicate adjective ('good'), not an adverb ('well').",
        "rationaleMm": "Sensory verb ဖြစ်သော 'sound' နောက်တွင် Adjective 'good' (အသံကောင်းမွန်သည်) လိုက်ရပါသည်။"
      },
      {
        "id": "b5_04",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Prepositions with Adjectives",
        "question": "She is extraordinarily good _______ explaining difficult statistical concepts.",
        "options": [
          "at",
          "in",
          "with",
          "for"
        ],
        "answer": "at",
        "rationale": "'Good at + gerund/noun' is the standard English prepositional pattern.",
        "rationaleMm": "ကျွမ်းကျင်တော်စပ်မှုကို 'good at doing something' ဟု သုံးနှုန်းပါသည်။"
      },
      {
        "id": "b5_05",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Zero Conditional",
        "question": "When pure water reaches 100 degrees Celsius under standard atmospheric pressure, it _______.",
        "options": [
          "boils",
          "will boil",
          "is boiling",
          "boiled"
        ],
        "answer": "boils",
        "rationale": "Zero conditional expresses universal scientific facts using present simple in both clauses.",
        "rationaleMm": "သဘာဝသိပ္ပံဆိုင်ရာ အမှန်တရားများအတွက် Zero Conditional (Present Simple - boils) ကို သုံးပါသည်။"
      },
      {
        "id": "b5_06",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Relative Clauses",
        "question": "The international student _______ father is an ambassador received an academic medal.",
        "options": [
          "whose",
          "who",
          "whom",
          "that"
        ],
        "answer": "whose",
        "rationale": "'Whose' indicates possession ('whose father').",
        "rationaleMm": "ပိုင်ဆိုင်မှုကို ပြသော Relative Pronoun မှာ 'whose' (whose father) ဖြစ်ပါသည်။"
      },
      {
        "id": "b5_07",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Gerund vs Infinitive",
        "question": "I completely forgot _______ the front door before leaving for class this morning.",
        "options": [
          "to lock",
          "locking",
          "lock",
          "locked"
        ],
        "answer": "to lock",
        "rationale": "'Forget to lock' means failed to perform the necessary obligation.",
        "rationaleMm": "လုပ်ရန်တာဝန်ကို မေ့လျော့ခဲ့ခြင်းဖြစ်၍ 'forget to lock' ဟု သုံးပါသည်။"
      },
      {
        "id": "b5_08",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Countable vs Uncountable",
        "question": "How _______ luggage did you bring with you on the regional flight?",
        "options": [
          "much",
          "many",
          "few",
          "a few"
        ],
        "answer": "much",
        "rationale": "'Luggage' is an uncountable noun and takes 'much', never 'many'.",
        "rationaleMm": "'Luggage' (ခရီးဆောင်အိတ်) သည် ရေတွက်မရသဖြင့် 'much' ဖြင့် မေးရပါမည်။"
      },
      {
        "id": "b5_09",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Collocations",
        "question": "Please _______ your time; there is no urgency to rush through the reading mock.",
        "options": [
          "take",
          "make",
          "have",
          "spend"
        ],
        "answer": "take",
        "rationale": "'Take your time' is an idiom meaning not to hurry.",
        "rationaleMm": "အေးအေးဆေးဆေး စိတ်အေးလက်အေး ဆောင်ရွက်ခြင်းကို 'take your time' ဟု သုံးပါသည်။"
      },
      {
        "id": "b5_10",
        "level": "B1",
        "bandRange": "Band 4.5 - 5.0",
        "category": "Modals",
        "question": "You _______ not touch the historic archaeological relics inside the glass display.",
        "options": [
          "must",
          "need",
          "could",
          "would"
        ],
        "answer": "must",
        "rationale": "'Must not' expresses strong prohibition.",
        "rationaleMm": "လုံးဝမပြုလုပ်ရန် တားမြစ်ချက်အတွက် 'must not' ကို သုံးပါသည်။"
      },
      {
        "id": "b5_11",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Third Conditional",
        "question": "If I had possessed sufficient funding, I _______ my own biotech startup in 2024.",
        "options": [
          "would have launched",
          "would launch",
          "will launch",
          "had launched"
        ],
        "answer": "would have launched",
        "rationale": "Third conditional apodosis requires 'would have + past participle'.",
        "rationaleMm": "အတိတ်က မဖြစ်ခဲ့သော စိတ်ကူးအတွက် Third Conditional (would have launched) ကို သုံးပါသည်။"
      },
      {
        "id": "b5_12",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Gerund Prepositions",
        "question": "The research candidate objected _______ being assigned an unverified topic.",
        "options": [
          "to",
          "at",
          "against",
          "for"
        ],
        "answer": "to",
        "rationale": "'Object to + gerund' requires the preposition 'to'.",
        "rationaleMm": "'Object to' တွင် 'to' သည် preposition ဖြစ်၍ နောက်တွင် gerund (-ing) လိုက်ရပါသည်။"
      },
      {
        "id": "b5_13",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Modal Past Deduction",
        "question": "The laboratory was locked from the inside; the intruder _______ entered through the skylight.",
        "options": [
          "must have",
          "can have",
          "should have",
          "would have"
        ],
        "answer": "must have",
        "rationale": "'Must have + V3' draws a logical past deduction based on physical clues.",
        "rationaleMm": "အခြေအနေအရ သေချာသလောက်ရှိသော အတိတ်ကောက်ချက်အတွက် 'must have entered' ကို သုံးပါသည်။"
      },
      {
        "id": "b5_14",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Prepositional Phrases",
        "question": "_______ behalf of the faculty of arts and humanities, I welcome you all.",
        "options": [
          "On",
          "In",
          "At",
          "By"
        ],
        "answer": "On",
        "rationale": "'On behalf of' is the formal expression meaning representing someone or a group.",
        "rationaleMm": "ကိုယ်စားပြု၍ ဟု ပြောဆိုရာတွင် 'on behalf of' ကို သုံးရပါသည်။"
      },
      {
        "id": "b5_15",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Concessive Connectors",
        "question": "Much _______ he wanted to attend the academic gala, his illness prevented him.",
        "options": [
          "as",
          "though",
          "although",
          "since"
        ],
        "answer": "as",
        "rationale": "'Much as' is an emphatic concession meaning 'although he wanted very much to attend'.",
        "rationaleMm": "'Much as' သည် အလွန်ဆန္ဒရှိသော်ငြားလည်း ဟု အလေးပေးသော Concession ဖွဲ့စည်းပုံဖြစ်ပါသည်။"
      },
      {
        "id": "b5_16",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Past Subjunctive",
        "question": "She acts as though she _______ an acknowledged global authority on macroeconomic policy.",
        "options": [
          "were",
          "is",
          "has been",
          "will be"
        ],
        "answer": "were",
        "rationale": "'As though / as if' takes past subjunctive 'were' for hypothetical or untrue states.",
        "rationaleMm": "လက်ရှိတွင် မဟုတ်သောအရာကို ဟန်ဆောင်သဘော ဖော်ပြရာတွင် 'as though she were' ကို သုံးပါသည်။"
      },
      {
        "id": "b5_17",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Phrasal Verbs",
        "question": "The university committee will _______ into the suspicious examination leaks thoroughly.",
        "options": [
          "look",
          "see",
          "watch",
          "glance"
        ],
        "answer": "look",
        "rationale": "'Look into' means to formally examine or investigate an issue.",
        "rationaleMm": "စုံစမ်းစစ်ဆေးခြင်းကို 'look into' ဟု သုံးပါသည်။"
      },
      {
        "id": "b5_18",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Dependent Prepositions",
        "question": "They congratulated the lead scholar _______ winning the Nobel Prize in Chemistry.",
        "options": [
          "on",
          "for",
          "at",
          "about"
        ],
        "answer": "on",
        "rationale": "'Congratulate someone on something' is the strict collocation.",
        "rationaleMm": "'Congratulate' သည် 'on' နှင့် အမြဲတွဲဖက်ရပါသည် (congratulate on winning)."
      },
      {
        "id": "b5_19",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Reported Speech Tenses",
        "question": "The dean stated that the new campus policy _______ into force the following semester.",
        "options": [
          "would come",
          "will come",
          "comes",
          "has come"
        ],
        "answer": "would come",
        "rationale": "Reported future from the past shifts 'will' to 'would'.",
        "rationaleMm": "အတိတ်ကပြောဆိုချက်ကို ပြန်လည်အစီရင်ခံရာတွင် 'will' မှ 'would' သို့ ပြောင်းလဲရပါသည်။"
      },
      {
        "id": "b5_20",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Collocations",
        "question": "The scientific panel expressed serious _______ regarding the replicability of the findings.",
        "options": [
          "doubts",
          "questions",
          "queries",
          "suspicions"
        ],
        "answer": "doubts",
        "rationale": "'Express serious doubts about' is the standard academic register collocation.",
        "rationaleMm": "ပြင်းပြင်းထန်ထန် သံသယရှိကြောင်း ဖော်ပြခြင်းကို 'express serious doubts' ဟု သုံးပါသည်။"
      },
      {
        "id": "b5_21",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Causative Passive",
        "question": "We need to get the campus central heating system _______ before freezing temperatures arrive.",
        "options": [
          "serviced",
          "servicing",
          "to service",
          "service"
        ],
        "answer": "serviced",
        "rationale": "'Get + object + past participle' expresses causing something to be done by a professional.",
        "rationaleMm": "အခြားသူတစ်ဦးကို ပြုပြင်စေခြင်းအတွက် 'get + object + V3' (get serviced) ကို သုံးပါသည်။"
      },
      {
        "id": "b5_22",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Prepositional Phrases",
        "question": "The laboratory was evacuated _______ precaution following a minor chemical spill.",
        "options": [
          "as a",
          "for a",
          "by a",
          "in a"
        ],
        "answer": "as a",
        "rationale": "'As a precaution' is the fixed phrase meaning as a preventive measure.",
        "rationaleMm": "ကြိုတင်ကာကွယ်မှုအနေဖြင့် ဟု ဆိုလိုရာတွင် 'as a precaution' ဟု သုံးပါသည်။"
      },
      {
        "id": "b5_23",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Participles",
        "question": "_______ carefully through the microscope, the biologist identified the parasitic microorganism.",
        "options": [
          "Looking",
          "Looked",
          "Having looked",
          "To look"
        ],
        "answer": "Looking",
        "rationale": "Present participle ('Looking') describes an action simultaneous with the main clause.",
        "rationaleMm": "ပင်မလုပ်ဆောင်ချက်နှင့် တပြိုင်နက်တည်း ဖြစ်ပေါ်သော အပြုအမူအတွက် Present Participle (Looking) ကို သုံးပါသည်။"
      },
      {
        "id": "b5_24",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Phrasal Verbs",
        "question": "The financial directors agreed to _______ into the unexpected revenue deficit.",
        "options": [
          "look",
          "see",
          "watch",
          "check"
        ],
        "answer": "look",
        "rationale": "'Look into' means to inspect or investigate.",
        "rationaleMm": "စုံစမ်းစစ်ဆေးခြင်းကို 'look into' ဟု သုံးပါသည်။"
      },
      {
        "id": "b5_25",
        "level": "B2",
        "bandRange": "Band 5.5 - 6.5",
        "category": "Collocations",
        "question": "The university authorities _______ a blind eye to minor dorm rule infractions.",
        "options": [
          "turned",
          "made",
          "gave",
          "had"
        ],
        "answer": "turned",
        "rationale": "'Turn a blind eye to' is an idiom meaning to knowingly ignore something wrong.",
        "rationaleMm": "သိလျက်နှင့် မသိကျိုးကျွံ ဥပေက္ခာပြုခြင်းကို 'turn a blind eye to' ဟု သုံးပါသည်။"
      },
      {
        "id": "b5_26",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Negative Inversion",
        "question": "Scarcely _______ the international treaty when localized border clashes erupted.",
        "options": [
          "had the ministers ratified",
          "did the ministers ratify",
          "the ministers ratified",
          "the ministers had ratified"
        ],
        "answer": "had the ministers ratified",
        "rationale": "Negative adverbial 'Scarcely had [subject] [V3] when...' triggers past perfect inversion.",
        "rationaleMm": "'Scarcely had... when' Inversion ပုံစံအရ 'had the ministers ratified' ဖြစ်ရပါမည်။"
      },
      {
        "id": "b5_27",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Mandative Subjunctive",
        "question": "It is essential that each participant _______ informed of their data privacy rights.",
        "options": [
          "be",
          "is",
          "was",
          "will be"
        ],
        "answer": "be",
        "rationale": "'It is essential that' governs mandative subjunctive bare infinitive 'be'.",
        "rationaleMm": "'It is essential that' နောက်တွင် Subjunctive Base Form (be) ကို သုံးရပါမည်။"
      },
      {
        "id": "b5_28",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Academic Inversion",
        "question": "Nowhere else in Southeast Asia _______ such pristine biological diversity.",
        "options": [
          "can one witness",
          "one can witness",
          "witnesses one",
          "one witnesses"
        ],
        "answer": "can one witness",
        "rationale": "Negative locative adverbial 'Nowhere else' triggers subject-auxiliary inversion.",
        "rationaleMm": "'Nowhere else' ဝါကျအစတွင်ပါက Inversion (can one witness) ပြုလုပ်ရပါမည်။"
      },
      {
        "id": "b5_29",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Academic Hedging",
        "question": "The economic indicators are _______ indicative of a gradual macroeconomic stabilization.",
        "options": [
          "tentatively",
          "tentative",
          "tending",
          "tentativeness"
        ],
        "answer": "tentatively",
        "rationale": "Adverb 'tentatively' modifies the adjective 'indicative', providing appropriate academic hedging.",
        "rationaleMm": "'Tentatively' (သတိထားစူးစမ်းလျက်) သည် ပညာရပ်ဆိုင်ရာ သုတေသနများတွင် အလွန်အသုံးများသော Hedging စကားလုံးဖြစ်ပါသည်။"
      },
      {
        "id": "b5_30",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Cleft Sentences",
        "question": "It was during her tenure as director _______ the institute doubled its research output.",
        "options": [
          "that",
          "when",
          "which",
          "then"
        ],
        "answer": "that",
        "rationale": "It-cleft prepositional focal phrase requires 'that' to introduce the relative clause.",
        "rationaleMm": "အချိန်ကာလကို အလေးပေးဖော်ပြသော Cleft ဝါကျတွင် 'that' ကို သုံးရပါသည်။"
      },
      {
        "id": "b5_31",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Advanced Collocations",
        "question": "The unexpected election outcome _______ the balance of geopolitical influence in the region.",
        "options": [
          "tipped",
          "toppled",
          "tripped",
          "twisted"
        ],
        "answer": "tipped",
        "rationale": "'Tip the balance' is an idiom meaning to give a slight advantage to one side or decide an outcome.",
        "rationaleMm": "အနိုင်အရှုံး ချိန်ခွင်လျှာကို ယိမ်းယိုင်သွားစေခြင်းကို 'tip the balance' ဟု သုံးပါသည်။"
      },
      {
        "id": "b5_32",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Subjunctive Expressions",
        "question": "The board resolved that the chief operating officer _______ step down immediately.",
        "options": [
          "should",
          "would",
          "must",
          "can"
        ],
        "answer": "should",
        "rationale": "In British and formal English, mandative subjunctive often uses 'should + base verb'.",
        "rationaleMm": "တရားဝင် ဆုံးဖြတ်ချက်များတွင် Subjunctive အဖြစ် 'should step down' ကို သုံးနိုင်ပါသည်။"
      },
      {
        "id": "b5_33",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Advanced Transitions",
        "question": "The technological feasibility is proven; _______, funding shortages hinder mass deployment.",
        "options": [
          "nonetheless",
          "furthermore",
          "likewise",
          "consequently"
        ],
        "answer": "nonetheless",
        "rationale": "'Nonetheless' signals that the main fact holds true in spite of the preceding obstacle.",
        "rationaleMm": "'Nonetheless' (သို့တိုင်အောင်) သည် ဆန့်ကျင်ဘက် အခြေအနေကို ဖော်ပြသော C1 စကားလုံးဖြစ်ပါသည်။"
      },
      {
        "id": "b5_34",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Fronted Participles",
        "question": "_______ with rigorous cross-examination, the defendant conceded the accounting irregulars.",
        "options": [
          "Confronted",
          "Confronting",
          "To confront",
          "Having confront"
        ],
        "answer": "Confronted",
        "rationale": "Past participial adjective 'Confronted with' describes the state leading to concession.",
        "rationaleMm": "'Confronted with' (ရင်ဆိုင်ကြုံတွေ့ရသောအခါ) ဟူသော Participle Clause ဖြစ်ပါသည်။"
      },
      {
        "id": "b5_35",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Academic Register",
        "question": "The university took rigorous steps to _______ fraudulent credentials from the applicant pool.",
        "options": [
          "weed out",
          "wipe off",
          "wash out",
          "wear off"
        ],
        "answer": "weed out",
        "rationale": "'Weed out' is an idiom meaning to remove unwanted or inferior elements from a group.",
        "rationaleMm": "မလိုလားအပ်သော အရာများကို ရွေးထုတ်ဖယ်ရှားခြင်းကို 'weed out' ဟု သုံးပါသည်။"
      },
      {
        "id": "b5_36",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Negative Inversion",
        "question": "Little _______ that the computer virus had already penetrated the inner mainframe.",
        "options": [
          "did the technicians know",
          "the technicians knew",
          "knew the technicians",
          "had the technicians known"
        ],
        "answer": "did the technicians know",
        "rationale": "Negative restrictive modifier 'Little' placed upfront mandates inversion ('did they know').",
        "rationaleMm": "'Little' ဝါကျအစတွင်ပါက Inversion (did the technicians know) ပြုလုပ်ရပါမည်။"
      },
      {
        "id": "b5_37",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Prepositional Nuance",
        "question": "The findings were presented in _______ with international carbon accounting standards.",
        "options": [
          "conformity",
          "confirmity",
          "conformation",
          "confirmation"
        ],
        "answer": "conformity",
        "rationale": "'In conformity with' is a formal collocation meaning in compliance with rules or standards.",
        "rationaleMm": "စံချိန်စံညွှန်းများနှင့် ကိုက်ညီညီညွတ်မှုကို 'in conformity with' ဟု သုံးပါသည်။"
      },
      {
        "id": "b5_38",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Collocations",
        "question": "The minister's speech struck a _______ chord with the rural agrarian populace.",
        "options": [
          "responsive",
          "responsible",
          "responding",
          "resolute"
        ],
        "answer": "responsive",
        "rationale": "'Strike a responsive chord' is an advanced idiom meaning to elicit an emotional agreement or sympathy.",
        "rationaleMm": "လူထု၏ စိတ်နှလုံးကို ထိမိစေပြီး ထောက်ခံမှုရရှိခြင်းကို 'strike a responsive chord' ဟု သုံးပါသည်။"
      },
      {
        "id": "b5_39",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Inverted Conditionals",
        "question": "_______ you need to amend your examination registration, please contact student services.",
        "options": [
          "Should",
          "Had",
          "Were",
          "Did"
        ],
        "answer": "Should",
        "rationale": "'Should you need' is the standard inverted first conditional structure.",
        "rationaleMm": "'If you need' အစား တရားဝင်စာရေးသားရာတွင် 'Should you need' ဟု Inversion သုံးပါသည်။"
      },
      {
        "id": "b5_40",
        "level": "C1",
        "bandRange": "Band 7.0 - 8.0",
        "category": "Collocations",
        "question": "The scientific paper was subjected to rigorous _______ review before acceptance.",
        "options": [
          "peer",
          "pair",
          "pier",
          "par"
        ],
        "answer": "peer",
        "rationale": "'Peer review' is the universal academic process of evaluation by fellow specialists.",
        "rationaleMm": "ပညာရှင်အချင်းချင်း စိစစ်သုံးသပ်သည့် လုပ်ငန်းစဉ်ကို 'peer review' ဟု ခေါ်ဆိုပါသည်။"
      },
      {
        "id": "b5_41",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Literary Adjectives",
        "question": "The author paints an extraordinarily _______ portrait of life in 19th-century Yangon.",
        "options": [
          "evocative",
          "provocative",
          "vociferous",
          "equivocal"
        ],
        "answer": "evocative",
        "rationale": "'Evocative' means bringing strong images, memories, or feelings vividly to mind.",
        "rationaleMm": "'Evocative' ဆိုသည်မှာ စိတ်ခံစားမှု သို့မဟုတ် အတိတ်ပုံရိပ်များကို ကွက်ကွက်ကွင်းကွင်း ပြန်လည်ပေါ်ပေါက်စေသော သရုပ်ဖော်မှုဖြစ်ပါသည်။"
      },
      {
        "id": "b5_42",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Subtle Nuance",
        "question": "The legal contract was full of ambiguous clauses that left it open to judicial _______.",
        "options": [
          "misconstruction",
          "misconception",
          "misdirection",
          "misbehavior"
        ],
        "answer": "misconstruction",
        "rationale": "'Misconstruction' is the formal legal term for faulty or mistaken interpretation of words.",
        "rationaleMm": "ဥပဒေစာချုပ်ပါ စကားရပ်များကို မှားယွင်းစွာ အနက်ဖွင့်ဆိုခြင်းကို 'misconstruction' ဟု တိကျစွာ ခေါ်ပါသည်။"
      },
      {
        "id": "b5_43",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Fixed Idioms",
        "question": "His brilliant defense strategy completely took the _______ out of the prosecutor's sails.",
        "options": [
          "wind",
          "water",
          "air",
          "breath"
        ],
        "answer": "wind",
        "rationale": "'Take the wind out of someone's sails' is an idiom meaning to deflate someone's confidence or advantage.",
        "rationaleMm": "'Take the wind out of one's sails' ဆိုသည်မှာ ပြိုင်ဘက်၏ အသာစီးရမှုကို ရုတ်တရက် ဖျက်ဆီးရုပ်သိမ်းလိုက်ခြင်းဖြစ်ပါသည်။"
      },
      {
        "id": "b5_44",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Rare Vocabulary",
        "question": "The diplomat's commentary was characterized by extreme _______ and disciplined economy of words.",
        "options": [
          "laconicism",
          "locution",
          "loquacity",
          "lucidity"
        ],
        "answer": "laconicism",
        "rationale": "'Laconicism' denotes concise, terse expression using very few words.",
        "rationaleMm": "'Laconicism' ဆိုသည်မှာ စကားလုံးအနည်းငယ်ဖြင့် လိုရင်းတိုရှင်း ထိမိစွာ ဖော်ပြခြင်းကို ဆိုလိုပါသည်။"
      },
      {
        "id": "b5_45",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Sophisticated Lexis",
        "question": "The regime's brutal suppression of dissidents brought _______ upon its diplomatic corps.",
        "options": [
          "opprobrium",
          "optimism",
          "opulence",
          "opportunism"
        ],
        "answer": "opprobrium",
        "rationale": "'Opprobrium' is severe public condemnation or disgrace resulting from reprehensible conduct.",
        "rationaleMm": "'Opprobrium' ဆိုသည်မှာ အများပြည်သူ၏ ပြင်းပြင်းထန်ထန် ပြစ်တင်ရှုတ်ချမှု သို့မဟုတ် အရှက်ရမှုကို ဆိုလိုသော C2 ဝေါဟာရဖြစ်ပါသည်။"
      },
      {
        "id": "b5_46",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Inverted Subjunctive",
        "question": "Were peace _______ be negotiated, both factions must relinquish disputed border territory.",
        "options": [
          "to",
          "would",
          "should",
          "could"
        ],
        "answer": "to",
        "rationale": "'Were [subject] to [verb]' is the inverted hypothetical conditional equivalent of 'If peace were to be negotiated'.",
        "rationaleMm": "'If peace were to be...' အစား Inversion ဖြင့် 'Were peace to be negotiated' ဟု သုံးပါသည်။"
      },
      {
        "id": "b5_47",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Sophisticated Verbs",
        "question": "The court's definitive verdict served to completely _______ the wrongly convicted researcher.",
        "options": [
          "exonerate",
          "exasperate",
          "excoriate",
          "exaggerate"
        ],
        "answer": "exonerate",
        "rationale": "'Exonerate' means to officially absolve someone from blame or a criminal charge.",
        "rationaleMm": "အပြစ်မရှိကြောင်း တရားဝင် ကြေညာလွတ်ငြိမ်းခွင့်ပေးခြင်းကို 'exonerate' ဟု သုံးပါသည်။"
      },
      {
        "id": "b5_48",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Fixed Concessives",
        "question": "_______ it not been for the whistleblower's testimony, the corporate fraud would have remained buried.",
        "options": [
          "Had",
          "Were",
          "Did",
          "Should"
        ],
        "answer": "Had",
        "rationale": "'Had it not been for' is the canonical inverted counterfactual.",
        "rationaleMm": "'Had it not been for' သည် 'ထိုအချက်သာ မရှိခဲ့ပါက' ဟူသော Third Conditional Inversion ဖြစ်ပါသည်။"
      },
      {
        "id": "b5_49",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Literary Register",
        "question": "The professor had an _______ thirst for rare antiquarian manuscripts.",
        "options": [
          "insatiable",
          "incompatible",
          "inscrutable",
          "insensible"
        ],
        "answer": "insatiable",
        "rationale": "'Insatiable' means impossible to satisfy (e.g., insatiable curiosity/thirst).",
        "rationaleMm": "'Insatiable' ဆိုသည်မှာ မည်သို့မျှ တင်းတိမ်ရောင့်ရဲနိုင်ခြင်းမရှိသော (မပြေနိုင်သော) ဆာလောင်မှုကို ညွှန်းဆိုပါသည်။"
      },
      {
        "id": "b5_50",
        "level": "C2",
        "bandRange": "Band 8.5 - 9.0",
        "category": "Prepositional Nuance",
        "question": "The executive's high-stakes gamble was _______ with grave financial perils.",
        "options": [
          "fraught",
          "filled",
          "freed",
          "fixed"
        ],
        "answer": "fraught",
        "rationale": "'Fraught with' is an advanced C2 collocation meaning filled with something dangerous or distressing.",
        "rationaleMm": "'Fraught with peril' ဆိုသည်မှာ အန္တရာယ်ဆိုးများဖြင့် ပြည့်နှက်နေသော အခြေအနေကို ညွှန်းဆိုပါသည်။"
      }
    ]
  }
];
  let activeBatchId = 'batch_1';
  let CEFR_DATA = [];
  let userAnswers = {};
  let isSubmitted = false;

  window.initCefrDiagnosticTest = function(containerId) {
    const targetId = containerId || 'cefrDiagnosticMount';
    const container = document.getElementById(targetId);
    if (!container) return;

    // Determine active batch from profile or storage
    if (typeof appState !== "undefined" && appState && appState.userProfile && appState.userProfile.cefrAssessment) {
      const lastBatch = appState.userProfile.cefrAssessment.batchId;
      if (lastBatch && RAW_BATCHES.some(b => b.id === lastBatch)) {
        activeBatchId = lastBatch;
      }
    }

    // Synchronous immediate render so container is NEVER empty
    syncActiveBatchQuestions();
    window.renderCefrDiagnosticUI(targetId);

    // Optional background check for remote updates
    if (typeof fetch === 'function') {
      fetch('data/cefr-diagnostic.json')
        .then(res => res.ok ? res.json() : null)
        .then(payload => {
          if (payload && Array.isArray(payload.batches) && payload.batches.length > 0) {
            RAW_BATCHES = payload.batches;
            if (Object.keys(userAnswers).length === 0 && !isSubmitted) {
              syncActiveBatchQuestions();
              window.renderCefrDiagnosticUI(targetId);
            }
          }
        })
        .catch(err => {
          console.debug('[CEFR] Background fetch check:', err);
        });
    }
  };

  function syncActiveBatchQuestions() {
    const batchObj = RAW_BATCHES.find(b => b.id === activeBatchId) || RAW_BATCHES[0];
    if (batchObj) {
      CEFR_DATA = batchObj.questions || [];
    } else {
      CEFR_DATA = [];
    }
  }

  window.switchCefrBatch = function(batchId, containerId) {
    activeBatchId = batchId;
    userAnswers = {};
    isSubmitted = false;
    syncActiveBatchQuestions();
    window.renderCefrDiagnosticUI(containerId);
  };

  window.selectCefrOption = function(qId, optionVal, containerId) {
    if (isSubmitted) return;
    userAnswers[qId] = optionVal;
    window.renderCefrDiagnosticUI(containerId);
  };

  window.submitCefrTest = function(containerId) {
    isSubmitted = true;
    const answeredCount = Object.keys(userAnswers).length;
    const totalQ = CEFR_DATA.length || 50;

    let score = 0;
    let b1Correct = 0, b2Correct = 0, c1Correct = 0, c2Correct = 0;

    CEFR_DATA.forEach(q => {
      if (userAnswers[q.id] === q.answer) {
        score++;
        if (q.level === 'B1') b1Correct++;
        else if (q.level === 'B2') b2Correct++;
        else if (q.level === 'C1') c1Correct++;
        else if (q.level === 'C2') c2Correct++;
      }
    });

    // Diagnosed Level & IELTS Mapping for 50 questions
    let diagnosedLevel = 'B1 Threshold (Intermediate)';
    let cefrCode = 'B1';
    let projectedBand = 'Band 4.5 - 5.0';
    let levelBadgeColor = '#94A3B8';

    if (score >= 46) {
      diagnosedLevel = 'C2 Mastery (Expert Speaker)';
      cefrCode = 'C2';
      projectedBand = 'Band 8.5 - 9.0';
      levelBadgeColor = '#F59E0B';
    } else if (score >= 36) {
      diagnosedLevel = 'C1 Advanced (Effective Operational)';
      cefrCode = 'C1';
      projectedBand = 'Band 7.0 - 8.0';
      levelBadgeColor = '#10B981';
    } else if (score >= 24) {
      diagnosedLevel = 'B2 Independent (Upper-Intermediate)';
      cefrCode = 'B2';
      projectedBand = 'Band 6.0 - 6.5';
      levelBadgeColor = '#0284C7';
    } else {
      diagnosedLevel = 'B1 Threshold (Intermediate)';
      cefrCode = 'B1';
      projectedBand = 'Band 4.5 - 5.0';
      levelBadgeColor = '#64748B';
    }

    const currentBatchObj = RAW_BATCHES.find(b => b.id === activeBatchId) || { name: 'Diagnostic Batch' };

    const cefrResult = {
      batchId: activeBatchId,
      batchName: currentBatchObj.name,
      score: score,
      total: totalQ,
      accuracy: Math.round((score / totalQ) * 100),
      diagnosedLevel: diagnosedLevel,
      cefrCode: cefrCode,
      projectedBand: projectedBand,
      breakdown: {
        b1: { correct: b1Correct, total: 10 },
        b2: { correct: b2Correct, total: 15 },
        c1: { correct: c1Correct, total: 15 },
        c2: { correct: c2Correct, total: 10 }
      },
      completedAt: new Date().toISOString()
    };

    // Save to appState and userProfile
    if (typeof appState !== "undefined" && appState) {
      if (typeof ensureUserProfileInitialized === "function") {
        ensureUserProfileInitialized();
      }
      if (!appState.userProfile) appState.userProfile = {};
      appState.userProfile.cefrAssessment = cefrResult;

      if (!Array.isArray(appState.userProfile.cefrHistory)) {
        appState.userProfile.cefrHistory = [];
      }
      appState.userProfile.cefrHistory.push(cefrResult);

      if (typeof saveAppState === "function") {
        saveAppState();
      }
      if (typeof window.syncUserDataToCloud === "function") {
        window.syncUserDataToCloud();
      }
    }

    try {
      localStorage.setItem('ips_latest_cefr_assessment', JSON.stringify(cefrResult));
    } catch (e) {}

    // Dispatch global event for live tab updates
    window.dispatchEvent(new CustomEvent('cefrAssessmentUpdated', { detail: cefrResult }));

    window.renderCefrDiagnosticUI(containerId);
    const resultBox = document.getElementById('cefrResultSummary');
    if (resultBox) {
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  window.resetCefrTest = function(containerId) {
    userAnswers = {};
    isSubmitted = false;
    // Auto-advance to next batch for fresh retake
    if (RAW_BATCHES.length > 1) {
      const currentIdx = RAW_BATCHES.findIndex(b => b.id === activeBatchId);
      const nextIdx = (currentIdx + 1) % RAW_BATCHES.length;
      activeBatchId = RAW_BATCHES[nextIdx].id;
      syncActiveBatchQuestions();
    }
    window.renderCefrDiagnosticUI(containerId);
  };

  window.renderCefrDiagnosticUI = function(containerId) {
    const targetId = containerId || 'cefrDiagnosticMount';
    const container = document.getElementById(targetId);
    if (!container) return;

    const answeredCount = Object.keys(userAnswers).length;
    const totalQ = CEFR_DATA.length || 50;
    const currentBatchObj = RAW_BATCHES.find(b => b.id === activeBatchId) || { name: 'Batch 1 (Form Alpha)' };

    let score = 0;
    let b1Correct = 0, b2Correct = 0, c1Correct = 0, c2Correct = 0;

    if (isSubmitted) {
      CEFR_DATA.forEach(q => {
        if (userAnswers[q.id] === q.answer) {
          score++;
          if (q.level === 'B1') b1Correct++;
          else if (q.level === 'B2') b2Correct++;
          else if (q.level === 'C1') c1Correct++;
          else if (q.level === 'C2') c2Correct++;
        }
      });
    }

    // Determine diagnosed level
    let diagnosedLevel = 'B1 Threshold (Intermediate)';
    let cefrCode = 'B1';
    let projectedBand = 'Band 4.5 - 5.0';
    let levelBadgeColor = '#64748B';
    let burmeseAdvice = 'သင့်အဆင့်မှာ B1 Threshold ဖြစ်ပြီး Cambridge IELTS တွင် Band 4.5 - 5.0 ရရှိနိုင်ပါသည်။ အခြေခံသဒ္ဒါ၊ ဝေါဟာရနှင့် Tense များကို ဦးစားပေး လေ့ကျင့်သင့်ပါသည်။';

    if (score >= 46) {
      diagnosedLevel = 'C2 Mastery (Expert Speaker)';
      cefrCode = 'C2';
      projectedBand = 'Band 8.5 - 9.0';
      levelBadgeColor = '#F59E0B';
      burmeseAdvice = 'သင့်အဆင့်မှာ C2 Mastery (Expert Speaker) ဖြစ်ပြီး Cambridge IELTS တွင် Band 8.5 - 9.0 အထိ အမြင့်ဆုံး ရရှိနိုင်ပါသည်။ ပညာရပ်ဆိုင်ရာ သုတေသန ဝေါဟာရများကို ဆက်လက်ထိန်းသိမ်းပါ။';
    } else if (score >= 36) {
      diagnosedLevel = 'C1 Advanced (Effective Operational)';
      cefrCode = 'C1';
      projectedBand = 'Band 7.0 - 8.0';
      levelBadgeColor = '#10B981';
      burmeseAdvice = 'သင့်အဆင့်မှာ C1 Advanced ဖြစ်ပြီး Cambridge IELTS တွင် Band 7.0 - 8.0 ရရှိနိုင်ပါသည်။ C2 ဝေါဟာရများနှင့် အဆင့်မြင့် Inversion များကို လေ့ကျင့်ပါက Band 8.5+ သို့ အလွယ်တကူ တက်လှမ်းနိုင်ပါသည်။';
    } else if (score >= 24) {
      diagnosedLevel = 'B2 Independent (Upper-Intermediate)';
      cefrCode = 'B2';
      projectedBand = 'Band 6.0 - 6.5';
      levelBadgeColor = '#0284C7';
      burmeseAdvice = 'သင့်အဆင့်မှာ B2 Independent ဖြစ်ပြီး Cambridge IELTS တွင် Band 6.0 - 6.5 ရရှိနိုင်ပါသည်။ C1 Academic Collocations နှင့် Conditionals များကို အဓိကထား လေ့ကျင့်ရန် လိုအပ်ပါသည်။';
    }

    container.innerHTML = `
      <div class="occ-card" style="padding:clamp(12px, 3vw, 22px); border-radius:12px; background:var(--bg-card); border:1.5px solid var(--border); box-shadow:0 6px 24px rgba(0,0,0,0.15); max-width:100%; box-sizing:border-box; overflow:hidden;">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
              <span class="occ-ver-pill" style="background:#0284C7; color:#FFF; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:4px;">CAMBRIDGE CEFR ASSESSMENT</span>
              <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:600;">50-Question Calibrated Diagnostic</span>
            </div>
            <h3 style="margin:0; font-size:1.25rem; font-weight:800; color:var(--text);">Cambridge Diagnostic Level Placement Test</h3>
            <div style="font-size:0.82rem; color:var(--text-secondary); margin-top:4px;">
              50 questions testing grammatical precision, advanced inversion, and academic collocation across B1, B2, C1, and C2 levels.
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:700;">COMPLETED</div>
            <div style="font-size:1.35rem; font-weight:900; color:var(--accent); font-family:monospace;">${answeredCount} / ${totalQ}</div>
          </div>
        </div>

        <!-- Batch Selector Bar -->
        <div style="display:flex; flex-direction:column; gap:8px; padding:12px 14px; background:var(--bg); border:1px solid var(--border); border-radius:8px; margin-bottom:16px; box-sizing:border-box; width:100%; max-width:100%; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; width:100%; min-width:0; box-sizing:border-box;">
            <span style="font-size:0.75rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em;">TEST FORM:</span>
            <span style="font-size:0.72rem; color:var(--text-secondary); font-weight:600; opacity:0.85;">Stratified: 10 B1 · 15 B2 · 15 C1 · 10 C2</span>
          </div>
          <div style="width:100%; min-width:0; max-width:100%; position:relative; box-sizing:border-box; overflow:hidden;">
            <select onchange="window.switchCefrBatch(this.value, '${targetId}')" style="width:100% !important; min-width:0 !important; max-width:100% !important; background:var(--bg-card); color:var(--text); border:1.5px solid var(--border); border-radius:8px; padding:10px 36px 10px 12px; font-size:0.84rem; font-weight:700; cursor:pointer; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; box-sizing:border-box; -webkit-appearance:none; -moz-appearance:none; appearance:none; background-image:url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23E05624%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E'); background-repeat:no-repeat; background-position:right 12px center;" ${isSubmitted ? 'disabled' : ''}>
              ${RAW_BATCHES.map((b, idx) => `
                <option value="${b.id}" ${b.id === activeBatchId ? 'selected' : ''}>Batch ${idx + 1}: ${b.name}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="width:100%; height:6px; background:var(--border); border-radius:3px; overflow:hidden; margin-bottom:20px;">
          <div style="width:${(answeredCount/totalQ)*100}%; height:100%; background:var(--accent); transition:width 0.3s ease;"></div>
        </div>

        <!-- Result Summary Box (Shown after submission) -->
        ${isSubmitted ? `
          <div id="cefrResultSummary" style="padding:20px; background:var(--bg); border:2px solid ${levelBadgeColor}; border-radius:12px; margin-bottom:24px; box-shadow:0 4px 16px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
              <div>
                <span class="occ-ver-pill" style="background:${levelBadgeColor}; color:#FFF; font-weight:900; font-size:0.75rem; padding:5px 12px; border-radius:6px;">DIAGNOSED LEVEL: ${diagnosedLevel}</span>
                <h4 style="margin:10px 0 6px 0; font-size:1.25rem; font-weight:800; color:var(--text);">Projected IELTS Score: ${projectedBand}</h4>
                <div class="burmese" style="font-size:0.86rem; color:var(--text-secondary); line-height:1.5;">
                  ${burmeseAdvice}
                </div>
              </div>
              <div style="text-align:center; padding:12px 22px; background:var(--bg-card); border:1px solid var(--border); border-radius:10px; min-width:140px;">
                <div style="font-size:0.72rem; color:var(--text-secondary); font-weight:700;">OVERALL SCORE</div>
                <div style="font-size:2rem; font-weight:900; color:${levelBadgeColor}; font-family:monospace;">${score} / ${totalQ}</div>
                <div style="font-size:0.78rem; font-weight:700; color:var(--text-secondary);">${Math.round((score/totalQ)*100)}% Accuracy</div>
              </div>
            </div>

            <!-- Tier breakdown -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-top:16px; padding-top:14px; border-top:1px dashed var(--border);">
              <div style="text-align:center; font-size:0.8rem; background:var(--bg-card); padding:8px; border-radius:6px; border:1px solid var(--border);">
                <div style="color:var(--text-secondary);">B1 Level (1–10)</div>
                <strong style="color:${b1Correct >= 8 ? '#10B981' : '#EF4444'}; font-size:1rem;">${b1Correct} / 10</strong>
              </div>
              <div style="text-align:center; font-size:0.8rem; background:var(--bg-card); padding:8px; border-radius:6px; border:1px solid var(--border);">
                <div style="color:var(--text-secondary);">B2 Level (11–25)</div>
                <strong style="color:${b2Correct >= 12 ? '#10B981' : '#EF4444'}; font-size:1rem;">${b2Correct} / 15</strong>
              </div>
              <div style="text-align:center; font-size:0.8rem; background:var(--bg-card); padding:8px; border-radius:6px; border:1px solid var(--border);">
                <div style="color:var(--text-secondary);">C1 Level (26–40)</div>
                <strong style="color:${c1Correct >= 12 ? '#10B981' : '#EF4444'}; font-size:1rem;">${c1Correct} / 15</strong>
              </div>
              <div style="text-align:center; font-size:0.8rem; background:var(--bg-card); padding:8px; border-radius:6px; border:1px solid var(--border);">
                <div style="color:var(--text-secondary);">C2 Level (41–50)</div>
                <strong style="color:${c2Correct >= 8 ? '#10B981' : '#EF4444'}; font-size:1rem;">${c2Correct} / 10</strong>
              </div>
            </div>

            <!-- Action shortcuts to Home and Lexicon -->
            <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:16px; padding-top:14px; border-top:1px solid var(--border);">
              <button class="btn-accent-solid" onclick="switchView('lexicon'); if (typeof window.filterLexiconByCefrLevel === 'function') window.filterLexiconByCefrLevel('${cefrCode}');" style="padding:8px 16px; font-size:0.82rem; font-weight:800; border-radius:6px;">
                🎯 View Personalized ${cefrCode} Lexicons →
              </button>
              <button class="btn-outlined" onclick="switchView('overview');" style="padding:8px 16px; font-size:0.82rem; font-weight:700; border-radius:6px;">
                🏠 Back to Home Dashboard
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Question Grid -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          ${CEFR_DATA.map((q, idx) => {
            const isAnswered = !!userAnswers[q.id];
            const chosen = userAnswers[q.id];
            const isCorrect = isSubmitted && chosen === q.answer;
            const isIncorrect = isSubmitted && chosen && chosen !== q.answer;

            let cardBorder = '1px solid var(--border)';
            if (isSubmitted) {
              cardBorder = isCorrect ? '1.5px solid #10B981' : '1.5px solid #EF4444';
            }

            return `
              <div style="padding:16px; background:var(--bg); border:${cardBorder}; border-radius:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:0.72rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">
                    Question ${idx + 1} of ${totalQ} · <span style="color:var(--accent); font-weight:900;">${q.level} Level</span> · <span style="color:var(--text-muted);">${q.category || ''}</span>
                  </span>
                  ${isSubmitted ? `
                    <span style="font-size:0.75rem; font-weight:800; color:${isCorrect ? '#10B981' : '#EF4444'};">
                      ${isCorrect ? '<svg class="ui-icon ui-icon-xs" style="color:#10B981; display:inline-block; vertical-align:-2px;"><use href="#lucide-check"/></svg> CORRECT' : '<svg class="ui-icon ui-icon-xs" style="color:#EF4444; display:inline-block; vertical-align:-2px;"><use href="#lucide-x"/></svg> INCORRECT'}
                    </span>
                  ` : ''}
                </div>

                <div style="font-size:0.95rem; font-weight:700; color:var(--text); line-height:1.45; margin-bottom:12px;">
                  ${q.question}
                </div>

                <!-- Options -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px;">
                  ${q.options.map(opt => {
                    const isSelected = chosen === opt;
                    let optBg = 'var(--bg-card)';
                    let optBorder = '1px solid var(--border)';
                    let optColor = 'var(--text)';

                    if (isSelected) {
                      optBg = 'rgba(224, 108, 53, 0.12)';
                      optBorder = '1.5px solid var(--accent)';
                      optColor = 'var(--accent)';
                    }
                    if (isSubmitted) {
                      if (opt === q.answer) {
                        optBg = 'rgba(16, 185, 129, 0.15)';
                        optBorder = '1.5px solid #10B981';
                        optColor = '#10B981';
                      } else if (isSelected && opt !== q.answer) {
                        optBg = 'rgba(239, 68, 68, 0.15)';
                        optBorder = '1.5px solid #EF4444';
                        optColor = '#EF4444';
                      }
                    }

                    return `
                      <button type="button" 
                        onclick="window.selectCefrOption('${q.id}', '${opt.replace(/'/g, "\\'")}', '${targetId}')"
                        style="padding:10px 14px; text-align:left; background:${optBg}; border:${optBorder}; border-radius:6px; font-size:0.88rem; font-weight:700; color:${optColor}; cursor:${isSubmitted ? 'default' : 'pointer'}; display:flex; align-items:center; justify-content:space-between; transition:all 0.15s ease;"
                        ${isSubmitted ? 'disabled' : ''}>
                        <span>${opt}</span>
                        ${isSelected ? '<span style="font-size:0.8rem;">●</span>' : '<span style="opacity:0.3; font-size:0.8rem;">○</span>'}
                      </button>
                    `;
                  }).join('')}
                </div>

                <!-- Explanation (Shown after submit) -->
                ${isSubmitted ? `
                  <div style="margin-top:12px; padding:10px 12px; background:rgba(0,0,0,0.03); border-radius:6px; border-left:3px solid ${isCorrect ? '#10B981' : '#EF4444'};">
                    <div style="font-size:0.75rem; font-weight:800; color:var(--text-secondary); margin-bottom:2px;">EXAMINER RATIONALE // သုံးသပ်ချက်:</div>
                    <div style="font-size:0.82rem; color:var(--text); line-height:1.5;">${q.rationale}</div>
                    <div class="burmese" style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">${q.rationaleMm}</div>
                  </div>
                ` : ''}

              </div>
            `;
          }).join('')}
        </div>

        <!-- Action Controls -->
        <div style="margin-top:22px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding-top:16px; border-top:1px solid var(--border);">
          <div style="font-size:0.8rem; color:var(--text-secondary);">
            ${isSubmitted ? `Test completed! Score: ${score}/${totalQ}` : `Answer all questions to compute your CEFR placement.`}
          </div>
          <div style="display:flex; gap:8px;">
            ${isSubmitted ? `
              <button class="btn-outlined" onclick="window.resetCefrTest('${targetId}')" style="padding:8px 16px; font-size:0.82rem; font-weight:700;">
                <svg class="ui-icon ui-icon-xs"><use href="#lucide-refresh-cw"/></svg> Retake with Next Batch
              </button>
            ` : `
              <button class="btn-accent-solid" onclick="window.submitCefrTest('${targetId}')" style="padding:10px 24px; font-size:0.88rem; font-weight:800;" ${answeredCount < totalQ ? 'title="You can submit now, or answer remaining questions"' : ''}>
                <svg class="ui-icon ui-icon-xs"><use href="#lucide-check-circle"/></svg> Submit &amp; Diagnose Level
              </button>
            `}
          </div>
        </div>

      </div>
    `;
  };

  // Pre-synchronize questions on script load
  syncActiveBatchQuestions();

  // Automatic mount if mount element is already present in DOM
  if (typeof document !== 'undefined') {
    const autoMount = () => {
      const el = document.getElementById('atCefrMount') || document.getElementById('cefrDiagnosticMount');
      if (el && (!el.innerHTML || el.innerHTML.trim() === '')) {
        window.initCefrDiagnosticTest(el.id);
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoMount);
    } else {
      autoMount();
    }
  }

})(window);
