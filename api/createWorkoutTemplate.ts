import type { VercelRequest, VercelResponse } from "@vercel/node";

type ProgramExercise = {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { programId, week, day, sessionName, exercises } = req.body;

    if (!programId || !week || !day || !sessionName) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["programId", "week", "day", "sessionName"],
      });
    }

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({
        error: "No exercises provided",
      });
    }

    const tokenResponse = await fetch(
      "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: process.env.LARK_APP_ID,
          app_secret: process.env.LARK_APP_SECRET,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.tenant_access_token) {
      return res.status(500).json({
        error: "Could not get Lark tenant access token",
        larkResponse: tokenData,
      });
    }

    const records = exercises.map((exercise: ProgramExercise, index: number) => ({
      fields: {
        "Template ID": makeTemplateId(),
        "Program ID": programId,
        Week: Number(week),
        Day: Number(day),
        "Session Name": sessionName,
        "Exercise ID": exercise.exerciseId,
        "Exercise Name": exercise.exerciseName,
        Order: Number(exercise.order) || index + 1,
        Sets: Number(exercise.sets) || 1,
        Reps: String(exercise.reps || ""),
        Tempo: String(exercise.tempo || ""),
        Rest: String(exercise.rest || ""),
        "Coaching Notes": String(exercise.coachingNotes || ""),
        Status: String(exercise.status || "Active"),
      },
    }));

    const createResponse = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_WORKOUT_TEMPLATE_TABLE_ID}/records/batch_create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
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
      larkResponse: createData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}