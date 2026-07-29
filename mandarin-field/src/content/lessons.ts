import type { Lesson } from '../types'

export const extraLessons: Lesson[] = [
  {
    id: 'train-travel', eyebrow: 'DAILY LIFE 01', title: 'Navigate a train journey', chineseTitle: '坐火车出行', duration: 10, level: 'HSK 3', accent: '#466b73',
    outcome: 'Find the platform, confirm your carriage, and handle a seat question.',
    mission: 'On your next journey, read the carriage and seat information aloud in Mandarin.',
    phrases: [
      { hanzi: '请问，去杭州的火车在哪个站台？', pinyin: 'Qǐngwèn, qù Hángzhōu de huǒchē zài nǎge zhàntái?', english: 'Excuse me, which platform is the train to Hangzhou on?' },
      { hanzi: '我的座位在八号车厢。', pinyin: 'Wǒ de zuòwèi zài bā hào chēxiāng.', english: 'My seat is in carriage eight.' },
      { hanzi: '这个座位有人吗？', pinyin: 'Zhège zuòwèi yǒu rén ma?', english: 'Is someone sitting in this seat?' },
      { hanzi: '下一站还有多长时间？', pinyin: 'Xià yí zhàn hái yǒu duō cháng shíjiān?', english: 'How long is it until the next stop?' },
    ],
  },
  {
    id: 'restaurant-order', eyebrow: 'DAILY LIFE 02', title: 'Order food naturally', chineseTitle: '自然地点菜', duration: 9, level: 'HSK 3', accent: '#b5654d',
    outcome: 'Ask for recommendations, adjust a dish, and settle the bill.',
    mission: 'Order one complete meal in Mandarin and ask one follow-up question.',
    phrases: [
      { hanzi: '你们这里有什么推荐的菜？', pinyin: 'Nǐmen zhèlǐ yǒu shénme tuījiàn de cài?', english: 'What dishes do you recommend here?' },
      { hanzi: '这个菜可以少放一点辣吗？', pinyin: 'Zhège cài kěyǐ shǎo fàng yìdiǎn là ma?', english: 'Could you make this dish a little less spicy?' },
      { hanzi: '我们再要一碗米饭。', pinyin: 'Wǒmen zài yào yì wǎn mǐfàn.', english: 'We would also like another bowl of rice.' },
      { hanzi: '麻烦买单，可以开发票吗？', pinyin: 'Máfan mǎidān, kěyǐ kāi fāpiào ma?', english: 'Could we have the bill, please? Can you issue a receipt?' },
    ],
  },
  {
    id: 'directions-transport', eyebrow: 'DAILY LIFE 03', title: 'Ask for directions', chineseTitle: '问路和打车', duration: 9, level: 'HSK 3', accent: '#766350',
    outcome: 'Understand landmarks, turns, and simple taxi directions.',
    mission: 'Ask for a nearby place and repeat the directions back for confirmation.',
    phrases: [
      { hanzi: '地铁站离这里远吗？', pinyin: 'Dìtiě zhàn lí zhèlǐ yuǎn ma?', english: 'Is the metro station far from here?' },
      { hanzi: '一直往前走，然后在路口左转。', pinyin: 'Yìzhí wǎng qián zǒu, ránhòu zài lùkǒu zuǒzhuǎn.', english: 'Go straight ahead, then turn left at the intersection.' },
      { hanzi: '请在前面的便利店停一下。', pinyin: 'Qǐng zài qiánmiàn de biànlìdiàn tíng yíxià.', english: 'Please stop at the convenience store ahead.' },
      { hanzi: '你的意思是过马路以后右转，对吗？', pinyin: 'Nǐ de yìsi shì guò mǎlù yǐhòu yòuzhuǎn, duì ma?', english: 'You mean turn right after crossing the road, correct?' },
    ],
  },
  {
    id: 'social-small-talk', eyebrow: 'DAILY LIFE 04', title: 'Keep small talk moving', chineseTitle: '把日常聊天聊下去', duration: 10, level: 'HSK 3', accent: '#867548',
    outcome: 'Move beyond one-word answers when meeting someone or chatting with a client.',
    mission: 'Ask two natural follow-up questions instead of changing back to English.',
    phrases: [
      { hanzi: '你最近除了工作还在忙什么？', pinyin: 'Nǐ zuìjìn chúle gōngzuò hái zài máng shénme?', english: 'What have you been busy with lately besides work?' },
      { hanzi: '听起来很有意思，你怎么开始的？', pinyin: 'Tīng qǐlai hěn yǒuyìsi, nǐ zěnme kāishǐ de?', english: 'That sounds interesting. How did you get started?' },
      { hanzi: '我也有类似的经历。', pinyin: 'Wǒ yě yǒu lèisì de jīnglì.', english: 'I have had a similar experience.' },
      { hanzi: '有机会的话，我们可以一起去。', pinyin: 'Yǒu jīhuì de huà, wǒmen kěyǐ yìqǐ qù.', english: 'If we get the chance, we can go together.' },
    ],
  },
  {
    id: 'compare-change', eyebrow: 'HSK 3 GRAMMAR 01', title: 'Compare progress and change', chineseTitle: '比较和变化', duration: 11, level: 'HSK 3', accent: '#3f7782',
    outcome: 'Use 比, 更, 没有, and change-of-state 了 to describe progress accurately.',
    mission: 'Describe two ways a client is different from last month.',
    phrases: [
      { hanzi: '你今天的动作比上周稳定。', pinyin: 'Nǐ jīntiān de dòngzuò bǐ shàng zhōu wěndìng.', english: 'Your movement is more stable today than last week.' },
      { hanzi: '这个重量没有上次那么重。', pinyin: 'Zhège zhòngliàng méiyǒu shàng cì nàme zhòng.', english: 'This weight is not as heavy as last time.' },
      { hanzi: '你的呼吸控制得越来越好了。', pinyin: 'Nǐ de hūxī kòngzhì de yuèláiyuè hǎo le.', english: 'Your breathing control is getting better and better.' },
      { hanzi: '现在你可以做得更深一点。', pinyin: 'Xiànzài nǐ kěyǐ zuò de gèng shēn yìdiǎn.', english: 'Now you can go a little deeper.' },
    ],
  },
  {
    id: 'sequence-actions', eyebrow: 'HSK 3 GRAMMAR 02', title: 'Explain a sequence clearly', chineseTitle: '把步骤说清楚', duration: 10, level: 'HSK 3', accent: '#715b82',
    outcome: 'Connect steps with 先, 再, 然后, and 最后.',
    mission: 'Explain a three-step warm-up entirely in Mandarin.',
    phrases: [
      { hanzi: '我们先做活动度，再开始力量训练。', pinyin: 'Wǒmen xiān zuò huódòngdù, zài kāishǐ lìliàng xùnliàn.', english: 'We will do mobility first, then begin strength training.' },
      { hanzi: '先吸气，然后慢慢往下蹲。', pinyin: 'Xiān xīqì, ránhòu mànmàn wǎng xià dūn.', english: 'Inhale first, then slowly squat down.' },
      { hanzi: '做完这一组以后休息一分钟。', pinyin: 'Zuòwán zhè yì zǔ yǐhòu xiūxi yì fēnzhōng.', english: 'Rest for one minute after finishing this set.' },
      { hanzi: '最后我们会记录今天的结果。', pinyin: 'Zuìhòu wǒmen huì jìlù jīntiān de jiéguǒ.', english: 'Finally, we will record today’s result.' },
    ],
  },
  {
    id: 'reasons-results', eyebrow: 'HSK 3 GRAMMAR 03', title: 'Give reasons and results', chineseTitle: '说明原因和结果', duration: 10, level: 'HSK 3', accent: '#a66b38',
    outcome: 'Connect a client’s condition to a training decision.',
    mission: 'Explain one program adjustment using 因为…所以… and one using 因此.',
    phrases: [
      { hanzi: '因为你昨晚没睡好，所以今天降低一点强度。', pinyin: 'Yīnwèi nǐ zuówǎn méi shuì hǎo, suǒyǐ jīntiān jiàngdī yìdiǎn qiángdù.', english: 'Because you did not sleep well, we will lower the intensity a little today.' },
      { hanzi: '你的肩膀还有点不舒服，因此我们先换一个动作。', pinyin: 'Nǐ de jiānbǎng hái yǒudiǎn bù shūfu, yīncǐ wǒmen xiān huàn yí ge dòngzuò.', english: 'Your shoulder is still a little uncomfortable, so we will change the movement first.' },
      { hanzi: '只要动作稳定，就可以慢慢增加重量。', pinyin: 'Zhǐyào dòngzuò wěndìng, jiù kěyǐ mànmàn zēngjiā zhòngliàng.', english: 'As long as the movement is stable, we can gradually increase the weight.' },
      { hanzi: '如果疼痛增加，我们就马上停下来。', pinyin: 'Rúguǒ téngtòng zēngjiā, wǒmen jiù mǎshàng tíng xiàlai.', english: 'If the pain increases, we will stop immediately.' },
    ],
  },
  {
    id: 'clarify-repair', eyebrow: 'HSK 3 GRAMMAR 04', title: 'Repair a misunderstanding', chineseTitle: '没听懂也能继续', duration: 9, level: 'HSK 3', accent: '#4e6f62',
    outcome: 'Ask for repetition, confirm meaning, and keep speaking without panic.',
    mission: 'Use a clarification phrase before reaching for English.',
    phrases: [
      { hanzi: '不好意思，你可以再说一遍吗？', pinyin: 'Bù hǎoyìsi, nǐ kěyǐ zài shuō yí biàn ma?', english: 'Sorry, could you say that again?' },
      { hanzi: '你可以说慢一点吗？', pinyin: 'Nǐ kěyǐ shuō màn yìdiǎn ma?', english: 'Could you speak a little more slowly?' },
      { hanzi: '你的意思是今天不想跑步，对吗？', pinyin: 'Nǐ de yìsi shì jīntiān bù xiǎng pǎobù, duì ma?', english: 'You mean you do not want to run today, correct?' },
      { hanzi: '这个词我不太懂，可以换一种说法吗？', pinyin: 'Zhège cí wǒ bú tài dǒng, kěyǐ huàn yì zhǒng shuōfǎ ma?', english: 'I do not quite understand this word. Could you say it another way?' },
    ],
  },
  {
    id: 'recovery-readiness', eyebrow: 'COACHING LANGUAGE 03', title: 'Assess readiness and recovery', chineseTitle: '了解恢复和状态', duration: 12, level: 'HSK 3→4', accent: '#2f675f',
    outcome: 'Ask enough follow-up questions to make a responsible training decision.',
    mission: 'Run a two-minute readiness check without asking a leading question.',
    phrases: [
      { hanzi: '如果十分是状态最好，你今天给自己打几分？', pinyin: 'Rúguǒ shí fēn shì zhuàngtài zuì hǎo, nǐ jīntiān gěi zìjǐ dǎ jǐ fēn?', english: 'If ten is your best condition, what score would you give yourself today?' },
      { hanzi: '除了睡眠以外，还有什么影响了你的状态？', pinyin: 'Chúle shuìmián yǐwài, hái yǒu shénme yǐngxiǎng le nǐ de zhuàngtài?', english: 'Besides sleep, what else has affected your condition?' },
      { hanzi: '这种疲劳是全身的，还是某个部位的？', pinyin: 'Zhè zhǒng píláo shì quánshēn de, háishì mǒu ge bùwèi de?', english: 'Is this fatigue throughout your body or in one particular area?' },
      { hanzi: '我们先看热身时的反应，再决定今天的强度。', pinyin: 'Wǒmen xiān kàn rèshēn shí de fǎnyìng, zài juédìng jīntiān de qiángdù.', english: 'We will first observe your response during the warm-up, then decide today’s intensity.' },
    ],
  },
  {
    id: 'adjust-load', eyebrow: 'COACHING LANGUAGE 04', title: 'Adjust load without losing the goal', chineseTitle: '调整负荷但保留目标', duration: 12, level: 'HSK 3→4', accent: '#8a6838',
    outcome: 'Explain why an easier variation can still serve the session goal.',
    mission: 'Offer a client two useful alternatives and explain the tradeoff.',
    phrases: [
      { hanzi: '我们可以减轻重量，但保持同样的动作。', pinyin: 'Wǒmen kěyǐ jiǎnqīng zhòngliàng, dàn bǎochí tóngyàng de dòngzuò.', english: 'We can reduce the weight while keeping the same movement.' },
      { hanzi: '另一个选择是减少次数，提高动作质量。', pinyin: 'Lìng yí ge xuǎnzé shì jiǎnshǎo cìshù, tígāo dòngzuò zhìliàng.', english: 'Another option is to reduce the repetitions and improve movement quality.' },
      { hanzi: '今天的重点是控制，不是做到最重。', pinyin: 'Jīntiān de zhòngdiǎn shì kòngzhì, bú shì zuò dào zuì zhòng.', english: 'Today’s focus is control, not lifting as heavy as possible.' },
      { hanzi: '这样调整以后，我们还是能达到训练目的。', pinyin: 'Zhèyàng tiáozhěng yǐhòu, wǒmen háishi néng dádào xùnliàn mùdì.', english: 'After this adjustment, we can still achieve the training purpose.' },
    ],
  },
  {
    id: 'pain-history', eyebrow: 'COACHING LANGUAGE 05', title: 'Take a simple symptom history', chineseTitle: '询问不舒服的情况', duration: 13, level: 'HSK 3→4', accent: '#9b554c',
    outcome: 'Clarify onset, behavior, intensity, and relevant context without diagnosing.',
    mission: 'Ask four neutral symptom questions and summarize what you heard.',
    phrases: [
      { hanzi: '这个不舒服是什么时候开始的？', pinyin: 'Zhège bù shūfu shì shénme shíhou kāishǐ de?', english: 'When did this discomfort begin?' },
      { hanzi: '什么动作会让它更明显？', pinyin: 'Shénme dòngzuò huì ràng tā gèng míngxiǎn?', english: 'What movements make it more noticeable?' },
      { hanzi: '休息以后会不会好一点？', pinyin: 'Xiūxi yǐhòu huì bú huì hǎo yìdiǎn?', english: 'Does it feel any better after resting?' },
      { hanzi: '如果症状继续或者加重，建议你去看医生。', pinyin: 'Rúguǒ zhèngzhuàng jìxù huòzhě jiāzhòng, jiànyì nǐ qù kàn yīshēng.', english: 'If the symptoms continue or worsen, I recommend seeing a doctor.' },
    ],
  },
  {
    id: 'upper-body-cues', eyebrow: 'COACHING LANGUAGE 06', title: 'Coach upper-body control', chineseTitle: '上肢动作口令', duration: 11, level: 'HSK 3→4', accent: '#52668c',
    outcome: 'Cue pulling, pressing, shoulder position, and breathing concisely.',
    mission: 'Coach one upper-body set using no more than three short cues.',
    phrases: [
      { hanzi: '肩膀放松，不要耸起来。', pinyin: 'Jiānbǎng fàngsōng, bú yào sǒng qǐlai.', english: 'Relax your shoulders; do not shrug them up.' },
      { hanzi: '手肘往后拉，胸口保持打开。', pinyin: 'Shǒuzhǒu wǎng hòu lā, xiōngkǒu bǎochí dǎkāi.', english: 'Pull your elbows back and keep your chest open.' },
      { hanzi: '推的时候不要让腰向前弯。', pinyin: 'Tuī de shíhou bú yào ràng yāo xiàng qián wān.', english: 'Do not let your lower back bend forward as you press.' },
      { hanzi: '动作范围以没有疼痛为标准。', pinyin: 'Dòngzuò fànwéi yǐ méiyǒu téngtòng wéi biāozhǔn.', english: 'Use a pain-free range of motion as the standard.' },
    ],
  },
  {
    id: 'running-pace', eyebrow: 'PERFORMANCE LANGUAGE 01', title: 'Coach running pace', chineseTitle: '控制跑步节奏', duration: 11, level: 'HSK 3→4', accent: '#b27432',
    outcome: 'Explain pace, breathing, and effort across a running session.',
    mission: 'Give a runner one pace target and one effort-based backup target.',
    phrases: [
      { hanzi: '前十分钟不要太快，先找到稳定的节奏。', pinyin: 'Qián shí fēnzhōng bú yào tài kuài, xiān zhǎodào wěndìng de jiézòu.', english: 'Do not go too fast in the first ten minutes; find a stable rhythm first.' },
      { hanzi: '现在的速度应该可以让你说短句。', pinyin: 'Xiànzài de sùdù yīnggāi kěyǐ ràng nǐ shuō duǎnjù.', english: 'At this pace you should still be able to speak short sentences.' },
      { hanzi: '如果呼吸乱了，就把速度降下来。', pinyin: 'Rúguǒ hūxī luàn le, jiù bǎ sùdù jiàng xiàlai.', english: 'If your breathing loses rhythm, lower the pace.' },
      { hanzi: '最后一公里再根据感觉加速。', pinyin: 'Zuìhòu yì gōnglǐ zài gēnjù gǎnjué jiāsù.', english: 'Accelerate in the final kilometer based on how you feel.' },
    ],
  },
  {
    id: 'climbing-movement', eyebrow: 'PERFORMANCE LANGUAGE 02', title: 'Discuss climbing movement', chineseTitle: '讨论攀岩动作', duration: 12, level: 'HSK 3→4', accent: '#566b54',
    outcome: 'Describe foot placement, balance, grip, and route strategy.',
    mission: 'Explain one climbing move using position, direction, and timing.',
    phrases: [
      { hanzi: '先把重心移到左脚，再伸右手。', pinyin: 'Xiān bǎ zhòngxīn yí dào zuǒ jiǎo, zài shēn yòu shǒu.', english: 'Shift your center of mass to the left foot before reaching with the right hand.' },
      { hanzi: '这个点不用抓得太紧。', pinyin: 'Zhège diǎn bú yòng zhuā de tài jǐn.', english: 'You do not need to grip this hold too tightly.' },
      { hanzi: '如果脚踩得更准，手臂会轻松很多。', pinyin: 'Rúguǒ jiǎo cǎi de gèng zhǔn, shǒubì huì qīngsōng hěn duō.', english: 'If your foot placement is more precise, your arms will feel much easier.' },
      { hanzi: '先观察路线，不要急着开始。', pinyin: 'Xiān guānchá lùxiàn, bú yào jízhe kāishǐ.', english: 'Observe the route first; do not rush to start.' },
    ],
  },
  {
    id: 'motivation-adherence', eyebrow: 'RELATIONSHIP LANGUAGE 02', title: 'Respond to low motivation', chineseTitle: '面对动力不足', duration: 12, level: 'HSK 4 bridge', accent: '#8c594f',
    outcome: 'Explore barriers and agree on a smaller, realistic action.',
    mission: 'Ask what made training difficult before offering advice.',
    phrases: [
      { hanzi: '最近是什么让你很难坚持训练？', pinyin: 'Zuìjìn shì shénme ràng nǐ hěn nán jiānchí xùnliàn?', english: 'What has made it difficult to train consistently lately?' },
      { hanzi: '你觉得现在最大的困难是什么？', pinyin: 'Nǐ juéde xiànzài zuì dà de kùnnan shì shénme?', english: 'What do you think is the biggest difficulty right now?' },
      { hanzi: '与其完全不练，不如先做二十分钟。', pinyin: 'Yǔqí wánquán bú liàn, bùrú xiān zuò èrshí fēnzhōng.', english: 'Rather than not training at all, it would be better to do twenty minutes first.' },
      { hanzi: '我们把计划改得更容易执行一些。', pinyin: 'Wǒmen bǎ jìhuà gǎi de gèng róngyì zhíxíng yìxiē.', english: 'Let us make the plan a little easier to carry out.' },
    ],
  },
  {
    id: 'explain-program', eyebrow: 'PROFESSIONAL LANGUAGE 01', title: 'Explain the training plan', chineseTitle: '解释训练计划', duration: 13, level: 'HSK 4 bridge', accent: '#355f72',
    outcome: 'Explain how the week is organized and why each part exists.',
    mission: 'Give a two-minute overview of one client’s week in Mandarin.',
    phrases: [
      { hanzi: '这个阶段的主要目标是提高力量和动作稳定性。', pinyin: 'Zhège jiēduàn de zhǔyào mùbiāo shì tígāo lìliàng hé dòngzuò wěndìngxìng.', english: 'The main goal of this phase is to improve strength and movement stability.' },
      { hanzi: '我们把高强度训练安排在恢复比较好的日子。', pinyin: 'Wǒmen bǎ gāo qiángdù xùnliàn ānpái zài huīfù bǐjiào hǎo de rìzi.', english: 'We schedule high-intensity training on days when recovery is better.' },
      { hanzi: '每周的训练量会根据你的反应逐渐增加。', pinyin: 'Měi zhōu de xùnliànliàng huì gēnjù nǐ de fǎnyìng zhújiàn zēngjiā.', english: 'Weekly training volume will gradually increase based on your response.' },
      { hanzi: '如果生活压力变大，我们会及时调整计划。', pinyin: 'Rúguǒ shēnghuó yālì biàn dà, wǒmen huì jíshí tiáozhěng jìhuà.', english: 'If life stress increases, we will adjust the plan promptly.' },
    ],
  },
  {
    id: 'app-guidance', eyebrow: 'PROFESSIONAL LANGUAGE 02', title: 'Guide a client through the app', chineseTitle: '教客户使用应用', duration: 10, level: 'HSK 3→4', accent: '#6a5684',
    outcome: 'Explain where to find a program, record results, and send feedback.',
    mission: 'Demonstrate one complete app flow to a Mandarin-speaking client.',
    phrases: [
      { hanzi: '你可以在首页看到今天的训练。', pinyin: 'Nǐ kěyǐ zài shǒuyè kàndào jīntiān de xùnliàn.', english: 'You can see today’s workout on the home page.' },
      { hanzi: '做完一组以后，把次数和重量记录下来。', pinyin: 'Zuòwán yì zǔ yǐhòu, bǎ cìshù hé zhòngliàng jìlù xiàlai.', english: 'After finishing a set, record the reps and weight.' },
      { hanzi: '如果动作不清楚，可以点开视频。', pinyin: 'Rúguǒ dòngzuò bù qīngchu, kěyǐ diǎnkāi shìpín.', english: 'If the movement is unclear, you can open the video.' },
      { hanzi: '训练结束后，请告诉我难度和身体感觉。', pinyin: 'Xùnliàn jiéshù hòu, qǐng gàosu wǒ nándù hé shēntǐ gǎnjué.', english: 'After training, please tell me the difficulty and how your body felt.' },
    ],
  },
  {
    id: 'professional-followup', eyebrow: 'PROFESSIONAL LANGUAGE 03', title: 'Give a thoughtful follow-up', chineseTitle: '专业地跟进客户', duration: 12, level: 'HSK 4 bridge', accent: '#8a4f46',
    outcome: 'Summarize what happened, reinforce progress, and set a next action.',
    mission: 'Send a three-part follow-up: observation, encouragement, and next step.',
    phrases: [
      { hanzi: '今天你的整体状态比预想的更好。', pinyin: 'Jīntiān nǐ de zhěngtǐ zhuàngtài bǐ yùxiǎng de gèng hǎo.', english: 'Your overall condition today was better than expected.' },
      { hanzi: '虽然减少了重量，但是动作质量提高了。', pinyin: 'Suīrán jiǎnshǎo le zhòngliàng, dànshì dòngzuò zhìliàng tígāo le.', english: 'Although we reduced the weight, movement quality improved.' },
      { hanzi: '接下来两天注意睡眠和肩膀的反应。', pinyin: 'Jiēxiàlai liǎng tiān zhùyì shuìmián hé jiānbǎng de fǎnyìng.', english: 'Over the next two days, pay attention to sleep and how your shoulder responds.' },
      { hanzi: '如果一切正常，下次我们再增加一点训练量。', pinyin: 'Rúguǒ yíqiè zhèngcháng, xià cì wǒmen zài zēngjiā yìdiǎn xùnliànliàng.', english: 'If everything is normal, we will increase the training volume a little next time.' },
    ],
  },
]
