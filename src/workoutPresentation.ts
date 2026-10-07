import type { ProgramExercise } from './appCore';
import { normalizeBuilderSection, relabelProgramExercises } from './exerciseLabels';

export type WorkoutPresentation = { sectionNameCn?: string; exerciseTag?: string; exerciseTagCn?: string; labelColor?: string };
export const LABEL_PALETTE = ['#9b691a', '#307563', '#3f5b94', '#80528c', '#aa475c', '#586570'];
export const cleanLabelText = (value: string, max = 40) => value.replace(/[\r\n\t]/g, ' ').trim().slice(0, max);
export const safeLabelColor = (value?: string) => /^#[0-9a-f]{6}$/i.test(value || '') ? value! : '';
export function presentationMetadata(p: WorkoutPresentation) {
  return [['Section Name CN', p.sectionNameCn], ['Exercise Tag', p.exerciseTag], ['Exercise Tag CN', p.exerciseTagCn], ['Label Color', safeLabelColor(p.labelColor)]]
    .filter(([, v]) => v).map(([k, v]) => `${k}: ${cleanLabelText(v!)}`);
}
export function editWorkoutBlock(exercises: ProgramExercise[], section: string, patch: { name?: string; nameCn?: string; color?: string }) {
  const key = normalizeBuilderSection(section).toLowerCase();
  return relabelProgramExercises(exercises.map(e => normalizeBuilderSection(e.sectionName).toLowerCase() === key ? {
    ...e, sectionName: patch.name === undefined ? e.sectionName : cleanLabelText(patch.name) || e.sectionName,
    sectionNameCn: patch.nameCn ?? e.sectionNameCn,
    sectionColor: patch.color === undefined ? e.sectionColor : safeLabelColor(patch.color),
  } : e));
}
export function labelInk(hex?: string) {
  const c = safeLabelColor(hex); if (!c) return '#ffffff';
  const rgb = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .179 ? '#161715' : '#ffffff';
}
