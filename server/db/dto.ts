// Data-transfer shapes returned by the repository layer. These match what the
// API handlers already return, so the frontend is unaffected by the backend
// swap. Backend implementations (Feishu / Postgres) both produce these.

export type ExerciseDTO = {
  recordId: string;
  exerciseId: string;
  exerciseName: string;
  exerciseNameCn: string;
  videoUrl: string;
  videoUrlCn: string;
  longVideoUrl: string;
  category: string;
  categoryCn: string;
  equipment: string;
  equipmentCn: string;
  movementPattern: string;
  movementPatternCn: string;
  primaryMuscles: string;
  primaryMusclesCn: string;
  technicalInstructionsCn: string;
  coachingCuesCn: string;
  commonMistakesCn: string;
  notes: string;
  defaultMetric: string;
  metricCategory: string;
  usesAutoTarget: boolean;
  status: string;
};

export type ExerciseListResult = {
  exercises: ExerciseDTO[];
  availableFields: string[]; // Feishu field introspection (debug); [] on Postgres
};
