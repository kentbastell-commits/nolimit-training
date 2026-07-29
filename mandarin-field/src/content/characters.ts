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
]
