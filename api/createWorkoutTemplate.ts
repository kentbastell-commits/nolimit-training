import type { VercelRequest, VercelResponse } from "@vercel/node";

type ProgramExercise = {
  exerciseRecordId?: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: number;
  reps: string;
  tempo: string;
  rest: string;
  coachingNotes: string;
  status?: string;
};

function makeTemplateId() {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `WT-${random}`;
}

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        if (item?.link) return item.link;
        if (item?.url) return item.url;
        return JSON.stringify(item);
      })
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.link) return value.link;
  if (value?.url) return value.url;

  return JSON.stringify(value);
}

async function getTenantToken() {
  const tokenResponse = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      }),
    }
  );

  const tokenData = await tokenResponse.json();

  if (!tokenData.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.tenant_access_token;
}

async function getRecords(tableId: string, token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records?page_size=500`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!data?.data?.items) {
    throw new Error(`Could not load records: ${JSON.stringify(data)}`);
  }

  return data.data.items;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const {
      programId,
      programRecordId,
      week,
      day,
      sessionName,
      sessionType,
      sessionGoal,
      estimatedDuration,
      intensity,
      isSingleWorkout,
      exercises,
    } = req.body;

    if (!programId || !programRecordId || !week || !day || !sessionName) {
      return res.status(400).json({
        error: "Missing required fields",
        required: [
          "programId",
          "programRecordId",
          "week",
          "day",
          "sessionName",
        ],
        received: {
          programId,
          programRecordId,
          week,
          day,
          sessionName,
        },
      });
    }

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({
        error: "No exercises provided",
      });
    }

    const token = await getTenantToken();

    const exerciseRecords = await getRecords(
      process.env.FEISHU_EXERCISE_LIBRARY_TABLE_ID as string,
      token
    );

    const records = exercises.map((exercise: ProgramExercise, index: number) => {
      const matchingExercise = exercise.exerciseRecordId
        ? exerciseRecords.find(
            (item: any) => item.record_id === exercise.exerciseRecordId
          )
        : exerciseRecords.find((item: any) => {
            const fields = item.fields || {};
            return fieldToText(fields["Exercise ID"]) === exercise.exerciseId;
          });

      if (!matchingExercise) {
        throw new Error(
          `Exercise not found in Exercise Library: ${exercise.exerciseId}`
        );
      }

      return {
        fields: {
          "Template ID": makeTemplateId(),

          // Duplex link fields must be arrays of record IDs
          "Program ID": [programRecordId],
          "Exercise ID": [matchingExercise.record_id],

          Week: Number(week),
          Day: Number(day),
          "Session Name": sessionName,
          "Session Type": String(sessionType || "Strength"),
          "Session Goal": String(sessionGoal || ""),
          "Estimated Duration": Number(estimatedDuration) || "",
          Intensity: String(intensity || "Moderate"),
          "Is Single Workout": Boolean(isSingleWorkout),

          Order: Number(exercise.order) || index + 1,
          Sets: Number(exercise.sets) || 1,
          Reps: String(exercise.reps || ""),
          Tempo: String(exercise.tempo || ""),
          Rest: String(exercise.rest || ""),
          "Coaching Notes": String(exercise.coachingNotes || ""),
          Status: String(exercise.status || "Active"),
        },
      };
    });

    const createResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID}/records/batch_create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records,
        }),
      }
    );

    const createData = await createResponse.json();

    if (!createResponse.ok || createData.code !== 0) {
      return res.status(500).json({
        error: "Failed to create workout template records",
        larkResponse: createData,
        recordsSent: records,
      });
    }

    return res.status(200).json({
      success: true,
      recordsCreated: createData?.data?.records?.length || records.length,
      programId,
      programRecordId,
      larkResponse: createData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
