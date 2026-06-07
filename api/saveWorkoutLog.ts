const fields: Record<string, any> = {
  "Log ID": `LOG-${Date.now()}-${createdRecords.length + 1}`,

  "Client ID": [{ record_id: clientId }],
  "Assigned Workout ID": [{ record_id: assignedWorkoutRecordId }],

  "Exercise ID": String(log.exerciseId || ""),
  "Date": workoutDate,

  "Set Number": toNumber(log.setNumber),
  "Prescribed Sets": toNumber(log.prescribedSets),
  "Prescribed Reps": String(log.prescribedReps || ""),
  "Actual Reps": String(log.actualReps || ""),
  "Actual Weight": toNumber(log.actualWeight),

  "Athlete Notes": String(log.athleteNotes || ""),
  "Exercise Order": toNumber(log.exerciseOrder),
  "Completed": true,
};