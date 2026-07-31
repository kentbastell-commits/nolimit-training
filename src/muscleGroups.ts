// Muscle-group taxonomy + simplified body-diagram shapes for MuscleDiagram.
// Shapes are plain ellipses/rects (not hand-drawn anatomy paths) — a
// stylized, clearly-labeled map rather than a medical illustration.
export type MuscleView = "front" | "back";

export const MUSCLE_LABELS: Record<string, { en: string; cn: string }> = {
  chest: { en: "Chest", cn: "胸部" },
  front_delts: { en: "Front Delts", cn: "肩部（前束）" },
  rear_delts: { en: "Rear Delts", cn: "肩部（后束）" },
  biceps: { en: "Biceps", cn: "肱二头肌" },
  triceps: { en: "Triceps", cn: "肱三头肌" },
  forearms: { en: "Forearms", cn: "前臂" },
  abs: { en: "Abs", cn: "腹肌" },
  obliques: { en: "Obliques", cn: "腹外斜肌" },
  lats: { en: "Lats", cn: "背阔肌" },
  traps: { en: "Traps", cn: "斜方肌" },
  lower_back: { en: "Lower Back", cn: "下背部" },
  glutes: { en: "Glutes", cn: "臀部" },
  quads: { en: "Quads", cn: "股四头肌" },
  hamstrings: { en: "Hamstrings", cn: "腘绳肌" },
  calves: { en: "Calves", cn: "小腿" },
};

export const MUSCLE_GROUP_KEYS = Object.keys(MUSCLE_LABELS);

export type BodyShape =
  | { type: "ellipse"; key: string; cx: number; cy: number; rx: number; ry: number }
  | { type: "rect"; key: string; x: number; y: number; width: number; height: number; rx: number };

// Decorative silhouette (head/neck/torso/limb outline) — same for both views,
// never clickable, always a neutral fill sitting behind the muscle shapes.
export const BODY_BASE: BodyShape[] = [
  { type: "ellipse", key: "__base", cx: 100, cy: 26, rx: 18, ry: 22 },
  { type: "rect", key: "__base", x: 90, y: 46, width: 20, height: 10, rx: 3 },
  { type: "rect", key: "__base", x: 62, y: 54, width: 76, height: 122, rx: 22 },
  { type: "rect", key: "__base", x: 38, y: 60, width: 22, height: 70, rx: 10 },
  { type: "rect", key: "__base", x: 140, y: 60, width: 22, height: 70, rx: 10 },
  { type: "rect", key: "__base", x: 34, y: 126, width: 20, height: 65, rx: 9 },
  { type: "rect", key: "__base", x: 146, y: 126, width: 20, height: 65, rx: 9 },
  { type: "rect", key: "__base", x: 68, y: 184, width: 30, height: 96, rx: 14 },
  { type: "rect", key: "__base", x: 102, y: 184, width: 30, height: 96, rx: 14 },
  { type: "rect", key: "__base", x: 70, y: 282, width: 26, height: 86, rx: 12 },
  { type: "rect", key: "__base", x: 104, y: 282, width: 26, height: 86, rx: 12 },
];

export const FRONT_SHAPES: BodyShape[] = [
  { type: "ellipse", key: "front_delts", cx: 52, cy: 68, rx: 16, ry: 14 },
  { type: "ellipse", key: "front_delts", cx: 148, cy: 68, rx: 16, ry: 14 },
  { type: "ellipse", key: "chest", cx: 82, cy: 90, rx: 20, ry: 16 },
  { type: "ellipse", key: "chest", cx: 118, cy: 90, rx: 20, ry: 16 },
  { type: "rect", key: "biceps", x: 40, y: 64, width: 18, height: 55, rx: 9 },
  { type: "rect", key: "biceps", x: 142, y: 64, width: 18, height: 55, rx: 9 },
  { type: "rect", key: "forearms", x: 36, y: 128, width: 16, height: 58, rx: 8 },
  { type: "rect", key: "forearms", x: 148, y: 128, width: 16, height: 58, rx: 8 },
  { type: "rect", key: "abs", x: 85, y: 108, width: 30, height: 56, rx: 8 },
  { type: "rect", key: "obliques", x: 68, y: 112, width: 14, height: 50, rx: 7 },
  { type: "rect", key: "obliques", x: 118, y: 112, width: 14, height: 50, rx: 7 },
  { type: "rect", key: "quads", x: 70, y: 190, width: 26, height: 80, rx: 12 },
  { type: "rect", key: "quads", x: 104, y: 190, width: 26, height: 80, rx: 12 },
  { type: "rect", key: "calves", x: 72, y: 288, width: 22, height: 70, rx: 10 },
  { type: "rect", key: "calves", x: 106, y: 288, width: 22, height: 70, rx: 10 },
];

export const BACK_SHAPES: BodyShape[] = [
  { type: "rect", key: "traps", x: 78, y: 54, width: 44, height: 26, rx: 10 },
  { type: "ellipse", key: "rear_delts", cx: 52, cy: 68, rx: 16, ry: 14 },
  { type: "ellipse", key: "rear_delts", cx: 148, cy: 68, rx: 16, ry: 14 },
  { type: "rect", key: "lats", x: 64, y: 90, width: 26, height: 55, rx: 10 },
  { type: "rect", key: "lats", x: 110, y: 90, width: 26, height: 55, rx: 10 },
  { type: "rect", key: "triceps", x: 40, y: 64, width: 18, height: 55, rx: 9 },
  { type: "rect", key: "triceps", x: 142, y: 64, width: 18, height: 55, rx: 9 },
  { type: "rect", key: "lower_back", x: 82, y: 146, width: 36, height: 28, rx: 8 },
  { type: "ellipse", key: "glutes", cx: 82, cy: 195, rx: 20, ry: 18 },
  { type: "ellipse", key: "glutes", cx: 118, cy: 195, rx: 20, ry: 18 },
  { type: "rect", key: "hamstrings", x: 70, y: 216, width: 26, height: 64, rx: 12 },
  { type: "rect", key: "hamstrings", x: 104, y: 216, width: 26, height: 64, rx: 12 },
  { type: "rect", key: "calves", x: 72, y: 288, width: 22, height: 70, rx: 10 },
  { type: "rect", key: "calves", x: 106, y: 288, width: 22, height: 70, rx: 10 },
];

export const BODY_VIEWBOX = "0 0 200 380";
