import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import activateDigitalOrder from "../api/activateDigitalOrder.ts";
import analytics from "../api/analytics.ts";
import autoLoadProgram from "../api/autoLoadProgram.ts";
import assignContent from "../api/assignContent.ts";
import assignProgram from "../api/assignProgram.ts";
import athleteMetrics from "../api/athleteMetrics.ts";
import checkIns from "../api/checkIns.ts";
import clients from "../api/clients.ts";
import coaches from "../api/coaches.ts";
import contentResponses from "../api/contentResponses.ts";
import contentAssignments from "../api/contentAssignments.ts";
import createClient from "../api/createClient.ts";
import createProductOrder from "../api/createProductOrder.ts";
import createProgram from "../api/createProgram.ts";
import createWorkoutTemplate from "../api/createWorkoutTemplate.ts";
import deleteRecord from "../api/deleteRecord.ts";
import duplicateAssignedWorkout from "../api/duplicateAssignedWorkout.ts";
import exerciseResults from "../api/exerciseResults.ts";
import exercises from "../api/exercises.ts";
import formTemplates from "../api/formTemplates.ts";
import notifications from "../api/notifications.ts";
import productOrders from "../api/productOrders.ts";
import programs from "../api/programs.ts";
import recordLogin from "../api/recordLogin.ts";
import programTemplates from "../api/programTemplates.ts";
import reviewWorkoutComment from "../api/reviewWorkoutComment.ts";
import saveWorkoutLog from "../api/saveWorkoutLog.ts";
import submitContentResponse from "../api/submitContentResponse.ts";
import teams from "../api/teams.ts";
import testTemplates from "../api/testTemplates.ts";
import updateAssignedProgramDate from "../api/updateAssignedProgramDate.ts";
import updateContentAssignmentDate from "../api/updateContentAssignmentDate.ts";
import updateClient from "../api/updateClient.ts";
import updateProductOrder from "../api/updateProductOrder.ts";
import updateProgram from "../api/updateProgram.ts";
import upsertCoach from "../api/upsertCoach.ts";
import upsertExercise from "../api/upsertExercise.ts";
import upsertTeam from "../api/upsertTeam.ts";
import workoutDetails from "../api/workoutDetails.ts";
import workoutHistory from "../api/workoutHistory.ts";
import workoutComments from "../api/workoutComments.ts";
import workouts from "../api/workouts.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json({ limit: "2mb" }));

const handlers = {
  activateDigitalOrder,
  analytics,
  autoLoadProgram,
  assignContent,
  assignProgram,
  athleteMetrics,
  checkIns,
  clients,
  coaches,
  contentResponses,
  contentAssignments,
  createClient,
  createProductOrder,
  createProgram,
  createWorkoutTemplate,
  deleteRecord,
  duplicateAssignedWorkout,
  exerciseResults,
  exercises,
  formTemplates,
  notifications,
  productOrders,
  programs,
  recordLogin,
  programTemplates,
  reviewWorkoutComment,
  saveWorkoutLog,
  submitContentResponse,
  teams,
  testTemplates,
  updateAssignedProgramDate,
  updateContentAssignmentDate,
  updateClient,
  updateProductOrder,
  updateProgram,
  upsertCoach,
  upsertExercise,
  upsertTeam,
  workoutDetails,
  workoutHistory,
  workoutComments,
  workouts,
};

Object.entries(handlers).forEach(([name, handler]) => {
  app.all(`/api/${name}`, (req, res) => {
    void Promise.resolve(handler(req as never, res as never)).catch((error) => {
      console.error(`API handler failed: ${name}`, error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Server error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
  });
});

const distPath = path.resolve(__dirname, "../dist");

app.use(express.static(distPath));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, "127.0.0.1", () => {
  console.log(`NoLimit Training server listening on http://127.0.0.1:${port}`);
});
