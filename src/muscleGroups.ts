// Detailed individual-muscle taxonomy + SVG regions for the anatomy diagram.
// Hand-authored from anatomical knowledge (proportioned against a 100x200
// body silhouette), not traced pixel-for-pixel from any photo — see the
// commit message / Kent conversation for that distinction. Front (anterior)
// and back (posterior) each carry ~24 individually-selectable muscles; a
// handful (obliques, serratus anterior, tensor fasciae latae, soleus,
// trapezius, brachioradialis, the wrist extensors/flexors) are genuinely
// visible from both sides and reuse the SAME key across both arrays so
// picking one highlights it on either view.
export const MUSCLE_LABELS: Record<string, { en: string; cn: string }> = {
  sternocleidomastoid: { en: "Sternocleidomastoid", cn: "胸锁乳突肌" },
  omohyoid: { en: "Omohyoid", cn: "肩胛舌骨肌" },
  "trapezius-upper": { en: "Trapezius (Upper)", cn: "斜方肌（上部）" },
  "trapezius-lower": { en: "Trapezius (Lower)", cn: "斜方肌（下部）" },
  "deltoid-anterior": { en: "Front Deltoid", cn: "三角肌（前束）" },
  "deltoid-posterior": { en: "Rear Deltoid", cn: "三角肌（后束）" },
  "pectoralis-major": { en: "Pectoralis Major", cn: "胸大肌" },
  "biceps-brachii": { en: "Biceps Brachii", cn: "肱二头肌" },
  brachialis: { en: "Brachialis", cn: "肱肌" },
  "triceps-long-head": { en: "Triceps (Long Head)", cn: "肱三头肌（长头）" },
  "triceps-lateral-head": { en: "Triceps (Lateral Head)", cn: "肱三头肌（外侧头）" },
  "triceps-medial-head": { en: "Triceps (Medial Head)", cn: "肱三头肌（内侧头）" },
  brachioradialis: { en: "Brachioradialis", cn: "肱桡肌" },
  "extensor-carpi-radialis": { en: "Extensor Carpi Radialis", cn: "桡侧腕伸肌" },
  "flexor-carpi-radialis": { en: "Flexor Carpi Radialis", cn: "桡侧腕屈肌" },
  "flexor-carpi-ulnaris": { en: "Flexor Carpi Ulnaris", cn: "尺侧腕屈肌" },
  "extensor-digitorum-longus": { en: "Extensor Digitorum Longus", cn: "趾长伸肌" },
  "rectus-abdominis-upper": { en: "Rectus Abdominis (Upper)", cn: "腹直肌（上部）" },
  "rectus-abdominis-lower": { en: "Rectus Abdominis (Lower)", cn: "腹直肌（下部）" },
  "external-obliques": { en: "External Obliques", cn: "腹外斜肌" },
  "serratus-anterior": { en: "Serratus Anterior", cn: "前锯肌" },
  "latissimus-dorsi": { en: "Latissimus Dorsi", cn: "背阔肌" },
  "thoracolumbar-fascia": { en: "Thoracolumbar Fascia", cn: "胸腰筋膜" },
  infraspinatus: { en: "Infraspinatus", cn: "冈下肌" },
  "teres-major": { en: "Teres Major", cn: "大圆肌" },
  "tensor-fasciae-latae": { en: "Tensor Fasciae Latae", cn: "阔筋膜张肌" },
  sartorius: { en: "Sartorius", cn: "缝匠肌" },
  "adductor-longus": { en: "Adductor Longus", cn: "长收肌" },
  "adductor-magnus": { en: "Adductor Magnus", cn: "大收肌" },
  "rectus-femoris": { en: "Rectus Femoris", cn: "股直肌" },
  "vastus-medialis": { en: "Vastus Medialis", cn: "股内侧肌" },
  "vastus-lateralis": { en: "Vastus Lateralis", cn: "股外侧肌" },
  "gluteus-medius": { en: "Gluteus Medius", cn: "臀中肌" },
  "gluteus-maximus": { en: "Gluteus Maximus", cn: "臀大肌" },
  "biceps-femoris": { en: "Biceps Femoris", cn: "股二头肌" },
  semitendinosus: { en: "Semitendinosus", cn: "半腱肌" },
  semimembranosus: { en: "Semimembranosus", cn: "半膜肌" },
  soleus: { en: "Soleus", cn: "比目鱼肌" },
  "gastrocnemius-lateral": { en: "Gastrocnemius (Lateral Head)", cn: "腓肠肌（外侧头）" },
  "gastrocnemius-medial": { en: "Gastrocnemius (Medial Head)", cn: "腓肠肌（内侧头）" },
};

export const MUSCLE_GROUP_KEYS = Object.keys(MUSCLE_LABELS);

interface MuscleRegion {
  muscle: string;
  svgPoints: string[];
}

// Decorative body outline (head, torso card, hands/feet stubs) — never
// selectable, just gives the muscle regions something to sit on.
export const BODY_OUTLINE_FRONT =
  "42,3 40,12 42,20 46,23 50,25 54,23 58,20 60,12 58,3 50,0 " +
  "M 32,40 27,55 25,70 26,95 24,150 22,196 30,196 33,150 35,100 " +
  "M 68,40 73,55 75,70 74,95 76,150 78,196 70,196 67,150 65,100";

export const ANTERIOR: MuscleRegion[] = [
  { muscle: "sternocleidomastoid", svgPoints: ["44,22 41,32 39,40 44,38 47,30 46,23", "56,22 59,32 61,40 56,38 53,30 54,23"] },
  { muscle: "omohyoid", svgPoints: ["47,32 53,32 52,39 48,39"] },
  { muscle: "deltoid-anterior", svgPoints: ["18,40 15,48 17,56 24,53 26,44 22,38", "82,40 85,48 83,56 76,53 74,44 78,38"] },
  { muscle: "pectoralis-major", svgPoints: ["50,42 38,44 33,50 35,58 44,60 50,56", "50,42 62,44 67,50 65,58 56,60 50,56"] },
  { muscle: "biceps-brachii", svgPoints: ["16,52 12,60 11,68 15,72 20,68 21,58", "84,52 88,60 89,68 85,72 80,68 79,58"] },
  { muscle: "brachialis", svgPoints: ["20,66 17,72 20,77 24,72", "80,66 83,72 80,77 76,72"] },
  { muscle: "triceps-long-head", svgPoints: ["9,56 6,64 8,72 11,68", "91,56 94,64 92,72 89,68"] },
  { muscle: "triceps-medial-head", svgPoints: ["22,70 25,74 23,78 20,76", "78,70 75,74 77,78 80,76"] },
  { muscle: "brachioradialis", svgPoints: ["15,74 20,78 18,88 13,86", "85,74 80,78 82,88 87,86"] },
  { muscle: "extensor-carpi-radialis", svgPoints: ["12,86 17,90 14,98 9,95", "88,86 83,90 86,98 91,95"] },
  { muscle: "flexor-carpi-radialis", svgPoints: ["9,94 14,98 11,105 6,101", "91,94 86,98 89,105 94,101"] },
  { muscle: "rectus-abdominis-upper", svgPoints: ["44,58 56,58 57,64 55,78 45,78 43,64"] },
  { muscle: "rectus-abdominis-lower", svgPoints: ["45,79 55,79 54,92 51,104 49,104 46,92"] },
  { muscle: "external-obliques", svgPoints: ["33,64 30,72 32,84 39,82 40,68", "67,64 70,72 68,84 61,82 60,68"] },
  { muscle: "serratus-anterior", svgPoints: ["36,56 32,60 33,66 38,64 40,58", "64,56 68,60 67,66 62,64 60,58"] },
  { muscle: "tensor-fasciae-latae", svgPoints: ["27,94 24,102 26,110 31,106 30,96", "73,94 76,102 74,110 69,106 70,96"] },
  { muscle: "sartorius", svgPoints: ["30,96 44,110 42,140 36,142 32,120 27,105", "70,96 56,110 58,140 64,142 68,120 73,105"] },
  { muscle: "adductor-longus", svgPoints: ["42,108 46,112 47,130 43,132 40,116", "58,108 54,112 53,130 57,132 60,116"] },
  { muscle: "rectus-femoris", svgPoints: ["42,108 58,108 60,140 56,148 48,150 44,146 40,138"] },
  { muscle: "vastus-medialis", svgPoints: ["45,125 48,124 50,148 46,150 43,142", "55,125 52,124 50,148 54,150 57,142"] },
  { muscle: "vastus-lateralis", svgPoints: ["27,108 24,120 26,142 31,144 33,120 30,110", "73,108 76,120 74,142 69,144 67,120 70,110"] },
  { muscle: "extensor-digitorum-longus", svgPoints: ["32,155 29,165 31,180 35,178 36,160", "68,155 71,165 69,180 65,178 64,160"] },
  { muscle: "soleus", svgPoints: ["38,175 41,178 40,192 36,190", "62,175 59,178 60,192 64,190"] },
];

export const POSTERIOR: MuscleRegion[] = [
  { muscle: "trapezius-upper", svgPoints: ["45,22 40,30 33,38 30,44 36,42 44,30", "55,22 60,30 67,38 70,44 64,42 56,30"] },
  { muscle: "trapezius-lower", svgPoints: ["44,44 56,44 58,60 50,66 42,60"] },
  { muscle: "deltoid-posterior", svgPoints: ["23,38 17,42 16,52 22,50 27,44", "77,38 83,42 84,52 78,50 73,44"] },
  { muscle: "infraspinatus", svgPoints: ["33,42 38,44 40,50 35,52 31,48", "67,42 62,44 60,50 65,52 69,48"] },
  { muscle: "teres-major", svgPoints: ["30,50 34,52 36,58 31,58", "70,50 66,52 64,58 69,58"] },
  { muscle: "latissimus-dorsi", svgPoints: ["31,40 26,50 27,64 33,72 44,68 43,50", "69,40 74,50 73,64 67,72 56,68 57,50"] },
  { muscle: "thoracolumbar-fascia", svgPoints: ["42,68 58,68 60,80 50,90 40,80"] },
  { muscle: "triceps-long-head", svgPoints: ["17,50 14,58 15,68 19,66 21,56", "83,50 86,58 85,68 81,66 79,56"] },
  { muscle: "triceps-lateral-head", svgPoints: ["21,52 25,54 27,62 23,64 20,58", "79,52 75,54 73,62 77,64 80,58"] },
  { muscle: "triceps-medial-head", svgPoints: ["18,64 22,66 24,72 19,74", "82,64 78,66 76,72 81,74"] },
  { muscle: "brachioradialis", svgPoints: ["16,75 21,78 19,86 14,84", "84,75 79,78 81,86 86,84"] },
  { muscle: "extensor-carpi-radialis", svgPoints: ["13,84 18,88 16,96 11,94", "87,84 82,88 84,96 89,94"] },
  { muscle: "flexor-carpi-radialis", svgPoints: ["10,93 15,97 12,105 7,102", "90,93 85,97 88,105 93,102"] },
  { muscle: "flexor-carpi-ulnaris", svgPoints: ["7,90 11,93 9,101 5,98", "93,90 89,93 91,101 95,98"] },
  { muscle: "external-obliques", svgPoints: ["26,66 24,74 26,84 32,82 33,70", "74,66 76,74 74,84 68,82 67,70"] },
  { muscle: "serratus-anterior", svgPoints: ["29,58 26,62 28,68 33,66 34,60", "71,58 74,62 72,68 67,66 66,60"] },
  { muscle: "tensor-fasciae-latae", svgPoints: ["27,96 24,100 25,108 29,105", "73,96 76,100 75,108 71,105"] },
  { muscle: "gluteus-medius", svgPoints: ["30,96 27,102 29,110 34,106 33,98", "70,96 73,102 71,110 66,106 67,98"] },
  { muscle: "gluteus-maximus", svgPoints: ["31,105 27,112 28,124 36,126 42,120 40,108", "69,105 73,112 72,124 64,126 58,120 60,108"] },
  { muscle: "biceps-femoris", svgPoints: ["27,122 24,132 25,150 30,152 33,130 31,124", "73,122 76,132 75,150 70,152 67,130 69,124"] },
  { muscle: "semitendinosus", svgPoints: ["38,124 42,126 44,146 40,150 36,140 37,130", "62,124 58,126 56,146 60,150 64,140 63,130"] },
  { muscle: "semimembranosus", svgPoints: ["34,132 38,134 39,150 35,152 32,142", "66,132 62,134 61,150 65,152 68,142"] },
  { muscle: "adductor-magnus", svgPoints: ["42,124 46,126 47,144 43,146 40,136", "58,124 54,126 53,144 57,146 60,136"] },
  { muscle: "gastrocnemius-lateral", svgPoints: ["29,160 26,168 27,182 32,180 33,166", "71,160 74,168 73,182 68,180 67,166"] },
  { muscle: "gastrocnemius-medial", svgPoints: ["38,162 42,165 43,182 38,184 35,170", "62,162 58,165 57,182 62,184 65,170"] },
  { muscle: "soleus", svgPoints: ["30,182 34,184 33,196 29,194", "38,184 42,186 41,196 37,194", "70,182 66,184 67,196 71,194", "62,184 58,186 59,196 63,194"] },
];
