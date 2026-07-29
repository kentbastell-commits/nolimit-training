import type { Story } from './types'

export type GlossToken = { text: string; pinyin: string; meaning: string; punctuation?: boolean; fallback?: boolean }

const entries: Array<[string, string, string]> = [
  ['二十四小时', 'èrshísì xiǎoshí', 'twenty-four hours'], ['高强度', 'gāo qiángdù', 'high intensity'],
  ['身体感觉', 'shēntǐ gǎnjué', 'how the body feels'], ['力量训练', 'lìliàng xùnliàn', 'strength training'],
  ['活动度', 'huódòngdù', 'mobility / range of motion'], ['训练质量', 'xùnliàn zhìliàng', 'training quality'],
  ['不太舒服', 'bú tài shūfu', 'not very comfortable'], ['比较了', 'bǐjiào le', 'compared'],
  ['混合体能', 'hùnhé tǐnéng', 'hybrid fitness'], ['第一次', 'dì-yī cì', 'the first time'],
  ['怎么办', 'zěnme bàn', 'what should be done?'], ['为什么', 'wèishénme', 'why'],
  ['怎么样', 'zěnmeyàng', 'how / what it is like'], ['什么时候', 'shénme shíhou', 'when'],
  ['不只是', 'bù zhǐshì', 'not only'], ['越来越', 'yuèláiyuè', 'more and more'],
  ['今天', 'jīntiān', 'today'], ['最近', 'zuìjìn', 'recently'], ['身体', 'shēntǐ', 'body'],
  ['感觉', 'gǎnjué', 'feel / feeling'], ['训练', 'xùnliàn', 'to train / training'], ['教练', 'jiàoliàn', 'coach'],
  ['客户', 'kèhù', 'client'], ['工作', 'gōngzuò', 'work'], ['肩膀', 'jiānbǎng', 'shoulder'],
  ['有点', 'yǒudiǎn', 'a little'], ['而且', 'érqiě', 'moreover / and'], ['睡得', 'shuì de', 'sleep (with degree complement)'],
  ['不太好', 'bú tài hǎo', 'not very good'], ['决定', 'juédìng', 'decide'], ['简单', 'jiǎndān', 'simple'],
  ['测试', 'cèshì', 'test / assess'], ['开始', 'kāishǐ', 'begin'], ['目标', 'mùbiāo', 'goal'],
  ['不是', 'bú shì', 'is not'], ['很累', 'hěn lèi', 'very tired'], ['而是', 'érshì', 'but rather'],
  ['找到', 'zhǎodào', 'find'], ['一个', 'yí ge', 'one / a'], ['好的', 'hǎo de', 'good'],
  ['起点', 'qǐdiǎn', 'starting point'], ['计划', 'jìhuà', 'plan'], ['一次', 'yí cì', 'one time / once'],
  ['热身', 'rèshēn', 'warm up'], ['以后', 'yǐhòu', 'after'], ['发现', 'fāxiàn', 'discover / notice'],
  ['双腿', 'shuāngtuǐ', 'both legs'], ['平时', 'píngshí', 'usually'], ['更重', 'gèng zhòng', 'heavier'],
  ['昨晚', 'zuówǎn', 'last night'], ['多久', 'duōjiǔ', 'how long'], ['昨天', 'zuótiān', 'yesterday'],
  ['有没有', 'yǒu méiyǒu', 'whether or not there is / did'], ['跑步', 'pǎobù', 'run / running'],
  ['最后', 'zuìhòu', 'finally'], ['他们', 'tāmen', 'they'], ['速度', 'sùdù', 'speed'],
  ['降了', 'jiàng le', 'reduced / lowered'], ['一点', 'yìdiǎn', 'a little'], ['但是', 'dànshì', 'but'],
  ['保持', 'bǎochí', 'maintain'], ['喜欢', 'xǐhuan', 'like'], ['攀岩', 'pānyán', 'rock climbing'],
  ['抬手', 'táishǒu', 'raise the arm'], ['没有', 'méiyǒu', 'did not / does not have'],
  ['马上', 'mǎshàng', 'immediately'], ['告诉', 'gàosu', 'tell'], ['答案', 'dá’àn', 'answer'],
  ['先问', 'xiān wèn', 'ask first'], ['疼痛', 'téngtòng', 'pain'], ['几个', 'jǐ ge', 'several'],
  ['动作', 'dòngzuò', 'movement'], ['左右', 'zuǒyòu', 'left and right'], ['两边', 'liǎngbiān', 'both sides'],
  ['减少', 'jiǎnshǎo', 'reduce'], ['训练量', 'xùnliànliàng', 'training volume'], ['观察', 'guānchá', 'observe'],
  ['反应', 'fǎnyìng', 'response / reaction'], ['早上', 'zǎoshang', 'morning'], ['健身房', 'jiànshēnfáng', 'gym'],
  ['深蹲', 'shēndūn', 'squat'], ['稳定', 'wěndìng', 'stable'], ['核心', 'héxīn', 'core'],
  ['呼吸', 'hūxī', 'breathe / breathing'], ['重量', 'zhòngliàng', 'weight / load'], ['合适', 'héshì', 'suitable'],
  ['休息', 'xiūxi', 'rest'], ['恢复', 'huīfù', 'recover / recovery'], ['进步', 'jìnbù', 'progress'],
  ['基础', 'jīchǔ', 'foundation'], ['上限', 'shàngxiàn', 'upper limit / ceiling'], ['下限', 'xiàxiàn', 'lower limit / floor'],
  ['提高', 'tígāo', 'raise / improve'], ['明白', 'míngbai', 'understand'], ['问题', 'wèntí', 'question / problem'],
  ['情况', 'qíngkuàng', 'situation / condition'], ['调整', 'tiáozhěng', 'adjust'], ['注意', 'zhùyì', 'pay attention'],
  ['质量', 'zhìliàng', 'quality'], ['完成', 'wánchéng', 'complete'], ['挑战', 'tiǎozhàn', 'challenge'],
  ['重要', 'zhòngyào', 'important'], ['每天', 'měitiān', 'every day'], ['状态', 'zhuàngtài', 'condition / state'],
  ['应该', 'yīnggāi', 'should'], ['什么', 'shénme', 'what'], ['根据', 'gēnjù', 'according to / based on'],
  ['好好', 'hǎohāo', 'properly / well'], ['更快', 'gèng kuài', 'faster'], ['不一样', 'bù yíyàng', 'different'],
  ['就是', 'jiùshì', 'exactly is / that is'], ['需要', 'xūyào', 'need'], ['并且', 'bìngqiě', 'and / moreover'],
  ['三组', 'sān zǔ', 'three sets'], ['听了', 'tīng le', 'heard / listened'], ['消息', 'xiāoxi', 'message / news'],
  ['一边', 'yìbiān', 'while / one side'], ['一边说', 'yìbiān shuō', 'say while doing something'],
  ['小林', 'Xiǎolín', 'Xiaolin (name)'], ['马里奥', 'Mǎlǐ’ào', 'Mario'], ['肯特', 'Kěntè', 'Kent'],
  ['来', 'lái', 'come'], ['说', 'shuō', 'say'], ['问', 'wèn', 'ask'], ['先', 'xiān', 'first'], ['再', 'zài', 'then / again'],
  ['做', 'zuò', 'do'], ['练', 'liàn', 'practice / train'], ['很', 'hěn', 'very'], ['忙', 'máng', 'busy'],
  ['腿', 'tuǐ', 'leg'], ['重', 'zhòng', 'heavy'], ['手', 'shǒu', 'hand / arm'], ['时', 'shí', 'when / time'],
  ['想', 'xiǎng', 'want / think'], ['在', 'zài', 'at / in'], ['中', 'zhōng', 'within / middle'], ['快', 'kuài', 'fast'],
  ['好', 'hǎo', 'good'], ['都', 'dōu', 'all / both'], ['有', 'yǒu', 'have / there is'], ['让', 'ràng', 'let / make'],
  ['太', 'tài', 'too / extremely'], ['就', 'jiù', 'then / precisely'], ['去', 'qù', 'go'], ['看', 'kàn', 'look / read'],
  ['新', 'xīn', 'new'], ['想要', 'xiǎng yào', 'want'], ['自己', 'zìjǐ', 'oneself'], ['方面', 'fāngmiàn', 'aspect'],
  ['不', 'bù', 'not'], ['要', 'yào', 'want / need to'], ['多', 'duō', 'more / much'], ['更', 'gèng', 'even more'],
  ['候', 'hou', 'part of 时候 (time/when)'], ['降', 'jiàng', 'lower / reduce'], ['们', 'men', 'plural suffix'], ['这', 'zhè', 'this'],
  ['是', 'shì', 'to be / is'], ['紧', 'jǐn', 'tight'], ['到', 'dào', 'reach / to'], ['睡', 'shuì', 'sleep'], ['但', 'dàn', 'but'],
  ['也', 'yě', 'also'], ['了', 'le', 'change/completion particle'], ['的', 'de', 'attributive particle'],
  ['地', 'de', 'adverbial particle'], ['得', 'de', 'degree complement particle'], ['着', 'zhe', 'ongoing-state particle'],
  ['把', 'bǎ', 'disposal construction marker'], ['比', 'bǐ', 'compared with'], ['后', 'hòu', 'after'],
  ['前', 'qián', 'before'], ['和', 'hé', 'and'], ['也要', 'yě yào', 'also need to'], ['可以', 'kěyǐ', 'can / may'],
  ['我', 'wǒ', 'I / me'], ['你', 'nǐ', 'you'], ['他', 'tā', 'he / him'], ['我们', 'wǒmen', 'we / us'],
]

const lexicon = new Map(entries.map(([text, pinyin, meaning]) => [text, { text, pinyin, meaning }]))
const orderedTerms = [...lexicon.keys()].sort((a, b) => b.length - a.length)
const punctuation = new Set('，。？！：“”、；…（）'.split(''))

export function glossLine(line: string): GlossToken[] {
  const tokens: GlossToken[] = []
  let cursor = 0
  while (cursor < line.length) {
    const char = line[cursor]
    if (punctuation.has(char) || /\s/.test(char)) {
      tokens.push({ text: char, pinyin: '', meaning: '', punctuation: true })
      cursor += 1
      continue
    }
    const match = orderedTerms.find((term) => line.startsWith(term, cursor))
    if (match) {
      tokens.push(lexicon.get(match)!)
      cursor += match.length
    } else {
      tokens.push({ text: char, pinyin: 'full line', meaning: 'Use the complete pinyin and translation shown below this line', fallback: true })
      cursor += 1
    }
  }
  return tokens
}

const generatedByTheme: Record<string, Omit<Story, 'id'>> = {
  training: {
    title: 'The weight is not the goal', chineseTitle: '重量不是目标', level: 'HSK 3→4', minutes: 5,
    description: 'A client learns why movement quality comes before adding load.', tags: ['generated', 'training', 'client'],
    lines: [
      { id: 'gt1', hanzi: '今天客户想提高深蹲的重量。', pinyin: 'Jīntiān kèhù xiǎng tígāo shēndūn de zhòngliàng.', english: 'Today the client wants to increase their squat weight.' },
      { id: 'gt2', hanzi: '热身以后，教练发现他的动作不太稳定。', pinyin: 'Rèshēn yǐhòu, jiàoliàn fāxiàn tā de dòngzuò bú tài wěndìng.', english: 'After warming up, the coach notices that his movement is not very stable.' },
      { id: 'gt3', hanzi: '教练说：“今天先不提高重量，我们要保持训练质量。”', pinyin: 'Jiàoliàn shuō: “Jīntiān xiān bù tígāo zhòngliàng, wǒmen yào bǎochí xùnliàn zhìliàng.”', english: 'The coach says, “Today we will not add weight yet. We need to maintain training quality.”' },
      { id: 'gt4', hanzi: '客户完成了三组以后，感觉动作稳定多了。', pinyin: 'Kèhù wánchéng le sān zǔ yǐhòu, gǎnjué dòngzuò wěndìng duō le.', english: 'After completing three sets, the client feels the movement is much more stable.' },
    ], question: 'Why does the coach avoid adding weight?', answers: ['The client is late', 'Movement quality needs work first', 'The gym has no weights'], correctAnswer: 1,
  },
  climbing: {
    title: 'A stronger climbing foundation', chineseTitle: '更稳的攀岩基础', level: 'HSK 3→4', minutes: 5,
    description: 'Kent explains why recovery and foundations support climbing progress.', tags: ['generated', 'climbing', 'recovery'],
    lines: [
      { id: 'gc1', hanzi: '肯特的客户想在攀岩中进步得更快。', pinyin: 'Kěntè de kèhù xiǎng zài pānyán zhōng jìnbù de gèng kuài.', english: 'Kent’s client wants to progress faster in climbing.' },
      { id: 'gc2', hanzi: '但是他最近工作很忙，也没有好好休息。', pinyin: 'Dànshì tā zuìjìn gōngzuò hěn máng, yě méiyǒu hǎohāo xiūxi.', english: 'But recently he has been very busy at work and has not rested well.' },
      { id: 'gc3', hanzi: '肯特说：“提高上限很重要，但是也要提高下限。”', pinyin: 'Kěntè shuō: “Tígāo shàngxiàn hěn zhòngyào, dànshì yě yào tígāo xiàxiàn.”', english: 'Kent says, “Raising the ceiling is important, but we also need to raise the floor.”' },
      { id: 'gc4', hanzi: '他们决定减少今天的训练量，先把基础做得更稳定。', pinyin: 'Tāmen juédìng jiǎnshǎo jīntiān de xùnliànliàng, xiān bǎ jīchǔ zuò de gèng wěndìng.', english: 'They decide to reduce today’s training volume and first make the foundation more stable.' },
    ], question: 'What is limiting the client right now?', answers: ['Equipment', 'Recovery and foundation', 'Climbing interest'], correctAnswer: 1,
  },
  hyrox: {
    title: 'Training fast without rushing', chineseTitle: '快，但不要着急', level: 'HSK 3', minutes: 4,
    description: 'Mario coaches pacing during a demanding mixed session.', tags: ['generated', 'hyrox', 'running'],
    lines: [
      { id: 'gh1', hanzi: '马里奥今天和客户做高强度混合体能训练。', pinyin: 'Mǎlǐ’ào jīntiān hé kèhù zuò gāo qiángdù hùnhé tǐnéng xùnliàn.', english: 'Mario does high-intensity hybrid training with a client today.' },
      { id: 'gh2', hanzi: '客户开始的时候速度太快，很快就感觉很累。', pinyin: 'Kèhù kāishǐ de shíhou sùdù tài kuài, hěn kuài jiù gǎnjué hěn lèi.', english: 'The client starts too quickly and soon feels very tired.' },
      { id: 'gh3', hanzi: '马里奥让他把速度降一点，并且注意呼吸。', pinyin: 'Mǎlǐ’ào ràng tā bǎ sùdù jiàng yìdiǎn, bìngqiě zhùyì hūxī.', english: 'Mario asks him to lower the speed a little and pay attention to breathing.' },
      { id: 'gh4', hanzi: '最后，客户保持了更好的训练质量。', pinyin: 'Zuìhòu, kèhù bǎochí le gèng hǎo de xùnliàn zhìliàng.', english: 'In the end, the client maintains better training quality.' },
    ], question: 'What does Mario change?', answers: ['The client’s shoes', 'The speed and breathing focus', 'The training day'], correctAnswer: 1,
  },
  business: {
    title: 'Explaining the Next Limit idea', chineseTitle: '我们的训练理念', level: 'HSK 3→4', minutes: 6,
    description: 'Explain the company philosophy in clear, conversational Mandarin.', tags: ['generated', 'business', 'philosophy'],
    lines: [
      { id: 'gb1', hanzi: '一个新客户问肯特：“你们的训练有什么不一样？”', pinyin: 'Yí ge xīn kèhù wèn Kěntè: “Nǐmen de xùnliàn yǒu shénme bù yíyàng?”', english: 'A new client asks Kent, “What is different about your training?”' },
      { id: 'gb2', hanzi: '肯特说：“我们的目标不只是提高你的上限。”', pinyin: 'Kěntè shuō: “Wǒmen de mùbiāo bù zhǐshì tígāo nǐ de shàngxiàn.”', english: 'Kent says, “Our goal is not only to raise your ceiling.”' },
      { id: 'gb3', hanzi: '“我们也要提高你的下限，让你每天都有更稳定的身体状态。”', pinyin: '“Wǒmen yě yào tígāo nǐ de xiàxiàn, ràng nǐ měitiān dōu yǒu gèng wěndìng de shēntǐ zhuàngtài.”', english: '“We also want to raise your floor, so your physical condition is more stable every day.”' },
      { id: 'gb4', hanzi: '客户听了以后说：“我明白了，这就是我需要的训练。”', pinyin: 'Kèhù tīng le yǐhòu shuō: “Wǒ míngbai le, zhè jiùshì wǒ xūyào de xùnliàn.”', english: 'After hearing this, the client says, “I understand. This is the training I need.”' },
    ], question: 'What does “raising the floor” mean here?', answers: ['Training only on the floor', 'Building a more stable everyday baseline', 'Avoiding difficult goals'], correctAnswer: 1,
  },
  daily: {
    title: 'A busy morning in Shanghai', chineseTitle: '忙碌的早上', level: 'HSK 3', minutes: 4,
    description: 'A simple daily-life story that builds connected reading speed.', tags: ['generated', 'daily life', 'Shanghai'],
    lines: [
      { id: 'gd1', hanzi: '今天早上，肯特先去健身房训练。', pinyin: 'Jīntiān zǎoshang, Kěntè xiān qù jiànshēnfáng xùnliàn.', english: 'This morning, Kent first goes to the gym to train.' },
      { id: 'gd2', hanzi: '训练以后，他一边休息，一边看客户的消息。', pinyin: 'Xùnliàn yǐhòu, tā yìbiān xiūxi, yìbiān kàn kèhù de xiāoxi.', english: 'After training, he rests while checking client messages.' },
      { id: 'gd3', hanzi: '一个客户问今天应该做什么动作。', pinyin: 'Yí ge kèhù wèn jīntiān yīnggāi zuò shénme dòngzuò.', english: 'A client asks what exercises they should do today.' },
      { id: 'gd4', hanzi: '肯特先问客户身体感觉怎么样，再根据情况调整训练。', pinyin: 'Kěntè xiān wèn kèhù shēntǐ gǎnjué zěnmeyàng, zài gēnjù qíngkuàng tiáozhěng xùnliàn.', english: 'Kent first asks how the client’s body feels, then adjusts training based on the situation.' },
    ], question: 'What does Kent do before adjusting training?', answers: ['He asks how the client feels', 'He goes climbing', 'He adds more weight'], correctAnswer: 0,
  },
}

export const storyThemes = [
  { id: 'training', label: 'Training floor', chinese: '训练' },
  { id: 'climbing', label: 'Climbing', chinese: '攀岩' },
  { id: 'hyrox', label: 'HYROX & running', chinese: '跑步' },
  { id: 'business', label: 'NX Limit & clients', chinese: '工作' },
  { id: 'daily', label: 'Daily life', chinese: '生活' },
]

export function generateStory(theme: string, level: 'HSK 3' | 'HSK 3→4'): Story {
  const source = generatedByTheme[theme] ?? generatedByTheme.training
  return {
    ...source,
    id: `generated-${theme}-${Date.now()}`,
    level,
    title: `${source.title} · New`,
    tags: [...source.tags, level],
  }
}
