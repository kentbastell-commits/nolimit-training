// Category constants + color tones for the Tests page and the Physical Test
// Builder. Mirrors the workout-builder section palette (sectionAccentColor in
// App.tsx) so a test category and its matching training section share a color
// — e.g. Energy Systems tests are the same blue as conditioning sections.
//
// Category values are stable English constants: they are persisted to the
// Feishu "Category" column and compared with ===, so they must never be
// translated. Display labels are localized at render time via the
// testCategoryLabelKey() i18n key map.

export const TEST_CATEGORIES = [
  "Strength",
  "Power",
  "Speed & Agility",
  "Energy Systems",
  "Mobility & Flexibility",
  "Balance & Stability",
  "Skill & Technique",
  "Body Composition",
  "Other",
] as const;

export type TestCategory = (typeof TEST_CATEGORIES)[number];

// i18n key per category (keys live in src/i18n.ts with en + zh values).
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  Strength: "testCatStrength",
  Power: "testCatPower",
  "Speed & Agility": "testCatSpeedAgility",
  "Energy Systems": "testCatEnergySystems",
  "Mobility & Flexibility": "testCatMobility",
  "Balance & Stability": "testCatBalance",
  "Skill & Technique": "testCatSkill",
  "Body Composition": "testCatBodyComp",
  Other: "testCatOther",
};

export const testCategoryLabelKey = (category: string) =>
  CATEGORY_LABEL_KEYS[normalizeTestCategory(category)] || "testCatOther";

// Map any stored value (including legacy free text or empty) onto a canonical
// category so grouping and colors stay stable.
export const normalizeTestCategory = (category = ""): TestCategory => {
  const value = category.trim();
  if ((TEST_CATEGORIES as readonly string[]).includes(value)) {
    return value as TestCategory;
  }
  const lower = value.toLowerCase();
  if (/speed|agilit|sprint/.test(lower)) return "Speed & Agility";
  if (/power|plyo|olympic|explos|jump/.test(lower)) return "Power";
  if (/energy|conditioning|cardio|aerobic|anaerobic|endurance|interval/.test(lower))
    return "Energy Systems";
  if (/mobilit|flexib|stretch|range/.test(lower)) return "Mobility & Flexibility";
  if (/balance|stabilit|proprio/.test(lower)) return "Balance & Stability";
  if (/skill|technique|technical|climb/.test(lower)) return "Skill & Technique";
  if (/body ?comp|anthro|weight|girth|skinfold/.test(lower)) return "Body Composition";
  if (/strength|1rm|max/.test(lower)) return "Strength";
  return "Other";
};

// Accents match sectionAccentColor in App.tsx where the concepts overlap
// (strength=slate, power=amber, energy systems/cardio=blue, mobility=green,
// skill=purple, balance=teal, speed=orange like warmup). Body Composition and
// Other get their own tones.
const CATEGORY_TONES: Record<TestCategory, Record<string, string>> = {
  Strength: {
    "--test-tone": "#5b6770",
    "--test-tone-soft": "rgba(91, 103, 112, 0.12)",
    "--test-tone-border": "rgba(91, 103, 112, 0.34)",
  },
  Power: {
    "--test-tone": "#b5731a",
    "--test-tone-soft": "rgba(181, 115, 26, 0.12)",
    "--test-tone-border": "rgba(181, 115, 26, 0.34)",
  },
  "Speed & Agility": {
    "--test-tone": "#c2671c",
    "--test-tone-soft": "rgba(194, 103, 28, 0.12)",
    "--test-tone-border": "rgba(194, 103, 28, 0.34)",
  },
  "Energy Systems": {
    "--test-tone": "#3a86ff",
    "--test-tone-soft": "rgba(58, 134, 255, 0.12)",
    "--test-tone-border": "rgba(58, 134, 255, 0.34)",
  },
  "Mobility & Flexibility": {
    "--test-tone": "#2e8b3d",
    "--test-tone-soft": "rgba(46, 139, 61, 0.12)",
    "--test-tone-border": "rgba(46, 139, 61, 0.34)",
  },
  "Balance & Stability": {
    "--test-tone": "#15897a",
    "--test-tone-soft": "rgba(21, 137, 122, 0.12)",
    "--test-tone-border": "rgba(21, 137, 122, 0.34)",
  },
  "Skill & Technique": {
    "--test-tone": "#6a4bc9",
    "--test-tone-soft": "rgba(106, 75, 201, 0.12)",
    "--test-tone-border": "rgba(106, 75, 201, 0.34)",
  },
  "Body Composition": {
    "--test-tone": "#c7517a",
    "--test-tone-soft": "rgba(199, 81, 122, 0.12)",
    "--test-tone-border": "rgba(199, 81, 122, 0.34)",
  },
  Other: {
    "--test-tone": "#4f5258",
    "--test-tone-soft": "rgba(79, 82, 88, 0.12)",
    "--test-tone-border": "rgba(79, 82, 88, 0.34)",
  },
};

export const testCategoryToneStyle = (category = "") =>
  CATEGORY_TONES[normalizeTestCategory(category)] || CATEGORY_TONES.Other;
