import type { Story } from '../types'

export const extraStories: Story[] = [
  {
    id: 'train-seat', title: 'The seat by the window', chineseTitle: '靠窗的座位', level: 'HSK 3', minutes: 5,
    description: 'A simple train conversation about seats, luggage, and arrival time.', tags: ['travel', 'train', 'daily life'],
    lines: [
      { id: 'ts1', hanzi: '李明上车以后，发现自己的座位旁边放着一个大箱子。', pinyin: 'Lǐ Míng shàngchē yǐhòu, fāxiàn zìjǐ de zuòwèi pángbiān fàngzhe yí ge dà xiāngzi.', english: 'After boarding, Li Ming notices a large suitcase beside his seat.' },
      { id: 'ts2', hanzi: '他问旁边的人：“不好意思，这个箱子是你的吗？”', pinyin: 'Tā wèn pángbiān de rén: “Bù hǎoyìsi, zhège xiāngzi shì nǐ de ma?”', english: 'He asks the person beside him, “Excuse me, is this suitcase yours?”' },
      { id: 'ts3', hanzi: '那个人马上把箱子放到行李架上，还帮李明找到了充电的地方。', pinyin: 'Nàge rén mǎshàng bǎ xiāngzi fàng dào xínglǐjià shàng, hái bāng Lǐ Míng zhǎodào le chōngdiàn de dìfang.', english: 'The person immediately puts it on the luggage rack and helps Li Ming find a charging point.' },
      { id: 'ts4', hanzi: '他们看了一下时间，火车还有两个小时才到杭州。', pinyin: 'Tāmen kàn le yíxià shíjiān, huǒchē hái yǒu liǎng ge xiǎoshí cái dào Hángzhōu.', english: 'They check the time; the train will not arrive in Hangzhou for another two hours.' },
    ], question: 'What was beside Li Ming’s seat?', answers: ['A large suitcase', 'A food cart', 'A bicycle'], correctAnswer: 0,
  },
  {
    id: 'wrong-platform', title: 'The platform changed', chineseTitle: '站台换了', level: 'HSK 3', minutes: 5,
    description: 'Follow an announcement and solve a small travel problem.', tags: ['travel', 'listening', 'problem solving'],
    lines: [
      { id: 'wp1', hanzi: '王雪本来在三号站台等车，但是屏幕上的信息突然变了。', pinyin: 'Wáng Xuě běnlái zài sān hào zhàntái děng chē, dànshì píngmù shàng de xìnxī tūrán biàn le.', english: 'Wang Xue was waiting on platform three, but the information on the screen suddenly changed.' },
      { id: 'wp2', hanzi: '广播说，去南京的火车改到六号站台。', pinyin: 'Guǎngbō shuō, qù Nánjīng de huǒchē gǎi dào liù hào zhàntái.', english: 'The announcement says the train to Nanjing has moved to platform six.' },
      { id: 'wp3', hanzi: '她没有完全听清楚，所以请工作人员再说了一遍。', pinyin: 'Tā méiyǒu wánquán tīng qīngchu, suǒyǐ qǐng gōngzuò rényuán zài shuō le yí biàn.', english: 'She did not hear everything clearly, so she asked a staff member to repeat it.' },
      { id: 'wp4', hanzi: '虽然她走得很快，但是上车以后还是先确认了车次。', pinyin: 'Suīrán tā zǒu de hěn kuài, dànshì shàngchē yǐhòu háishi xiān quèrèn le chēcì.', english: 'Although she walked quickly, she still confirmed the train number after boarding.' },
    ], question: 'Why does Wang Xue speak to a staff member?', answers: ['She lost her bag', 'She did not hear the announcement clearly', 'She wants a refund'], correctAnswer: 1,
  },
  {
    id: 'restaurant-choice', title: 'Choosing dinner together', chineseTitle: '一起选晚饭', level: 'HSK 3', minutes: 5,
    description: 'Two friends negotiate spice, vegetables, and what to order.', tags: ['food', 'friends', 'daily life'],
    lines: [
      { id: 'rc1', hanzi: '周末晚上，小陈和朋友去了一家四川餐厅。', pinyin: 'Zhōumò wǎnshang, Xiǎo Chén hé péngyou qù le yì jiā Sìchuān cāntīng.', english: 'On Saturday evening, Xiao Chen and a friend go to a Sichuan restaurant.' },
      { id: 'rc2', hanzi: '朋友很喜欢吃辣，但是小陈最近胃不太舒服。', pinyin: 'Péngyou hěn xǐhuan chī là, dànshì Xiǎo Chén zuìjìn wèi bú tài shūfu.', english: 'The friend loves spicy food, but Xiao Chen’s stomach has not felt good recently.' },
      { id: 'rc3', hanzi: '他们请服务员推荐两个不太辣的菜，还点了一份青菜。', pinyin: 'Tāmen qǐng fúwùyuán tuījiàn liǎng ge bú tài là de cài, hái diǎn le yí fèn qīngcài.', english: 'They ask the server to recommend two dishes that are not very spicy and order some vegetables.' },
      { id: 'rc4', hanzi: '吃完以后，小陈觉得味道不错，而且身体也没有不舒服。', pinyin: 'Chīwán yǐhòu, Xiǎo Chén juéde wèidào búcuò, érqiě shēntǐ yě méiyǒu bù shūfu.', english: 'After eating, Xiao Chen thinks the food tastes good and does not feel uncomfortable.' },
    ], question: 'Why do they order less spicy food?', answers: ['The restaurant has no chili', 'Xiao Chen’s stomach feels uncomfortable', 'The friend dislikes Sichuan food'], correctAnswer: 1,
  },
  {
    id: 'rainy-climb', title: 'The climbing plan changes', chineseTitle: '下雨后的攀岩计划', level: 'HSK 3', minutes: 6,
    description: 'A rainy day forces two climbers to adapt their plan.', tags: ['climbing', 'weather', 'planning'],
    lines: [
      { id: 'rd1', hanzi: '肯特和朋友本来打算周六去户外攀岩。', pinyin: 'Kěntè hé péngyou běnlái dǎsuàn Zhōuliù qù hùwài pānyán.', english: 'Kent and a friend originally planned to climb outdoors on Saturday.' },
      { id: 'rd2', hanzi: '早上开始下大雨，岩壁又湿又滑，不适合攀爬。', pinyin: 'Zǎoshang kāishǐ xià dàyǔ, yánbì yòu shī yòu huá, bù shìhé pānpá.', english: 'It starts raining heavily in the morning, and the rock is wet and slippery.' },
      { id: 'rd3', hanzi: '他们没有取消训练，而是去了室内攀岩馆练技术。', pinyin: 'Tāmen méiyǒu qǔxiāo xùnliàn, érshì qù le shìnèi pānyánguǎn liàn jìshù.', english: 'They do not cancel training; instead, they go to an indoor gym to practice technique.' },
      { id: 'rd4', hanzi: '肯特发现，改变计划不一定会影响训练质量。', pinyin: 'Kěntè fāxiàn, gǎibiàn jìhuà bù yídìng huì yǐngxiǎng xùnliàn zhìliàng.', english: 'Kent realizes that changing the plan does not necessarily reduce training quality.' },
    ], question: 'What do they do instead of climbing outdoors?', answers: ['They rest all day', 'They go running', 'They practice at an indoor climbing gym'], correctAnswer: 2,
  },
  {
    id: 'sleep-experiment', title: 'A one-week sleep experiment', chineseTitle: '一周睡眠实验', level: 'HSK 3→4', minutes: 7,
    description: 'A client tests a small recovery habit and observes the result.', tags: ['recovery', 'habit', 'training'],
    lines: [
      { id: 'se1', hanzi: '刘洋最近训练时总觉得没有力气，尤其是早上的课。', pinyin: 'Liú Yáng zuìjìn xùnliàn shí zǒng juéde méiyǒu lìqi, yóuqí shì zǎoshang de kè.', english: 'Liu Yang often feels low on energy during training, especially in morning sessions.' },
      { id: 'se2', hanzi: '教练发现他每天睡觉以前都会看很久手机。', pinyin: 'Jiàoliàn fāxiàn tā měitiān shuìjiào yǐqián dōu huì kàn hěn jiǔ shǒujī.', english: 'The coach notices that he uses his phone for a long time before sleeping.' },
      { id: 'se3', hanzi: '他们决定做一个星期的实验：晚上十一点以后不再看屏幕。', pinyin: 'Tāmen juédìng zuò yí ge xīngqī de shíyàn: wǎnshang shíyī diǎn yǐhòu bú zài kàn píngmù.', english: 'They decide on a one-week experiment: no screens after 11 p.m.' },
      { id: 'se4', hanzi: '一周以后，刘洋虽然没有睡更久，但是睡眠质量和早上的状态都改善了。', pinyin: 'Yì zhōu yǐhòu, Liú Yáng suīrán méiyǒu shuì gèng jiǔ, dànshì shuìmián zhìliàng hé zǎoshang de zhuàngtài dōu gǎishàn le.', english: 'After a week, he has not slept longer, but his sleep quality and morning readiness have improved.' },
    ], question: 'What habit does Liu Yang change?', answers: ['He stops morning training', 'He avoids screens after 11 p.m.', 'He sleeps at the gym'], correctAnswer: 1,
  },
  {
    id: 'client-cancel', title: 'A last-minute schedule change', chineseTitle: '临时改时间', level: 'HSK 3→4', minutes: 6,
    description: 'A coach handles a cancellation while protecting the relationship.', tags: ['business', 'scheduling', 'client'],
    lines: [
      { id: 'cc1', hanzi: '下午三点，客户发消息说公司突然有会，不能来训练。', pinyin: 'Xiàwǔ sān diǎn, kèhù fā xiāoxi shuō gōngsī tūrán yǒu huì, bù néng lái xùnliàn.', english: 'At 3 p.m., a client messages that a sudden work meeting means they cannot train.' },
      { id: 'cc2', hanzi: '教练先表示理解，然后问客户这周还有什么时间方便。', pinyin: 'Jiàoliàn xiān biǎoshì lǐjiě, ránhòu wèn kèhù zhè zhōu hái yǒu shénme shíjiān fāngbiàn.', english: 'The coach first shows understanding, then asks what other time works this week.' },
      { id: 'cc3', hanzi: '因为双方的时间都很满，他们最后约了周日早上。', pinyin: 'Yīnwèi shuāngfāng de shíjiān dōu hěn mǎn, tāmen zuìhòu yuē le Zhōurì zǎoshang.', english: 'Because both schedules are full, they eventually book Sunday morning.' },
      { id: 'cc4', hanzi: '教练还给客户安排了一个二十分钟的居家训练。', pinyin: 'Jiàoliàn hái gěi kèhù ānpái le yí ge èrshí fēnzhōng de jūjiā xùnliàn.', english: 'The coach also assigns a twenty-minute home workout.' },
    ], question: 'What does the coach provide before the rescheduled session?', answers: ['A home workout', 'A refund', 'A new coach'], correctAnswer: 0,
  },
  {
    id: 'hyrox-pace-plan', title: 'A smarter race plan', chineseTitle: '更聪明的比赛计划', level: 'HSK 3→4', minutes: 7,
    description: 'Mario helps an athlete learn from starting a race too quickly.', tags: ['hyrox', 'running', 'performance'],
    lines: [
      { id: 'hp1', hanzi: '上次比赛时，安娜第一公里跑得太快，后来每一站都越来越慢。', pinyin: 'Shàng cì bǐsài shí, Ānnà dì-yī gōnglǐ pǎo de tài kuài, hòulái měi yí zhàn dōu yuèláiyuè màn.', english: 'In the last race, Anna ran the first kilometer too fast and became slower at every later station.' },
      { id: 'hp2', hanzi: '马里奥和她一起看了数据，发现问题不是力量，而是节奏。', pinyin: 'Mǎlǐ’ào hé tā yìqǐ kàn le shùjù, fāxiàn wèntí bú shì lìliàng, érshì jiézòu.', english: 'Mario reviews the data with her and finds that the problem is pacing, not strength.' },
      { id: 'hp3', hanzi: '新的计划要求她前半段保持能够控制呼吸的速度。', pinyin: 'Xīn de jìhuà yāoqiú tā qián bànduàn bǎochí nénggòu kòngzhì hūxī de sùdù.', english: 'The new plan asks her to maintain a pace that allows controlled breathing in the first half.' },
      { id: 'hp4', hanzi: '她明白了，比赛表现不仅取决于能力，也取决于怎么使用能力。', pinyin: 'Tā míngbai le, bǐsài biǎoxiàn bùjǐn qǔjué yú nénglì, yě qǔjué yú zěnme shǐyòng nénglì.', english: 'She understands that race performance depends not only on ability, but also on how that ability is used.' },
    ], question: 'What is the main problem in Anna’s previous race?', answers: ['Poor pacing', 'Insufficient strength', 'Wrong shoes'], correctAnswer: 0,
  },
  {
    id: 'plateau-conversation', title: 'Progress is not always visible', chineseTitle: '看不见的进步', level: 'HSK 4 bridge', minutes: 8,
    description: 'A coach reframes a client’s frustration with a training plateau.', tags: ['coaching', 'motivation', 'progress'],
    lines: [
      { id: 'pc1', hanzi: '客户觉得最近一个月没有进步，因为深蹲重量没有增加。', pinyin: 'Kèhù juéde zuìjìn yí ge yuè méiyǒu jìnbù, yīnwèi shēndūn zhòngliàng méiyǒu zēngjiā.', english: 'A client feels they have not improved this month because their squat weight has not increased.' },
      { id: 'pc2', hanzi: '教练没有马上反对，而是问：“除了重量，你还注意到什么变化？”', pinyin: 'Jiàoliàn méiyǒu mǎshàng fǎnduì, érshì wèn: “Chúle zhòngliàng, nǐ hái zhùyì dào shénme biànhuà?”', english: 'The coach does not immediately disagree, but asks, “Besides weight, what changes have you noticed?”' },
      { id: 'pc3', hanzi: '客户想了想，发现自己的动作更稳定，训练后也恢复得更快。', pinyin: 'Kèhù xiǎng le xiǎng, fāxiàn zìjǐ de dòngzuò gèng wěndìng, xùnliàn hòu yě huīfù de gèng kuài.', english: 'The client realizes that movement is more stable and recovery after training is faster.' },
      { id: 'pc4', hanzi: '教练解释说，真正的进步包括更多能力，不只是一个数字。', pinyin: 'Jiàoliàn jiěshì shuō, zhēnzhèng de jìnbù bāokuò gèng duō nénglì, bù zhǐshì yí ge shùzì.', english: 'The coach explains that real progress includes more abilities, not just one number.' },
    ], question: 'What progress had the client overlooked?', answers: ['Movement stability and recovery', 'A larger gym', 'More training days'], correctAnswer: 0,
  },
  {
    id: 'app-first-week', title: 'A client’s first week in the app', chineseTitle: '使用应用的第一周', level: 'HSK 3→4', minutes: 7,
    description: 'A new client learns to record training and give useful feedback.', tags: ['app', 'business', 'client'],
    lines: [
      { id: 'af1', hanzi: '新客户第一次打开应用时，不知道从哪里找到今天的训练。', pinyin: 'Xīn kèhù dì-yī cì dǎkāi yìngyòng shí, bù zhīdào cóng nǎlǐ zhǎodào jīntiān de xùnliàn.', english: 'When a new client first opens the app, they do not know where to find today’s workout.' },
      { id: 'af2', hanzi: '教练用视频告诉他怎么进入计划、查看动作和记录重量。', pinyin: 'Jiàoliàn yòng shìpín gàosu tā zěnme jìnrù jìhuà, chákàn dòngzuò hé jìlù zhòngliàng.', english: 'The coach uses a video to show how to enter the program, view movements, and record weight.' },
      { id: 'af3', hanzi: '训练以后，客户写下了难度，还报告了右膝有一点紧。', pinyin: 'Xùnliàn yǐhòu, kèhù xiěxià le nándù, hái bàogào le yòu xī yǒu yìdiǎn jǐn.', english: 'After training, the client records the difficulty and reports a little tightness in the right knee.' },
      { id: 'af4', hanzi: '因为信息很清楚，教练第二天就能及时调整下一次训练。', pinyin: 'Yīnwèi xìnxī hěn qīngchu, jiàoliàn dì-èr tiān jiù néng jíshí tiáozhěng xià yí cì xùnliàn.', english: 'Because the information is clear, the coach can promptly adjust the next session the following day.' },
    ], question: 'Why can the coach adjust the next session?', answers: ['The client gives clear feedback', 'The app chooses randomly', 'The workout was cancelled'], correctAnswer: 0,
  },
  {
    id: 'business-meeting', title: 'Explaining the company in one minute', chineseTitle: '一分钟介绍公司', level: 'HSK 4 bridge', minutes: 8,
    description: 'Kent prepares a concise explanation before a business meeting.', tags: ['business', 'NX Limit', 'speaking'],
    lines: [
      { id: 'bm1', hanzi: '开会以前，肯特想用中文清楚地介绍公司的训练理念。', pinyin: 'Kāihuì yǐqián, Kěntè xiǎng yòng Zhōngwén qīngchu de jièshào gōngsī de xùnliàn lǐniàn.', english: 'Before a meeting, Kent wants to clearly introduce the company’s training philosophy in Chinese.' },
      { id: 'bm2', hanzi: '他没有准备很长的演讲，而是先写下三个最重要的观点。', pinyin: 'Tā méiyǒu zhǔnbèi hěn cháng de yǎnjiǎng, érshì xiān xiěxià sān ge zuì zhòngyào de guāndiǎn.', english: 'He does not prepare a long speech; instead, he writes down the three most important points.' },
      { id: 'bm3', hanzi: '第一，提高客户的能力；第二，让日常状态更稳定；第三，根据真实数据调整计划。', pinyin: 'Dì-yī, tígāo kèhù de nénglì; dì-èr, ràng rìcháng zhuàngtài gèng wěndìng; dì-sān, gēnjù zhēnshí shùjù tiáozhěng jìhuà.', english: 'First, improve client capacity; second, make daily readiness more stable; third, adjust plans using real data.' },
      { id: 'bm4', hanzi: '因为结构简单，他在会议上说得更自然，也能回答对方的问题。', pinyin: 'Yīnwèi jiégòu jiǎndān, tā zài huìyì shàng shuō de gèng zìrán, yě néng huídá duìfāng de wèntí.', english: 'Because the structure is simple, he speaks more naturally and can answer questions in the meeting.' },
    ], question: 'Why does Kent’s explanation work well?', answers: ['It is very long', 'It has a simple three-point structure', 'It avoids questions'], correctAnswer: 1,
  },
  {
    id: 'shoulder-decision', title: 'Knowing when to refer', chineseTitle: '知道什么时候转介', level: 'HSK 4 bridge', minutes: 8,
    description: 'A coach gathers information and recognizes the limit of training advice.', tags: ['health', 'professional', 'shoulder'],
    lines: [
      { id: 'sd1', hanzi: '客户说肩膀已经疼了三个星期，而且晚上也会因为疼痛醒来。', pinyin: 'Kèhù shuō jiānbǎng yǐjīng téng le sān ge xīngqī, érqiě wǎnshang yě huì yīnwèi téngtòng xǐnglái.', english: 'The client says the shoulder has hurt for three weeks and the pain wakes them at night.' },
      { id: 'sd2', hanzi: '教练继续问了疼痛的位置、开始的时间和哪些动作会加重症状。', pinyin: 'Jiàoliàn jìxù wèn le téngtòng de wèizhi, kāishǐ de shíjiān hé nǎxiē dòngzuò huì jiāzhòng zhèngzhuàng.', english: 'The coach asks about the location, onset, and movements that worsen symptoms.' },
      { id: 'sd3', hanzi: '这些信息说明问题可能不适合只靠调整训练来解决。', pinyin: 'Zhèxiē xìnxī shuōmíng wèntí kěnéng bù shìhé zhǐ kào tiáozhěng xùnliàn lái jiějué.', english: 'This information suggests the issue may not be appropriate to solve only by adjusting training.' },
      { id: 'sd4', hanzi: '教练建议客户先找医生检查，再根据专业意见安排训练。', pinyin: 'Jiàoliàn jiànyì kèhù xiān zhǎo yīshēng jiǎnchá, zài gēnjù zhuānyè yìjiàn ānpái xùnliàn.', english: 'The coach recommends seeing a doctor first, then arranging training based on professional advice.' },
    ], question: 'What does the coach recommend?', answers: ['Training through the pain', 'Stopping all activity forever', 'Getting a medical assessment first'], correctAnswer: 2,
  },
  {
    id: 'weekend-trip', title: 'A flexible weekend in Suzhou', chineseTitle: '灵活的苏州周末', level: 'HSK 3', minutes: 6,
    description: 'Plans change, but a short trip still goes well.', tags: ['travel', 'weekend', 'friends'],
    lines: [
      { id: 'wt1', hanzi: '肯特和朋友周六早上坐火车去苏州，本来想先参观花园。', pinyin: 'Kěntè hé péngyou Zhōuliù zǎoshang zuò huǒchē qù Sūzhōu, běnlái xiǎng xiān cānguān huāyuán.', english: 'Kent and a friend take a train to Suzhou on Saturday morning and originally plan to visit a garden first.' },
      { id: 'wt2', hanzi: '到了以后，他们发现买票的人太多，需要等一个小时。', pinyin: 'Dào le yǐhòu, tāmen fāxiàn mǎipiào de rén tài duō, xūyào děng yí ge xiǎoshí.', english: 'After arriving, they find the ticket line is too long and would require an hour’s wait.' },
      { id: 'wt3', hanzi: '朋友建议先去附近喝茶，下午人少一点再回来。', pinyin: 'Péngyou jiànyì xiān qù fùjìn hē chá, xiàwǔ rén shǎo yìdiǎn zài huílai.', english: 'The friend suggests having tea nearby first and returning when it is less crowded.' },
      { id: 'wt4', hanzi: '虽然计划变了，但是他们没有着急，反而过了一个很轻松的上午。', pinyin: 'Suīrán jìhuà biàn le, dànshì tāmen méiyǒu zháojí, fǎn’ér guò le yí ge hěn qīngsōng de shàngwǔ.', english: 'Although the plan changes, they do not rush and instead have a very relaxing morning.' },
    ], question: 'Why do they go for tea first?', answers: ['The garden is closed forever', 'The ticket line is too long', 'They miss the train'], correctAnswer: 1,
  },
  {
    id: 'morning-readiness', title: 'Changing the plan after check-in', chineseTitle: '先看今天的状态', level: 'HSK 3', minutes: 5,
    description: 'A short client check-in changes the focus of a morning session.', tags: ['coaching', 'recovery', 'check-in'],
    lines: [
      { id: 'mr1', hanzi: '早课开始前，教练问客户昨晚睡得怎么样。', pinyin: 'Zǎokè kāishǐ qián, jiàoliàn wèn kèhù zuówǎn shuì de zěnmeyàng.', english: 'Before the morning session, the coach asks how the client slept.' },
      { id: 'mr2', hanzi: '客户说只睡了五个小时，双腿也觉得很重。', pinyin: 'Kèhù shuō zhǐ shuì le wǔ ge xiǎoshí, shuāngtuǐ yě juéde hěn zhòng.', english: 'The client says they slept only five hours and their legs feel heavy.' },
      { id: 'mr3', hanzi: '教练先带他做简单的热身，再观察身体的反应。', pinyin: 'Jiàoliàn xiān dài tā zuò jiǎndān de rèshēn, zài guānchá shēntǐ de fǎnyìng.', english: 'The coach first leads a simple warm-up, then observes the body’s response.' },
      { id: 'mr4', hanzi: '他们最后降低了重量，但是保持了动作质量。', pinyin: 'Tāmen zuìhòu jiàngdī le zhòngliàng, dànshì bǎochí le dòngzuò zhìliàng.', english: 'They eventually lower the load but maintain movement quality.' },
    ], question: 'Why does the coach change the session?', answers: ['The gym is closing', 'The client slept poorly and feels heavy', 'The client forgot their shoes'], correctAnswer: 1,
  },
  {
    id: 'coffee-order', title: 'Fixing the coffee order', chineseTitle: '这杯咖啡不是我的', level: 'HSK 3', minutes: 5,
    description: 'Solve a small mix-up politely in a busy Shanghai café.', tags: ['daily life', 'food', 'Shanghai'],
    lines: [
      { id: 'co1', hanzi: '早上咖啡店里人很多，肯特等了十分钟。', pinyin: 'Zǎoshang kāfēidiàn lǐ rén hěn duō, Kěntè děng le shí fēnzhōng.', english: 'The café is crowded in the morning, and Kent waits ten minutes.' },
      { id: 'co2', hanzi: '店员给了他一杯冰咖啡，但是他点的是热咖啡。', pinyin: 'Diànyuán gěi le tā yì bēi bīng kāfēi, dànshì tā diǎn de shì rè kāfēi.', english: 'The server gives him an iced coffee, but he ordered a hot coffee.' },
      { id: 'co3', hanzi: '他礼貌地说：“不好意思，我点的好像是热的。”', pinyin: 'Tā lǐmào de shuō: “Bù hǎoyìsi, wǒ diǎn de hǎoxiàng shì rè de.”', english: 'He politely says, “Excuse me, I think I ordered a hot one.”' },
      { id: 'co4', hanzi: '店员看了订单，马上重新做了一杯。', pinyin: 'Diànyuán kàn le dìngdān, mǎshàng chóngxīn zuò le yì bēi.', english: 'The server checks the order and immediately makes another cup.' },
    ], question: 'What was wrong with the first drink?', answers: ['It was cold instead of hot', 'It had no coffee', 'It was too large'], correctAnswer: 0,
  },
  {
    id: 'knee-follow-up', title: 'The knee feels different today', chineseTitle: '今天膝盖不一样', level: 'HSK 3→4', minutes: 7,
    description: 'A coach asks precise follow-up questions before choosing an exercise.', tags: ['coaching', 'knee', 'communication'],
    lines: [
      { id: 'kf1', hanzi: '客户热身时说，右膝今天有一点不舒服。', pinyin: 'Kèhù rèshēn shí shuō, yòu xī jīntiān yǒu yìdiǎn bù shūfu.', english: 'During the warm-up, the client says the right knee feels a little uncomfortable today.' },
      { id: 'kf2', hanzi: '教练问这种感觉什么时候开始，走路时会不会出现。', pinyin: 'Jiàoliàn wèn zhè zhǒng gǎnjué shénme shíhou kāishǐ, zǒulù shí huì bú huì chūxiàn.', english: 'The coach asks when it began and whether it appears while walking.' },
      { id: 'kf3', hanzi: '客户说昨天跑步以后开始紧，但是走路没有问题。', pinyin: 'Kèhù shuō zuótiān pǎobù yǐhòu kāishǐ jǐn, dànshì zǒulù méiyǒu wèntí.', english: 'The client says it began feeling tight after yesterday’s run, but walking is fine.' },
      { id: 'kf4', hanzi: '教练选择了一个更容易控制的动作，并请客户随时报告变化。', pinyin: 'Jiàoliàn xuǎnzé le yí ge gèng róngyì kòngzhì de dòngzuò, bìng qǐng kèhù suíshí bàogào biànhuà.', english: 'The coach chooses an easier-to-control movement and asks the client to report any change.' },
    ], question: 'What does the coach do before selecting an exercise?', answers: ['Adds more running', 'Asks when and where symptoms appear', 'Ends the session immediately'], correctAnswer: 1,
  },
  {
    id: 'climbing-fear', title: 'One move above the last bolt', chineseTitle: '再试一次那个动作', level: 'HSK 3→4', minutes: 7,
    description: 'A climber separates fear, technique, and physical effort.', tags: ['climbing', 'confidence', 'technique'],
    lines: [
      { id: 'cf1', hanzi: '小林每次爬到同一个位置都会停下来，因为下一步看起来很远。', pinyin: 'Xiǎolín měi cì pá dào tóng yí ge wèizhi dōu huì tíngxiàlai, yīnwèi xià yí bù kànqǐlai hěn yuǎn.', english: 'Xiaolin stops at the same place each time because the next move looks far away.' },
      { id: 'cf2', hanzi: '朋友让他先不往上爬，只练习把重心移到右脚。', pinyin: 'Péngyou ràng tā xiān bù wǎng shàng pá, zhǐ liànxí bǎ zhòngxīn yí dào yòu jiǎo.', english: 'His friend asks him not to climb upward yet, only to practice shifting weight onto the right foot.' },
      { id: 'cf3', hanzi: '练了三次以后，他发现手不需要那么用力。', pinyin: 'Liàn le sān cì yǐhòu, tā fāxiàn shǒu bù xūyào nàme yònglì.', english: 'After three practices, he realizes his hands do not need to work so hard.' },
      { id: 'cf4', hanzi: '第四次，他先呼吸，再稳定地完成了那个动作。', pinyin: 'Dì-sì cì, tā xiān hūxī, zài wěndìng de wánchéng le nàge dòngzuò.', english: 'On the fourth try, he breathes first and then completes the move steadily.' },
    ], question: 'What technical change helps Xiaolin?', answers: ['Pulling harder with the hands', 'Moving weight onto the right foot', 'Climbing faster'], correctAnswer: 1,
  },
  {
    id: 'team-feedback', title: 'A useful coaching conversation', chineseTitle: '把反馈说清楚', level: 'HSK 4 bridge', minutes: 8,
    description: 'Two coaches discuss feedback without making it personal.', tags: ['business', 'leadership', 'coaching'],
    lines: [
      { id: 'tf1', hanzi: '一节团体课以后，肯特发现课程的节奏有一点乱。', pinyin: 'Yì jié tuántǐ kè yǐhòu, Kěntè fāxiàn kèchéng de jiézòu yǒu yìdiǎn luàn.', english: 'After a group class, Kent notices that the session’s pacing was a little disorganized.' },
      { id: 'tf2', hanzi: '他没有只说“今天不好”，而是先说明自己观察到的具体情况。', pinyin: 'Tā méiyǒu zhǐ shuō “jīntiān bù hǎo”, érshì xiān shuōmíng zìjǐ guānchá dào de jùtǐ qíngkuàng.', english: 'He does not just say “today was bad”; he first explains the specific situation he observed.' },
      { id: 'tf3', hanzi: '两位教练一起讨论了指令、示范和每个环节的时间。', pinyin: 'Liǎng wèi jiàoliàn yìqǐ tǎolùn le zhǐlìng, shìfàn hé měi ge huánjié de shíjiān.', english: 'The two coaches discuss instructions, demonstrations, and the timing of each section.' },
      { id: 'tf4', hanzi: '最后他们只选择一个重点，准备在下一节课中测试。', pinyin: 'Zuìhòu tāmen zhǐ xuǎnzé yí ge zhòngdiǎn, zhǔnbèi zài xià yì jié kè zhōng cèshì.', english: 'Finally, they choose just one priority to test in the next class.' },
    ], question: 'Why is Kent’s feedback useful?', answers: ['It focuses on specific observations', 'It includes many complaints', 'It avoids discussing the class'], correctAnswer: 0,
  },
  {
    id: 'race-recovery', title: 'The day after the race', chineseTitle: '比赛后的第二天', level: 'HSK 3→4', minutes: 7,
    description: 'An athlete chooses recovery based on how the body responds.', tags: ['hyrox', 'recovery', 'decision making'],
    lines: [
      { id: 'rr1', hanzi: '比赛后的第二天，安娜全身很累，但是还是想完成原来的训练。', pinyin: 'Bǐsài hòu de dì-èr tiān, Ānnà quánshēn hěn lèi, dànshì háishi xiǎng wánchéng yuánlái de xùnliàn.', english: 'The day after the race, Anna is tired all over but still wants to complete the original workout.' },
      { id: 'rr2', hanzi: '马里奥请她先走十分钟，然后评价双腿的感觉。', pinyin: 'Mǎlǐ’ào qǐng tā xiān zǒu shí fēnzhōng, ránhòu píngjià shuāngtuǐ de gǎnjué.', english: 'Mario asks her to walk for ten minutes, then assess how her legs feel.' },
      { id: 'rr3', hanzi: '走完以后，身体舒服了一点，但疲劳还是很明显。', pinyin: 'Zǒuwán yǐhòu, shēntǐ shūfu le yìdiǎn, dàn píláo háishi hěn míngxiǎn.', english: 'After walking, her body feels a little better, but the fatigue is still obvious.' },
      { id: 'rr4', hanzi: '他们决定把高强度训练改成轻松活动和早点睡觉。', pinyin: 'Tāmen juédìng bǎ gāo qiángdù xùnliàn gǎi chéng qīngsōng huódòng hé zǎodiǎn shuìjiào.', english: 'They decide to replace high-intensity training with easy activity and an early bedtime.' },
    ], question: 'What replaces the high-intensity workout?', answers: ['Another race', 'Easy activity and more sleep', 'Heavy squats'], correctAnswer: 1,
  },
]
