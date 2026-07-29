import type { CharacterFamily, Lesson, ReviewCard, Scenario, Story } from './types'
import { extraCharacterFamilies } from './content/characters'
import { extraLessons } from './content/lessons'
import { extraScenarios } from './content/scenarios'
import { extraStories } from './content/stories'

export const lessons: Lesson[] = [
  {
    id: 'client-check-in', eyebrow: 'CLIENT LANGUAGE 01', title: 'Start the session naturally', chineseTitle: '训练前聊一聊', duration: 9, level: 'Core', accent: '#d75c44',
    outcome: 'Greet a client, ask how their body feels, and adapt the session.',
    mission: 'Before your next session, ask one client how they slept and what feels tight.',
    phrases: [
      { hanzi: '今天身体感觉怎么样？', pinyin: 'Jīntiān shēntǐ gǎnjué zěnmeyàng?', english: 'How does your body feel today?', note: '身体感觉 is a natural, broad check-in.' },
      { hanzi: '昨晚睡得好吗？', pinyin: 'Zuówǎn shuì de hǎo ma?', english: 'Did you sleep well last night?' },
      { hanzi: '哪里比较紧？', pinyin: 'Nǎli bǐjiào jǐn?', english: 'Where feels relatively tight?' },
      { hanzi: '我们先热身，再看情况调整。', pinyin: 'Wǒmen xiān rèshēn, zài kàn qíngkuàng tiáozhěng.', english: "We'll warm up first, then adjust based on how you feel." },
    ],
  },
  {
    id: 'pain-effort', eyebrow: 'CLIENT LANGUAGE 02', title: 'Pain, soreness, or effort?', chineseTitle: '分清疼痛和酸痛', duration: 11, level: 'Core', accent: '#285f55',
    outcome: 'Clarify what a client feels without leading them toward an answer.',
    mission: 'Use 是疼，还是酸？ only after asking an open question first.',
    phrases: [
      { hanzi: '你感觉到什么？', pinyin: 'Nǐ gǎnjué dào shénme?', english: 'What do you feel?' },
      { hanzi: '是疼，还是肌肉酸？', pinyin: 'Shì téng, háishì jīròu suān?', english: 'Is it pain, or muscle soreness?' },
      { hanzi: '疼痛是一到十的几分？', pinyin: 'Téngtòng shì yī dào shí de jǐ fēn?', english: 'How would you rate the pain from one to ten?' },
      { hanzi: '这个动作先停一下。', pinyin: 'Zhège dòngzuò xiān tíng yíxià.', english: "Let's pause this movement for now." },
    ],
  },
  {
    id: 'sets-reps', eyebrow: 'COACHING LANGUAGE 01', title: 'Coach sets, reps, and rest', chineseTitle: '组数、次数和休息', duration: 10, level: 'Core', accent: '#c8942f',
    outcome: 'Give a complete set instruction without switching to English.',
    mission: 'Coach one full exercise in Chinese: sets, reps, tempo, and rest.',
    phrases: [
      { hanzi: '做三组，每组八次。', pinyin: 'Zuò sān zǔ, měi zǔ bā cì.', english: 'Do three sets of eight reps.' },
      { hanzi: '动作慢一点，控制住。', pinyin: 'Dòngzuò màn yìdiǎn, kòngzhì zhù.', english: 'Move a little slower and stay in control.' },
      { hanzi: '组间休息九十秒。', pinyin: 'Zǔ jiān xiūxi jiǔshí miǎo.', english: 'Rest ninety seconds between sets.' },
      { hanzi: '还可以再做几次？', pinyin: 'Hái kěyǐ zài zuò jǐ cì?', english: 'How many more reps could you do?' },
    ],
  },
  {
    id: 'squat-cues', eyebrow: 'COACHING LANGUAGE 02', title: 'Cue the squat clearly', chineseTitle: '深蹲口令', duration: 12, level: 'Build', accent: '#76526f',
    outcome: 'Use short, natural cues instead of translating technical paragraphs.',
    mission: 'Choose only two cues for your next squat set and say them at the right moment.',
    phrases: [
      { hanzi: '脚踩稳。', pinyin: 'Jiǎo cǎi wěn.', english: 'Plant your feet firmly.' },
      { hanzi: '膝盖跟着脚尖的方向。', pinyin: 'Xīgài gēnzhe jiǎojiān de fāngxiàng.', english: 'Keep your knees tracking in the direction of your toes.' },
      { hanzi: '吸气，收紧核心。', pinyin: 'Xīqì, shōujǐn héxīn.', english: 'Breathe in and brace your core.' },
      { hanzi: '站起来的时候用力呼气。', pinyin: 'Zhàn qǐlai de shíhou yònglì hūqì.', english: 'Exhale forcefully as you stand up.' },
    ],
  },
  {
    id: 'goals-progress', eyebrow: 'RELATIONSHIP LANGUAGE', title: 'Talk about goals and progress', chineseTitle: '目标和进步', duration: 10, level: 'Build', accent: '#3c6d82',
    outcome: 'Ask better questions and explain progress in client-friendly language.',
    mission: 'Ask a client what “feeling better” would look like in daily life.',
    phrases: [
      { hanzi: '你最想改善的是什么？', pinyin: 'Nǐ zuì xiǎng gǎishàn de shì shénme?', english: 'What do you most want to improve?' },
      { hanzi: '对你来说，进步是什么样的？', pinyin: 'Duì nǐ láishuō, jìnbù shì shénme yàng de?', english: 'What does progress look like to you?' },
      { hanzi: '你的基础比上个月稳定多了。', pinyin: 'Nǐ de jīchǔ bǐ shàng ge yuè wěndìng duō le.', english: 'Your foundation is much more stable than last month.' },
      { hanzi: '我们不只提高上限，也要提高下限。', pinyin: 'Wǒmen bù zhǐ tígāo shàngxiàn, yě yào tígāo xiàxiàn.', english: "We don't only raise the ceiling; we also raise the floor." },
    ],
  },
  {
    id: 'booking', eyebrow: 'EVERYDAY BUSINESS', title: 'Book and follow up', chineseTitle: '预约和跟进', duration: 8, level: 'Core', accent: '#af6642',
    outcome: 'Confirm sessions and follow up without stiff textbook Chinese.',
    mission: 'Send your next simple scheduling message entirely in Chinese.',
    phrases: [
      { hanzi: '我们周六上午十点见，可以吗？', pinyin: 'Wǒmen Zhōuliù shàngwǔ shí diǎn jiàn, kěyǐ ma?', english: 'Shall we meet Saturday at 10 a.m.?' },
      { hanzi: '如果要改时间，提前告诉我就好。', pinyin: 'Rúguǒ yào gǎi shíjiān, tíqián gàosu wǒ jiù hǎo.', english: 'If you need to change the time, just let me know in advance.' },
      { hanzi: '今天训练后感觉怎么样？', pinyin: 'Jīntiān xùnliàn hòu gǎnjué zěnmeyàng?', english: 'How do you feel after today’s training?' },
      { hanzi: '有问题随时给我发消息。', pinyin: 'Yǒu wèntí suíshí gěi wǒ fā xiāoxi.', english: 'Message me anytime if you have questions.' },
    ],
  },
]

lessons.push(...extraLessons)

export const characterFamilies: CharacterFamily[] = [
  {
    id: 'qing-family', anchor: '青', sound: 'qīng / qíng', idea: 'clear / blue-green', hint: '青 carries the sound. The left component narrows the meaning.',
    members: [
      { char: '清', pinyin: 'qīng', meaning: 'clear', component: '氵 water', word: '清楚', wordPinyin: 'qīngchu', wordMeaning: 'clear / to understand clearly' },
      { char: '情', pinyin: 'qíng', meaning: 'feeling', component: '忄 heart', word: '情况', wordPinyin: 'qíngkuàng', wordMeaning: 'situation / condition' },
      { char: '请', pinyin: 'qǐng', meaning: 'please / invite', component: '讠 speech', word: '请问', wordPinyin: 'qǐngwèn', wordMeaning: 'excuse me, may I ask' },
      { char: '晴', pinyin: 'qíng', meaning: 'sunny', component: '日 sun', word: '晴天', wordPinyin: 'qíngtiān', wordMeaning: 'sunny day' },
    ],
  },
  {
    id: 'bao-family', anchor: '包', sound: 'bāo / páo / pào', idea: 'wrap / bundle', hint: '包 suggests the sound; the other component tells the category.',
    members: [
      { char: '抱', pinyin: 'bào', meaning: 'hold / hug', component: '扌 hand', word: '抱住', wordPinyin: 'bàozhù', wordMeaning: 'hold firmly' },
      { char: '跑', pinyin: 'pǎo', meaning: 'run', component: '足 foot', word: '跑步', wordPinyin: 'pǎobù', wordMeaning: 'to run / running' },
      { char: '泡', pinyin: 'pào', meaning: 'soak / bubble', component: '氵 water', word: '泡沫轴', wordPinyin: 'pàomòzhóu', wordMeaning: 'foam roller' },
      { char: '炮', pinyin: 'pào', meaning: 'cannon', component: '火 fire', word: '炮弹', wordPinyin: 'pàodàn', wordMeaning: 'shell / projectile' },
    ],
  },
  {
    id: 'ma-family', anchor: '马', sound: 'mǎ / ma', idea: 'horse', hint: 'One stable shape gives you several common sounds. Read the left side for meaning.',
    members: [
      { char: '妈', pinyin: 'mā', meaning: 'mother', component: '女 woman', word: '妈妈', wordPinyin: 'māma', wordMeaning: 'mom' },
      { char: '吗', pinyin: 'ma', meaning: 'question particle', component: '口 mouth', word: '可以吗', wordPinyin: 'kěyǐ ma', wordMeaning: 'is that okay?' },
      { char: '码', pinyin: 'mǎ', meaning: 'code / number', component: '石 stone', word: '号码', wordPinyin: 'hàomǎ', wordMeaning: 'number' },
      { char: '骂', pinyin: 'mà', meaning: 'scold', component: '马 phonetic', word: '骂人', wordPinyin: 'màrén', wordMeaning: 'to curse at someone' },
    ],
  },
  {
    id: 'jian-family', anchor: '建', sound: 'jiàn', idea: 'build / establish', hint: '建 gives a strong sound clue across useful business and body words.',
    members: [
      { char: '健', pinyin: 'jiàn', meaning: 'healthy / strong', component: '亻 person', word: '健康', wordPinyin: 'jiànkāng', wordMeaning: 'health / healthy' },
      { char: '键', pinyin: 'jiàn', meaning: 'key', component: '钅 metal', word: '关键', wordPinyin: 'guānjiàn', wordMeaning: 'key / crucial' },
      { char: '建', pinyin: 'jiàn', meaning: 'build', component: '廴 movement', word: '建立', wordPinyin: 'jiànlì', wordMeaning: 'establish / build' },
      { char: '腱', pinyin: 'jiàn', meaning: 'tendon', component: '月 body', word: '肌腱', wordPinyin: 'jījiàn', wordMeaning: 'tendon' },
    ],
  },
]

characterFamilies.push(...extraCharacterFamilies)

export const stories: Story[] = [
  {
    id: 'first-session', title: 'A client’s first session', chineseTitle: '第一次训练', level: 'HSK 2–3 bridge', minutes: 5,
    description: 'A short conversation about goals, sleep, and today’s plan.', tags: ['client', 'listening', 'work'],
    lines: [
      { id: 'fs1', hanzi: '今天是小林第一次来训练。', pinyin: 'Jīntiān shì Xiǎolín dì-yī cì lái xùnliàn.', english: 'Today is Xiaolin’s first training session.' },
      { id: 'fs2', hanzi: '教练先问：“你最近身体感觉怎么样？”', pinyin: 'Jiàoliàn xiān wèn: “Nǐ zuìjìn shēntǐ gǎnjué zěnmeyàng?”', english: 'The coach first asks, “How has your body felt recently?”' },
      { id: 'fs3', hanzi: '小林说工作很忙，肩膀有点紧，而且睡得不太好。', pinyin: 'Xiǎolín shuō gōngzuò hěn máng, jiānbǎng yǒudiǎn jǐn, érqiě shuì de bú tài hǎo.', english: 'Xiaolin says work is busy, the shoulders feel a little tight, and sleep has not been very good.' },
      { id: 'fs4', hanzi: '教练决定先做简单的活动度测试，再开始力量训练。', pinyin: 'Jiàoliàn juédìng xiān zuò jiǎndān de huódòngdù cèshì, zài kāishǐ lìliàng xùnliàn.', english: 'The coach decides to do a simple mobility assessment before starting strength training.' },
      { id: 'fs5', hanzi: '今天的目标不是练到很累，而是找到一个好的起点。', pinyin: 'Jīntiān de mùbiāo bú shì liàn dào hěn lèi, érshì zhǎodào yí ge hǎo de qǐdiǎn.', english: 'Today’s goal is not to train to exhaustion, but to find a good starting point.' },
    ], question: 'Why does the coach begin with a mobility assessment?', answers: ['The client asked for cardio', 'The client mentioned tight shoulders', 'The gym is closing'], correctAnswer: 1,
  },
  {
    id: 'hyrox-morning', title: 'Before a HYROX session', chineseTitle: '混合体能训练之前', level: 'HSK 3', minutes: 6,
    description: 'Read about pacing, effort, and adjusting a hard session.', tags: ['hyrox', 'performance', 'recovery'],
    lines: [
      { id: 'hm1', hanzi: '马里奥今天计划做一次高强度的混合体能训练。', pinyin: 'Mǎlǐ’ào jīntiān jìhuà zuò yí cì gāo qiángdù de hùnhé tǐnéng xùnliàn.', english: 'Mario plans a high-intensity hybrid fitness session today.' },
      { id: 'hm2', hanzi: '热身以后，他发现双腿比平时更重。', pinyin: 'Rèshēn yǐhòu, tā fāxiàn shuāngtuǐ bǐ píngshí gèng zhòng.', english: 'After warming up, he notices his legs feel heavier than usual.' },
      { id: 'hm3', hanzi: '教练问他昨晚睡了多久，昨天有没有跑步。', pinyin: 'Jiàoliàn wèn tā zuówǎn shuì le duōjiǔ, zuótiān yǒu méiyǒu pǎobù.', english: 'The coach asks how long he slept and whether he ran yesterday.' },
      { id: 'hm4', hanzi: '最后，他们把速度降了一点，但是保持了训练质量。', pinyin: 'Zuìhòu, tāmen bǎ sùdù jiàng le yìdiǎn, dànshì bǎochí le xùnliàn zhìliàng.', english: 'In the end, they reduce the speed a little but maintain training quality.' },
    ], question: 'What did they change?', answers: ['They trained faster', 'They reduced speed', 'They cancelled all training'], correctAnswer: 1,
  },
  {
    id: 'climbing-shoulder', title: 'A climber’s shoulder', chineseTitle: '攀岩者的肩膀', level: 'HSK 3–4 bridge', minutes: 7,
    description: 'A nuanced client conversation about discomfort and load.', tags: ['climbing', 'shoulder', 'coaching'],
    lines: [
      { id: 'cs1', hanzi: '肯特的客户很喜欢攀岩，但最近抬手时肩膀不太舒服。', pinyin: 'Kěntè de kèhù hěn xǐhuan pānyán, dàn zuìjìn táishǒu shí jiānbǎng bú tài shūfu.', english: 'Kent’s client loves climbing, but recently the shoulder feels uncomfortable when lifting the arm.' },
      { id: 'cs2', hanzi: '肯特没有马上告诉他答案，而是先问疼痛什么时候开始。', pinyin: 'Kěntè méiyǒu mǎshàng gàosu tā dá’àn, érshì xiān wèn téngtòng shénme shíhou kāishǐ.', english: 'Kent does not immediately give an answer; he first asks when the pain began.' },
      { id: 'cs3', hanzi: '他们测试了几个动作，也比较了左右两边。', pinyin: 'Tāmen cèshì le jǐ ge dòngzuò, yě bǐjiào le zuǒyòu liǎngbiān.', english: 'They test several movements and compare the two sides.' },
      { id: 'cs4', hanzi: '今天先减少训练量，观察二十四小时后的反应。', pinyin: 'Jīntiān xiān jiǎnshǎo xùnliànliàng, guānchá èrshísì xiǎoshí hòu de fǎnyìng.', english: 'Today they first reduce training volume and observe the response after twenty-four hours.' },
    ], question: 'What is the immediate plan?', answers: ['Add more volume', 'Ignore the shoulder', 'Reduce volume and observe'], correctAnswer: 2,
  },
]

stories.push(...extraStories)

export const scenarios: Scenario[] = [
  {
    id: 'check-in', title: 'The client feels tired', chineseTitle: '客户今天很累', level: 'Guided', setting: 'At the start of a session',
    description: 'Find out what is going on and propose an appropriate adjustment.',
    coachOpening: { hanzi: '教练，我今天有点累，腿也很重。', pinyin: 'Jiàoliàn, wǒ jīntiān yǒudiǎn lèi, tuǐ yě hěn zhòng.', english: 'Coach, I am a little tired today and my legs feel heavy.' },
    suggestedReplies: [
      { hanzi: '你昨晚睡了多久？', pinyin: 'Nǐ zuówǎn shuì le duōjiǔ?', english: 'How long did you sleep last night?' },
      { hanzi: '我们先热身，再看情况调整。', pinyin: 'Wǒmen xiān rèshēn, zài kàn qíngkuàng tiáozhěng.', english: "Let's warm up first, then adjust." },
    ], targetTerms: ['睡', '热身', '调整', '感觉', '腿'],
  },
  {
    id: 'teach-squat', title: 'Teach a first squat', chineseTitle: '第一次教深蹲', level: 'Open', setting: 'On the training floor',
    description: 'Give one instruction at a time, check understanding, and reinforce success.',
    coachOpening: { hanzi: '我深蹲的时候，总觉得不太稳。', pinyin: 'Wǒ shēndūn de shíhou, zǒng juéde bú tài wěn.', english: 'When I squat, I always feel a bit unstable.' },
    suggestedReplies: [
      { hanzi: '先把脚踩稳，然后慢慢往下。', pinyin: 'Xiān bǎ jiǎo cǎi wěn, ránhòu mànmàn wǎng xià.', english: 'First plant your feet, then slowly move down.' },
      { hanzi: '很好，再做一次。', pinyin: 'Hěn hǎo, zài zuò yí cì.', english: 'Very good, do it once more.' },
    ], targetTerms: ['脚', '稳', '慢', '深蹲', '再做'],
  },
  {
    id: 'goal-review', title: 'Monthly progress review', chineseTitle: '每月进度回顾', level: 'Open', setting: 'After a training session',
    description: 'Help a client notice progress and set the next meaningful target.',
    coachOpening: { hanzi: '我觉得自己进步不够快。', pinyin: 'Wǒ juéde zìjǐ jìnbù bú gòu kuài.', english: "I don't think I'm improving fast enough." },
    suggestedReplies: [
      { hanzi: '你觉得哪个方面进步最明显？', pinyin: 'Nǐ juéde nǎge fāngmiàn jìnbù zuì míngxiǎn?', english: 'Which area do you think has improved most clearly?' },
      { hanzi: '你的动作比上个月稳定多了。', pinyin: 'Nǐ de dòngzuò bǐ shàng ge yuè wěndìng duō le.', english: 'Your movement is much more stable than last month.' },
    ], targetTerms: ['进步', '明显', '稳定', '目标', '上个月'],
  },
]

scenarios.push(...extraScenarios)

export const reviewCards: ReviewCard[] = lessons.flatMap((lesson, lessonIndex) =>
  lesson.phrases.map((phrase, phraseIndex) => ({
    ...phrase,
    id: `${lesson.id}-${phraseIndex}`,
    type: phraseIndex === 0 && lessonIndex % 2 === 0 ? 'listening' : 'phrase',
    context: lesson.title,
  } as ReviewCard)),
)

export const placementQuestions = [
  { prompt: 'Choose the best meaning: 我们先热身。', answers: ['We should rest first.', 'Let’s warm up first.', 'We trained yesterday.'], correct: 1 },
  { prompt: 'Complete: 你今天感觉___？', answers: ['怎么', '怎么样', '什么样了的'], correct: 1 },
  { prompt: 'What does 调整 mean here: 根据你的状态调整训练。', answers: ['to cancel', 'to adjust', 'to remember'], correct: 1 },
  { prompt: 'Choose the natural sentence.', answers: ['我昨天睡得不太好。', '我昨天不太好睡得。', '昨天我得睡不太好。'], correct: 0 },
  { prompt: 'Which character is most connected to speech?', answers: ['清', '请', '晴'], correct: 1 },
]
