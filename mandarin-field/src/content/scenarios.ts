import type { Scenario } from '../types'

export const extraScenarios: Scenario[] = [
  {
    id: 'train-seat-help', title: 'Find your train seat', chineseTitle: '在火车上找座位', level: 'Guided', setting: 'Boarding a busy train',
    description: 'Confirm the carriage and politely ask someone to move a bag.',
    coachOpening: { hanzi: '不好意思，请问你是坐这里吗？', pinyin: 'Bù hǎoyìsi, qǐngwèn nǐ shì zuò zhèlǐ ma?', english: 'Excuse me, are you sitting here?' },
    suggestedReplies: [
      { hanzi: '我的座位是八号车厢十二号。', pinyin: 'Wǒ de zuòwèi shì bā hào chēxiāng shí’èr hào.', english: 'My seat is number 12 in carriage 8.' },
      { hanzi: '这个包可以放到行李架上吗？', pinyin: 'Zhège bāo kěyǐ fàng dào xínglǐjià shàng ma?', english: 'Could this bag go on the luggage rack?' },
    ], targetTerms: ['座位', '车厢', '行李架', '请问'],
  },
  {
    id: 'restaurant-needs', title: 'Adjust a restaurant order', chineseTitle: '点一份适合自己的菜', level: 'Guided', setting: 'At a busy restaurant',
    description: 'Ask for a recommendation and explain that you want less spice.',
    coachOpening: { hanzi: '您好，现在可以点菜了。', pinyin: 'Nínhǎo, xiànzài kěyǐ diǎncài le.', english: 'Hello, you can order now.' },
    suggestedReplies: [
      { hanzi: '你有什么不太辣的菜可以推荐？', pinyin: 'Nǐ yǒu shénme bú tài là de cài kěyǐ tuījiàn?', english: 'What less-spicy dishes can you recommend?' },
      { hanzi: '这个菜不要花生，可以吗？', pinyin: 'Zhège cài bú yào huāshēng, kěyǐ ma?', english: 'Could this dish be made without peanuts?' },
    ], targetTerms: ['推荐', '不太辣', '不要', '可以吗'],
  },
  {
    id: 'ask-directions', title: 'Recover when you are lost', chineseTitle: '迷路时问清楚', level: 'Guided', setting: 'Outside a metro station',
    description: 'Ask for directions, then confirm the key turn.',
    coachOpening: { hanzi: '你好，你在找什么地方？', pinyin: 'Nǐhǎo, nǐ zài zhǎo shénme dìfang?', english: 'Hello, what place are you looking for?' },
    suggestedReplies: [
      { hanzi: '请问，火车站怎么走？', pinyin: 'Qǐngwèn, huǒchēzhàn zěnme zǒu?', english: 'Excuse me, how do I get to the train station?' },
      { hanzi: '你的意思是在第二个路口左转，对吗？', pinyin: 'Nǐ de yìsi shì zài dì-èr ge lùkǒu zuǒzhuǎn, duì ma?', english: 'You mean turn left at the second intersection, correct?' },
    ], targetTerms: ['怎么走', '路口', '左转', '对吗'],
  },
  {
    id: 'client-knee', title: 'A knee feels uncomfortable', chineseTitle: '客户膝盖不舒服', level: 'Guided', setting: 'During the warm-up',
    description: 'Clarify the feeling and make a safe first adjustment.',
    coachOpening: { hanzi: '我蹲下去的时候右膝有点不舒服。', pinyin: 'Wǒ dūn xiàqu de shíhou yòu xī yǒudiǎn bù shūfu.', english: 'My right knee feels a little uncomfortable when I squat down.' },
    suggestedReplies: [
      { hanzi: '你感觉到的是疼、紧，还是没有力气？', pinyin: 'Nǐ gǎnjué dào de shì téng, jǐn, háishì méiyǒu lìqi?', english: 'Does it feel painful, tight, or weak?' },
      { hanzi: '我们先减小动作范围，看看感觉有没有变化。', pinyin: 'Wǒmen xiān jiǎnxiǎo dòngzuò fànwéi, kànkan gǎnjué yǒu méiyǒu biànhuà.', english: 'Let us reduce the range first and see whether the feeling changes.' },
    ], targetTerms: ['疼', '紧', '范围', '变化'],
  },
  {
    id: 'poor-sleep', title: 'Recovery changed the plan', chineseTitle: '睡眠不好时调整训练', level: 'Open', setting: 'At the session check-in',
    description: 'Ask about poor sleep and explain a sensible intensity adjustment.',
    coachOpening: { hanzi: '我昨晚只睡了五个小时，今天脑子也很累。', pinyin: 'Wǒ zuówǎn zhǐ shuì le wǔ ge xiǎoshí, jīntiān nǎozi yě hěn lèi.', english: 'I only slept five hours last night, and I feel mentally tired today.' },
    suggestedReplies: [
      { hanzi: '除了累以外，身体还有什么感觉？', pinyin: 'Chúle lèi yǐwài, shēntǐ hái yǒu shénme gǎnjué?', english: 'Besides tiredness, how else does your body feel?' },
      { hanzi: '我们先热身，再根据你的反应决定强度。', pinyin: 'Wǒmen xiān rèshēn, zài gēnjù nǐ de fǎnyìng juédìng qiángdù.', english: 'We will warm up first, then decide the intensity based on your response.' },
    ], targetTerms: ['除了', '反应', '决定', '强度'],
  },
  {
    id: 'motivation-barrier', title: 'Training has become inconsistent', chineseTitle: '最近很难坚持', level: 'Open', setting: 'During a monthly review',
    description: 'Explore the barrier before suggesting a smaller plan.',
    coachOpening: { hanzi: '最近工作太忙，我两个星期只练了一次。', pinyin: 'Zuìjìn gōngzuò tài máng, wǒ liǎng ge xīngqī zhǐ liàn le yí cì.', english: 'Work has been too busy lately; I trained only once in two weeks.' },
    suggestedReplies: [
      { hanzi: '你觉得现在最大的困难是时间，还是精力？', pinyin: 'Nǐ juéde xiànzài zuì dà de kùnnan shì shíjiān, háishì jīnglì?', english: 'Is the biggest difficulty time or energy right now?' },
      { hanzi: '我们先把目标改成每次二十分钟，怎么样？', pinyin: 'Wǒmen xiān bǎ mùbiāo gǎi chéng měi cì èrshí fēnzhōng, zěnmeyàng?', english: 'How about changing the goal to twenty minutes each time?' },
    ], targetTerms: ['困难', '时间', '精力', '目标'],
  },
  {
    id: 'session-reschedule', title: 'Reschedule professionally', chineseTitle: '专业地改预约', level: 'Open', setting: 'A client sends a late message',
    description: 'Show understanding, find an alternative, and preserve momentum.',
    coachOpening: { hanzi: '对不起，我公司临时有会，今天不能来训练了。', pinyin: 'Duìbuqǐ, wǒ gōngsī línshí yǒu huì, jīntiān bù néng lái xùnliàn le.', english: 'Sorry, a last-minute meeting came up, so I cannot train today.' },
    suggestedReplies: [
      { hanzi: '没问题，我理解。你这周还有什么时间方便？', pinyin: 'Méi wèntí, wǒ lǐjiě. Nǐ zhè zhōu hái yǒu shénme shíjiān fāngbiàn?', english: 'No problem, I understand. What other time works this week?' },
      { hanzi: '如果时间不够，我可以给你安排一个短一点的居家训练。', pinyin: 'Rúguǒ shíjiān bú gòu, wǒ kěyǐ gěi nǐ ānpái yí ge duǎn yìdiǎn de jūjiā xùnliàn.', english: 'If time is limited, I can arrange a shorter home workout.' },
    ], targetTerms: ['理解', '方便', '安排', '居家训练'],
  },
  {
    id: 'climbing-technique', title: 'Solve a climbing move', chineseTitle: '一起分析攀岩动作', level: 'Open', setting: 'At an indoor climbing wall',
    description: 'Help a climber improve balance without over-gripping.',
    coachOpening: { hanzi: '我每次到这个动作都会掉下来，右手也很快就累了。', pinyin: 'Wǒ měi cì dào zhège dòngzuò dōu huì diào xiàlai, yòu shǒu yě hěn kuài jiù lèi le.', english: 'I fall every time I reach this move, and my right hand gets tired quickly.' },
    suggestedReplies: [
      { hanzi: '先别急着伸手，你觉得重心现在在哪里？', pinyin: 'Xiān bié jízhe shēnshǒu, nǐ juéde zhòngxīn xiànzài zài nǎlǐ?', english: 'Do not rush to reach yet. Where do you feel your center of mass?' },
      { hanzi: '把左脚踩准一点，右手不用抓得那么紧。', pinyin: 'Bǎ zuǒ jiǎo cǎi zhǔn yìdiǎn, yòu shǒu bú yòng zhuā de nàme jǐn.', english: 'Place the left foot more precisely; the right hand does not need to grip so hard.' },
    ], targetTerms: ['重心', '左脚', '抓', '紧'],
  },
  {
    id: 'hyrox-race', title: 'Set a HYROX pace', chineseTitle: '制定比赛节奏', level: 'Open', setting: 'Before a race simulation',
    description: 'Agree on a controlled opening pace and a late-race decision.',
    coachOpening: { hanzi: '我想一开始就跑快一点，不然怕最后时间不够。', pinyin: 'Wǒ xiǎng yì kāishǐ jiù pǎo kuài yìdiǎn, bùrán pà zuìhòu shíjiān bú gòu.', english: 'I want to start faster because I am afraid I will run out of time at the end.' },
    suggestedReplies: [
      { hanzi: '如果前面太快，后面的每一站都会受到影响。', pinyin: 'Rúguǒ qiánmiàn tài kuài, hòumiàn de měi yí zhàn dōu huì shòudào yǐngxiǎng.', english: 'If the opening is too fast, every later station will be affected.' },
      { hanzi: '先保持能控制呼吸的速度，最后再根据感觉加速。', pinyin: 'Xiān bǎochí néng kòngzhì hūxī de sùdù, zuìhòu zài gēnjù gǎnjué jiāsù.', english: 'First maintain a pace with controlled breathing, then accelerate at the end based on feel.' },
    ], targetTerms: ['影响', '保持', '呼吸', '加速'],
  },
  {
    id: 'explain-next-limit', title: 'Explain Next Limit', chineseTitle: '介绍我们的训练理念', level: 'Open', setting: 'Meeting a potential client',
    description: 'Explain raising the floor and ceiling in conversational Mandarin.',
    coachOpening: { hanzi: '你们的训练和普通健身房有什么不一样？', pinyin: 'Nǐmen de xùnliàn hé pǔtōng jiànshēnfáng yǒu shénme bù yíyàng?', english: 'How is your training different from a normal gym?' },
    suggestedReplies: [
      { hanzi: '我们不仅想提高你的最好表现，也想让你每天的状态更稳定。', pinyin: 'Wǒmen bùjǐn xiǎng tígāo nǐ de zuì hǎo biǎoxiàn, yě xiǎng ràng nǐ měitiān de zhuàngtài gèng wěndìng.', english: 'We want not only to improve your best performance, but also make your daily condition more stable.' },
      { hanzi: '我们会根据你的目标、生活和训练数据不断调整计划。', pinyin: 'Wǒmen huì gēnjù nǐ de mùbiāo, shēnghuó hé xùnliàn shùjù búduàn tiáozhěng jìhuà.', english: 'We continually adjust the plan based on your goals, life, and training data.' },
    ], targetTerms: ['不仅', '表现', '稳定', '数据'],
  },
  {
    id: 'app-onboarding', title: 'Teach the app workflow', chineseTitle: '带客户熟悉应用', level: 'Guided', setting: 'After a client signs up',
    description: 'Show how to find the program, watch a video, and record results.',
    coachOpening: { hanzi: '我已经登录了，但是不知道今天应该做什么。', pinyin: 'Wǒ yǐjīng dēnglù le, dànshì bù zhīdào jīntiān yīnggāi zuò shénme.', english: 'I have logged in, but I do not know what to do today.' },
    suggestedReplies: [
      { hanzi: '你先打开首页，这里可以看到今天的训练。', pinyin: 'Nǐ xiān dǎkāi shǒuyè, zhèlǐ kěyǐ kàndào jīntiān de xùnliàn.', english: 'Open the home page first; you can see today’s workout here.' },
      { hanzi: '做完以后记得记录次数、重量和身体感觉。', pinyin: 'Zuòwán yǐhòu jìde jìlù cìshù, zhòngliàng hé shēntǐ gǎnjué.', english: 'Remember to record reps, weight, and how your body felt afterward.' },
    ], targetTerms: ['首页', '看到', '记录', '身体感觉'],
  },
  {
    id: 'refer-client', title: 'Recommend medical follow-up', chineseTitle: '建议客户先去检查', level: 'Open', setting: 'After discussing persistent pain',
    description: 'Explain the boundary of coaching and recommend an assessment calmly.',
    coachOpening: { hanzi: '这个肩膀疼了三个星期，但是我还想继续练。', pinyin: 'Zhège jiānbǎng téng le sān ge xīngqī, dànshì wǒ hái xiǎng jìxù liàn.', english: 'This shoulder has hurt for three weeks, but I still want to keep training.' },
    suggestedReplies: [
      { hanzi: '因为疼痛一直没有改善，我建议你先去看医生。', pinyin: 'Yīnwèi téngtòng yìzhí méiyǒu gǎishàn, wǒ jiànyì nǐ xiān qù kàn yīshēng.', english: 'Because the pain has not improved, I recommend seeing a doctor first.' },
      { hanzi: '检查清楚以后，我们再根据专业意见安排训练。', pinyin: 'Jiǎnchá qīngchu yǐhòu, wǒmen zài gēnjù zhuānyè yìjiàn ānpái xùnliàn.', english: 'After a clear assessment, we can arrange training based on professional advice.' },
    ], targetTerms: ['改善', '建议', '医生', '专业意见'],
  },
]
