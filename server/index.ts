import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import analytics from "../api/analytics.ts";
import assignContent from "../api/assignContent.ts";
import assignProgram from "../api/assignProgram.ts";
import checkIns from "../api/checkIns.ts";
import clients from "../api/clients.ts";
import contentAssignments from "../api/contentAssignments.ts";
import createClient from "../api/createClient.ts";
import createProgram from "../api/createProgram.ts";
import createWorkoutTemplate from "../api/createWorkoutTemplate.ts";
import deleteRecord from "../api/deleteRecord.ts";
import exerciseResults from "../api/exerciseResults.ts";
import exercises from "../api/exercises.ts";
import formTemplates from "../api/formTemplates.ts";
import programs from "../api/programs.ts";
import programTemplates from "../api/programTemplates.ts";
import saveWorkoutLog from "../api/saveWorkoutLog.ts";
import submitContentResponse from "../api/submitContentResponse.ts";
import testTemplates from "../api/testTemplates.ts";
import updateAssignedProgramDate from "../api/updateAssignedProgramDate.ts";
import updateClient from "../api/updateClient.ts";
import updateProgram from "../api/updateProgram.ts";
import upsertExercise from "../api/upsertExercise.ts";
import workoutDetails from "../api/workoutDetails.ts";
import workoutHistory from "../api/workoutHistory.ts";
import workouts from "../api/workouts.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json({ limit: "2mb" }));

const handlers = {
  analytics,
  assignContent,
  assignProgram,
  checkIns,
  clients,
  contentAssignments,
  createClient,
  createProgram,
  createWorkoutTemplate,
  deleteRecord,
  exerciseResults,
  exercises,
  formTemplates,
  programs,
  programTemplates,
  saveWorkoutLog,
  submitContentResponse,
  testTemplates,
  updateAssignedProgramDate,
  updateClient,
  updateProgram,
  upsertExercise,
  workoutDetails,
  workoutHistory,
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
