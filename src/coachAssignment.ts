export type AssignmentCoach = { recordId?: string; coachId?: string; name: string; status?: string };
export type AssignmentAthlete = { id: string; name: string; coachAlias?: string; clientCode?: string; coach?: string; primaryCoach?: string; secondaryCoach?: string };

export const coachKey = (coach: AssignmentCoach) => coach.recordId || coach.coachId || coach.name;
export function resolveCoach(value: string | undefined, coaches: AssignmentCoach[]) {
  if (!value) return undefined;
  return coaches.find(c => [c.recordId, c.coachId, c.name].some(v => v && v.toLowerCase() === value.toLowerCase()));
}
export const primaryCoachValue = (athlete: AssignmentAthlete) => athlete.primaryCoach || athlete.coach || "";
export function assignmentValues(athlete: AssignmentAthlete, coaches: AssignmentCoach[]) {
  const primary = primaryCoachValue(athlete);
  const primaryCoach = resolveCoach(primary, coaches);
  const secondaryCoach = resolveCoach(athlete.secondaryCoach, coaches);
  return {
    primaryCoachId: primaryCoach ? coachKey(primaryCoach) : primary,
    secondaryCoachId: secondaryCoach ? coachKey(secondaryCoach) : athlete.secondaryCoach || "",
  };
}
