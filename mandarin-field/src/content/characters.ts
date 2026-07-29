import type { CharacterFamily } from '../types'

export const extraCharacterFamilies: CharacterFamily[] = [
  {
    id: 'fang-family', anchor: '方', sound: 'fāng / fáng / fàng', idea: 'direction / square', hint: '方 gives a strong fāng-family sound clue; the added component narrows the meaning.',
    members: [
      { char: '房', pinyin: 'fáng', meaning: 'room / house', component: '户 door', word: '健身房', wordPinyin: 'jiànshēnfáng', wordMeaning: 'gym' },
      { char: '放', pinyin: 'fàng', meaning: 'put / release', component: '攵 action', word: '放松', wordPinyin: 'fàngsōng', wordMeaning: 'relax' },
      { char: '防', pinyin: 'fáng', meaning: 'guard against', component: '阝 place', word: '预防', wordPinyin: 'yùfáng', wordMeaning: 'prevent' },
      { char: '访', pinyin: 'fǎng', meaning: 'visit / interview', component: '讠 speech', word: '访问', wordPinyin: 'fǎngwèn', wordMeaning: 'visit / interview' },
    ],
  },
  {
    id: 'zhu-family', anchor: '主', sound: 'zhǔ / zhù', idea: 'main / owner', hint: '主 usually carries a zhǔ or zhù sound. Look left to identify the meaning category.',
    members: [
      { char: '住', pinyin: 'zhù', meaning: 'live / stay', component: '亻 person', word: '住在', wordPinyin: 'zhù zài', wordMeaning: 'live at / stay at' },
      { char: '注', pinyin: 'zhù', meaning: 'pour / focus', component: '氵 water', word: '注意', wordPinyin: 'zhùyì', wordMeaning: 'pay attention' },
      { char: '柱', pinyin: 'zhù', meaning: 'pillar', component: '木 wood', word: '柱子', wordPinyin: 'zhùzi', wordMeaning: 'pillar / column' },
      { char: '驻', pinyin: 'zhù', meaning: 'be stationed', component: '马 horse', word: '驻地', wordPinyin: 'zhùdì', wordMeaning: 'station / base' },
    ],
  },
  {
    id: 'ling-family', anchor: '令', sound: 'lǐng / líng / lěng', idea: 'order / command', hint: '令 gives an l-ing or l-eng sound neighborhood across several high-frequency words.',
    members: [
      { char: '领', pinyin: 'lǐng', meaning: 'lead / receive', component: '页 head', word: '带领', wordPinyin: 'dàilǐng', wordMeaning: 'lead / guide' },
      { char: '铃', pinyin: 'líng', meaning: 'bell', component: '钅 metal', word: '门铃', wordPinyin: 'ménlíng', wordMeaning: 'doorbell' },
      { char: '零', pinyin: 'líng', meaning: 'zero', component: '雨 rain', word: '零次', wordPinyin: 'líng cì', wordMeaning: 'zero times' },
      { char: '冷', pinyin: 'lěng', meaning: 'cold', component: '冫 ice', word: '冷静', wordPinyin: 'lěngjìng', wordMeaning: 'calm / cool-headed' },
    ],
  },
  {
    id: 'gong-family', anchor: '工', sound: 'gōng / kōng / hóng', idea: 'work', hint: '工 anchors a broad -ong sound family. The semantic side distinguishes work, air, water, and color.',
    members: [
      { char: '功', pinyin: 'gōng', meaning: 'achievement / effect', component: '力 strength', word: '成功', wordPinyin: 'chénggōng', wordMeaning: 'succeed / success' },
      { char: '空', pinyin: 'kōng', meaning: 'empty / air', component: '穴 cave', word: '空间', wordPinyin: 'kōngjiān', wordMeaning: 'space' },
      { char: '江', pinyin: 'jiāng', meaning: 'river', component: '氵 water', word: '长江', wordPinyin: 'Chángjiāng', wordMeaning: 'Yangtze River' },
      { char: '红', pinyin: 'hóng', meaning: 'red', component: '纟 silk', word: '红色', wordPinyin: 'hóngsè', wordMeaning: 'red color' },
    ],
  },
  {
    id: 'fan-family', anchor: '反', sound: 'fǎn / fàn / bǎn', idea: 'opposite / return', hint: '反 creates a useful an-sound cluster. The outside component points to food, wood, travel, or printing.',
    members: [
      { char: '饭', pinyin: 'fàn', meaning: 'cooked food / meal', component: '饣 food', word: '米饭', wordPinyin: 'mǐfàn', wordMeaning: 'cooked rice' },
      { char: '返', pinyin: 'fǎn', meaning: 'return', component: '辶 movement', word: '返回', wordPinyin: 'fǎnhuí', wordMeaning: 'return / go back' },
      { char: '板', pinyin: 'bǎn', meaning: 'board / plate', component: '木 wood', word: '平板', wordPinyin: 'píngbǎn', wordMeaning: 'tablet / flat board' },
      { char: '版', pinyin: 'bǎn', meaning: 'edition / version', component: '片 slice', word: '版本', wordPinyin: 'bǎnběn', wordMeaning: 'version / edition' },
    ],
  },
  {
    id: 'man-family', anchor: '曼', sound: 'màn / mán', idea: 'long / extended', hint: '曼 usually supplies a man sound. Its partner shows movement, water, food, or plants.',
    members: [
      { char: '慢', pinyin: 'màn', meaning: 'slow', component: '忄 heart', word: '慢一点', wordPinyin: 'màn yìdiǎn', wordMeaning: 'a little slower' },
      { char: '漫', pinyin: 'màn', meaning: 'overflow / free', component: '氵 water', word: '浪漫', wordPinyin: 'làngmàn', wordMeaning: 'romantic' },
      { char: '馒', pinyin: 'mán', meaning: 'steamed bread', component: '饣 food', word: '馒头', wordPinyin: 'mántou', wordMeaning: 'steamed bun' },
      { char: '蔓', pinyin: 'màn', meaning: 'vine / spread', component: '艹 plant', word: '蔓延', wordPinyin: 'mànyán', wordMeaning: 'spread / extend' },
    ],
  },
  {
    id: 'pi-family', anchor: '皮', sound: 'pí / pī / pō', idea: 'skin', hint: '皮 creates a p-initial family, while the added component identifies clothing, earth, hand action, or damage.',
    members: [
      { char: '坡', pinyin: 'pō', meaning: 'slope', component: '土 earth', word: '上坡', wordPinyin: 'shàngpō', wordMeaning: 'uphill' },
      { char: '披', pinyin: 'pī', meaning: 'drape over', component: '扌 hand', word: '披上', wordPinyin: 'pīshàng', wordMeaning: 'put on / drape over' },
      { char: '被', pinyin: 'bèi', meaning: 'quilt / passive marker', component: '衤 clothing', word: '被影响', wordPinyin: 'bèi yǐngxiǎng', wordMeaning: 'be affected' },
      { char: '破', pinyin: 'pò', meaning: 'break / damaged', component: '石 stone', word: '突破', wordPinyin: 'tūpò', wordMeaning: 'break through' },
    ],
  },
  {
    id: 'ding-family', anchor: '丁', sound: 'dīng / dǐng / dēng', idea: 'small block / fourth', hint: '丁 provides a compact d-ing or d-eng sound clue. Meaning comes from speech, head, fire, or metal.',
    members: [
      { char: '订', pinyin: 'dìng', meaning: 'book / order', component: '讠 speech', word: '预订', wordPinyin: 'yùdìng', wordMeaning: 'reserve / book' },
      { char: '顶', pinyin: 'dǐng', meaning: 'top / support', component: '页 head', word: '头顶', wordPinyin: 'tóudǐng', wordMeaning: 'top of the head' },
      { char: '灯', pinyin: 'dēng', meaning: 'lamp', component: '火 fire', word: '开灯', wordPinyin: 'kāidēng', wordMeaning: 'turn on the light' },
      { char: '钉', pinyin: 'dīng', meaning: 'nail', component: '钅 metal', word: '钉子', wordPinyin: 'dīngzi', wordMeaning: 'nail' },
    ],
  },
  {
    id: 'zhao-family', anchor: '召', sound: 'zhào / zhāo / chāo', idea: 'summon', hint: '召 organizes several useful ao-sound characters. Their left side signals hand action, movement, speech, or water.',
    members: [
      { char: '招', pinyin: 'zhāo', meaning: 'wave / recruit', component: '扌 hand', word: '招手', wordPinyin: 'zhāoshǒu', wordMeaning: 'wave the hand' },
      { char: '超', pinyin: 'chāo', meaning: 'exceed', component: '走 movement', word: '超过', wordPinyin: 'chāoguò', wordMeaning: 'exceed / surpass' },
      { char: '绍', pinyin: 'shào', meaning: 'continue / introduce', component: '纟 silk', word: '介绍', wordPinyin: 'jièshào', wordMeaning: 'introduce' },
      { char: '沼', pinyin: 'zhǎo', meaning: 'marsh', component: '氵 water', word: '沼泽', wordPinyin: 'zhǎozé', wordMeaning: 'marsh / swamp' },
    ],
  },
  {
    id: 'liang-family', anchor: '良', sound: 'liáng / liàng / láng', idea: 'good', hint: '良 supplies a liang or lang sound pattern in words connected with food, water, measurement, and animals.',
    members: [
      { char: '粮', pinyin: 'liáng', meaning: 'grain / food', component: '米 rice', word: '粮食', wordPinyin: 'liángshi', wordMeaning: 'grain / food supply' },
      { char: '浪', pinyin: 'làng', meaning: 'wave', component: '氵 water', word: '海浪', wordPinyin: 'hǎilàng', wordMeaning: 'ocean wave' },
      { char: '量', pinyin: 'liàng', meaning: 'measure / amount', component: '日 sun', word: '训练量', wordPinyin: 'xùnliànliàng', wordMeaning: 'training volume' },
      { char: '狼', pinyin: 'láng', meaning: 'wolf', component: '犭 animal', word: '灰狼', wordPinyin: 'huīláng', wordMeaning: 'gray wolf' },
    ],
  },
  {
    id: 'piao-family', anchor: '票', sound: 'piào / piāo / biāo', idea: 'ticket', hint: '票 creates a piao or biao family—very useful for travel, movement, and standards.',
    members: [
      { char: '漂', pinyin: 'piào / piāo', meaning: 'pretty / float', component: '氵 water', word: '漂亮', wordPinyin: 'piàoliang', wordMeaning: 'beautiful' },
      { char: '飘', pinyin: 'piāo', meaning: 'float in air', component: '风 wind', word: '飘动', wordPinyin: 'piāodòng', wordMeaning: 'flutter / float' },
      { char: '标', pinyin: 'biāo', meaning: 'mark / standard', component: '木 wood', word: '目标', wordPinyin: 'mùbiāo', wordMeaning: 'goal / target' },
      { char: '镖', pinyin: 'biāo', meaning: 'dart', component: '钅 metal', word: '飞镖', wordPinyin: 'fēibiāo', wordMeaning: 'dart' },
    ],
  },
  {
    id: 'gen-family', anchor: '艮', sound: 'gēn / hěn', idea: 'stopping / firm', hint: '艮 is a recurring visual and sound component. Learn the common words first, then notice the sound shifts.',
    members: [
      { char: '根', pinyin: 'gēn', meaning: 'root / basis', component: '木 wood', word: '根据', wordPinyin: 'gēnjù', wordMeaning: 'according to / based on' },
      { char: '跟', pinyin: 'gēn', meaning: 'follow / with', component: '足 foot', word: '跟着', wordPinyin: 'gēnzhe', wordMeaning: 'follow along' },
      { char: '很', pinyin: 'hěn', meaning: 'very', component: '彳 step', word: '很好', wordPinyin: 'hěn hǎo', wordMeaning: 'very good' },
      { char: '狠', pinyin: 'hěn', meaning: 'fierce / ruthless', component: '犭 animal', word: '狠心', wordPinyin: 'hěnxīn', wordMeaning: 'hard-hearted' },
    ],
  },
  {
    id: 'xi-family', anchor: '昔', sound: 'xī / xí / jiè / cuò', idea: 'former times', hint: '昔 creates a useful sound neighborhood. The heart cherishes, people borrow, metal makes an error, and movement puts something in place.',
    members: [
      { char: '惜', pinyin: 'xī', meaning: 'cherish / regret', component: '忄 heart', word: '可惜', wordPinyin: 'kěxī', wordMeaning: 'what a pity' },
      { char: '借', pinyin: 'jiè', meaning: 'borrow / lend', component: '亻 person', word: '借用', wordPinyin: 'jièyòng', wordMeaning: 'borrow / use temporarily' },
      { char: '错', pinyin: 'cuò', meaning: 'wrong / mistake', component: '钅 metal', word: '错误', wordPinyin: 'cuòwù', wordMeaning: 'error / mistake' },
      { char: '措', pinyin: 'cuò', meaning: 'arrange / handle', component: '扌 hand', word: '措施', wordPinyin: 'cuòshī', wordMeaning: 'measure / action' },
    ],
  },
  {
    id: 'sheng-family', anchor: '生', sound: 'shēng / xīng / xìng', idea: 'life / be born', hint: '生 anchors a common eng/ing family. The sun makes a star, a woman marks a surname, the heart shapes nature, and an animal becomes livestock.',
    members: [
      { char: '星', pinyin: 'xīng', meaning: 'star', component: '日 sun', word: '星期', wordPinyin: 'xīngqī', wordMeaning: 'week' },
      { char: '姓', pinyin: 'xìng', meaning: 'surname', component: '女 woman', word: '姓名', wordPinyin: 'xìngmíng', wordMeaning: 'full name' },
      { char: '性', pinyin: 'xìng', meaning: 'nature / property', component: '忄 heart', word: '灵活性', wordPinyin: 'línghuóxìng', wordMeaning: 'flexibility' },
      { char: '牲', pinyin: 'shēng', meaning: 'livestock', component: '牜 animal', word: '牲畜', wordPinyin: 'shēngchù', wordMeaning: 'livestock' },
    ],
  },
  {
    id: 'jiao-family', anchor: '交', sound: 'jiāo / jiào / jiǎo', idea: 'cross / connect', hint: '交 anchors a jiao sound neighborhood. Wood marks a school, movement compares, the body becomes the thigh, and glue joins things.',
    members: [
      { char: '校', pinyin: 'xiào', meaning: 'school / check', component: '木 wood', word: '学校', wordPinyin: 'xuéxiào', wordMeaning: 'school' },
      { char: '较', pinyin: 'jiào', meaning: 'compare / relatively', component: '车 vehicle', word: '比较', wordPinyin: 'bǐjiào', wordMeaning: 'compare / relatively' },
      { char: '胶', pinyin: 'jiāo', meaning: 'glue / rubber', component: '月 body', word: '弹力胶带', wordPinyin: 'tánlì jiāodài', wordMeaning: 'elastic tape' },
      { char: '郊', pinyin: 'jiāo', meaning: 'suburb', component: '阝 place', word: '郊外', wordPinyin: 'jiāowài', wordMeaning: 'outskirts / countryside' },
    ],
  },
  {
    id: 'cai-family', anchor: '采', sound: 'cǎi / cài', idea: 'pick / gather', hint: '采 stays close to cai. Plants become vegetables, color becomes brilliance, a foot steps, and the eye pays attention.',
    members: [
      { char: '菜', pinyin: 'cài', meaning: 'vegetable / dish', component: '艹 plant', word: '点菜', wordPinyin: 'diǎncài', wordMeaning: 'order dishes' },
      { char: '彩', pinyin: 'cǎi', meaning: 'color', component: '彡 pattern', word: '精彩', wordPinyin: 'jīngcǎi', wordMeaning: 'wonderful / brilliant' },
      { char: '踩', pinyin: 'cǎi', meaning: 'step on', component: '足 foot', word: '踩地', wordPinyin: 'cǎi dì', wordMeaning: 'press the foot into the ground' },
      { char: '睬', pinyin: 'cǎi', meaning: 'pay attention to', component: '目 eye', word: '理睬', wordPinyin: 'lǐcǎi', wordMeaning: 'pay attention to' },
    ],
  },
  {
    id: 'si-family', anchor: '寺', sound: 'sì / shí / chí', idea: 'temple', hint: '寺 is a strong visual family with a controlled sound shift. Speech makes poetry, the hand holds, the person attends, and the sun marks time.',
    members: [
      { char: '时', pinyin: 'shí', meaning: 'time', component: '日 sun', word: '时间', wordPinyin: 'shíjiān', wordMeaning: 'time' },
      { char: '持', pinyin: 'chí', meaning: 'hold / maintain', component: '扌 hand', word: '保持', wordPinyin: 'bǎochí', wordMeaning: 'maintain' },
      { char: '诗', pinyin: 'shī', meaning: 'poem', component: '讠 speech', word: '诗歌', wordPinyin: 'shīgē', wordMeaning: 'poetry' },
      { char: '侍', pinyin: 'shì', meaning: 'attend / serve', component: '亻 person', word: '服侍', wordPinyin: 'fúshi', wordMeaning: 'attend to / serve' },
    ],
  },
  {
    id: 'yao-family', anchor: '尧', sound: 'yáo / rào / shāo / xiǎo', idea: 'high / legendary ruler', hint: '尧 forms a memorable ao family. Silk winds around, fire burns, the sun brings dawn, and feathers lift upward.',
    members: [
      { char: '绕', pinyin: 'rào', meaning: 'wind around / circle', component: '纟 silk', word: '绕肩', wordPinyin: 'rào jiān', wordMeaning: 'shoulder circles' },
      { char: '烧', pinyin: 'shāo', meaning: 'burn / cook', component: '火 fire', word: '发烧', wordPinyin: 'fāshāo', wordMeaning: 'have a fever' },
      { char: '晓', pinyin: 'xiǎo', meaning: 'dawn / know', component: '日 sun', word: '知晓', wordPinyin: 'zhīxiǎo', wordMeaning: 'know / be aware' },
      { char: '翘', pinyin: 'qiào', meaning: 'raise / tilt up', component: '羽 feather', word: '翘起', wordPinyin: 'qiàoqǐ', wordMeaning: 'lift / tilt upward' },
    ],
  },
  {
    id: 'he-family', anchor: '曷', sound: 'hē / hé / kě / xiē', idea: 'how / when', hint: '曷 forms a practical daily-life cluster. The mouth drinks, water becomes thirst, the hand reveals, and the body rests.',
    members: [
      { char: '喝', pinyin: 'hē', meaning: 'drink', component: '口 mouth', word: '喝水', wordPinyin: 'hē shuǐ', wordMeaning: 'drink water' },
      { char: '渴', pinyin: 'kě', meaning: 'thirsty', component: '氵 water', word: '口渴', wordPinyin: 'kǒukě', wordMeaning: 'thirsty' },
      { char: '揭', pinyin: 'jiē', meaning: 'lift / reveal', component: '扌 hand', word: '揭开', wordPinyin: 'jiēkāi', wordMeaning: 'uncover / reveal' },
      { char: '歇', pinyin: 'xiē', meaning: 'rest', component: '欠 breath', word: '歇一会儿', wordPinyin: 'xiē yíhuìr', wordMeaning: 'rest for a while' },
    ],
  },
  {
    id: 'zhi-family', anchor: '支', sound: 'zhī / zhī / jì', idea: 'branch / support', hint: '支 gives a zhi-like shape and sound clue. Wood branches, the body has limbs, skill comes from the hand, and fabric becomes a tent.',
    members: [
      { char: '枝', pinyin: 'zhī', meaning: 'branch', component: '木 wood', word: '树枝', wordPinyin: 'shùzhī', wordMeaning: 'tree branch' },
      { char: '肢', pinyin: 'zhī', meaning: 'limb', component: '月 body', word: '四肢', wordPinyin: 'sìzhī', wordMeaning: 'four limbs' },
      { char: '技', pinyin: 'jì', meaning: 'skill / technique', component: '扌 hand', word: '技术', wordPinyin: 'jìshù', wordMeaning: 'technique / technology' },
      { char: '歧', pinyin: 'qí', meaning: 'fork / divergent', component: '止 foot', word: '分歧', wordPinyin: 'fēnqí', wordMeaning: 'difference / disagreement' },
    ],
  },
  {
    id: 'yong-family', anchor: '甬', sound: 'yǒng / tǒng / tōng / tòng', idea: 'path / channel', hint: '甬 unlocks a highly useful ong family: movement passes through, the body feels pain, wood forms a bucket, and water surges.',
    members: [
      { char: '通', pinyin: 'tōng', meaning: 'pass through / connect', component: '辶 movement', word: '沟通', wordPinyin: 'gōutōng', wordMeaning: 'communicate' },
      { char: '痛', pinyin: 'tòng', meaning: 'pain / painful', component: '疒 illness', word: '疼痛', wordPinyin: 'téngtòng', wordMeaning: 'pain' },
      { char: '桶', pinyin: 'tǒng', meaning: 'bucket / barrel', component: '木 wood', word: '水桶', wordPinyin: 'shuǐtǒng', wordMeaning: 'bucket' },
      { char: '涌', pinyin: 'yǒng', meaning: 'surge / well up', component: '氵 water', word: '涌出', wordPinyin: 'yǒngchū', wordMeaning: 'pour / surge out' },
    ],
  },
  {
    id: 'qiu-family', anchor: '求', sound: 'qiú / jiù', idea: 'seek / request', hint: '求 holds a strong qiu shape and sound. The sphere becomes a ball, action becomes rescue, and clothing becomes fur.',
    members: [
      { char: '球', pinyin: 'qiú', meaning: 'ball / sphere', component: '王 jade', word: '药球', wordPinyin: 'yàoqiú', wordMeaning: 'medicine ball' },
      { char: '救', pinyin: 'jiù', meaning: 'save / rescue', component: '攵 action', word: '急救', wordPinyin: 'jíjiù', wordMeaning: 'first aid' },
      { char: '裘', pinyin: 'qiú', meaning: 'fur coat', component: '衣 clothing', word: '皮裘', wordPinyin: 'píqiú', wordMeaning: 'fur garment' },
      { char: '泅', pinyin: 'qiú', meaning: 'swim', component: '氵 water', word: '泅水', wordPinyin: 'qiúshuǐ', wordMeaning: 'swim through water' },
    ],
  },
  {
    id: 'cao-family', anchor: '曹', sound: 'cáo / cāo / zāo / zāo', idea: 'group / class', hint: '曹 creates an ao sound family. Hands perform, wood forms a trough, movement encounters, and rice can become spoiled.',
    members: [
      { char: '操', pinyin: 'cāo', meaning: 'operate / drill', component: '扌 hand', word: '体操', wordPinyin: 'tǐcāo', wordMeaning: 'gymnastics / physical drills' },
      { char: '槽', pinyin: 'cáo', meaning: 'groove / trough', component: '木 wood', word: '凹槽', wordPinyin: 'āocáo', wordMeaning: 'groove / channel' },
      { char: '遭', pinyin: 'zāo', meaning: 'encounter', component: '辶 movement', word: '遭遇', wordPinyin: 'zāoyù', wordMeaning: 'encounter' },
      { char: '糟', pinyin: 'zāo', meaning: 'spoiled / bad', component: '米 rice', word: '糟糕', wordPinyin: 'zāogāo', wordMeaning: 'terrible / bad' },
    ],
  },
  {
    id: 'jun-family', anchor: '夋', sound: 'jùn / qùn', idea: 'quick / talented', hint: '夋 marks a compact un-sound family. A person is talented, a horse is swift, a mountain is steep, and completion is finished.',
    members: [
      { char: '俊', pinyin: 'jùn', meaning: 'talented / handsome', component: '亻 person', word: '英俊', wordPinyin: 'yīngjùn', wordMeaning: 'handsome' },
      { char: '骏', pinyin: 'jùn', meaning: 'fine horse / swift', component: '马 horse', word: '骏马', wordPinyin: 'jùnmǎ', wordMeaning: 'fine horse' },
      { char: '峻', pinyin: 'jùn', meaning: 'steep / severe', component: '山 mountain', word: '严峻', wordPinyin: 'yánjùn', wordMeaning: 'severe / challenging' },
      { char: '竣', pinyin: 'jùn', meaning: 'complete', component: '立 stand', word: '竣工', wordPinyin: 'jùngōng', wordMeaning: 'complete construction' },
    ],
  },
]
