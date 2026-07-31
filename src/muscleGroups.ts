// Muscle-group taxonomy for the anatomy diagram (react-body-highlighter).
// Keys match that library's Muscle type exactly (server/db stores these
// strings verbatim in exercises.target_muscles) — never invent a key here
// that isn't one of theirs, the diagram has no shape to highlight it with.
export const MUSCLE_LABELS: Record<string, { en: string; cn: string }> = {
  trapezius: { en: "Traps", cn: "斜方肌" },
  "upper-back": { en: "Upper Back", cn: "上背部" },
  "lower-back": { en: "Lower Back", cn: "下背部" },
  chest: { en: "Chest", cn: "胸部" },
  biceps: { en: "Biceps", cn: "肱二头肌" },
  triceps: { en: "Triceps", cn: "肱三头肌" },
  forearm: { en: "Forearms", cn: "前臂" },
  "back-deltoids": { en: "Rear Delts", cn: "三角肌（后束）" },
  "front-deltoids": { en: "Front Delts", cn: "三角肌（前束）" },
  abs: { en: "Abs", cn: "腹肌" },
  obliques: { en: "Obliques", cn: "腹外斜肌" },
  adductor: { en: "Adductors", cn: "内收肌" },
  abductors: { en: "Abductors", cn: "外展肌" },
  hamstring: { en: "Hamstrings", cn: "腘绳肌" },
  quadriceps: { en: "Quads", cn: "股四头肌" },
  calves: { en: "Calves", cn: "小腿" },
  gluteal: { en: "Glutes", cn: "臀肌" },
  head: { en: "Head", cn: "头部" },
  neck: { en: "Neck", cn: "颈部" },
  knees: { en: "Knees", cn: "膝部" },
  "left-soleus": { en: "Calves (Soleus)", cn: "比目鱼肌（左）" },
  "right-soleus": { en: "Calves (Soleus)", cn: "比目鱼肌（右）" },
};

export const MUSCLE_GROUP_KEYS = Object.keys(MUSCLE_LABELS);
