import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { exerciseName, sets, reps, tempo, trackingType, isUnilateral } = req.body;
  if (!exerciseName)
    return res.status(400).json({ error: "exerciseName required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const prescription = [
    sets && `${sets} sets`,
    reps && `${reps} reps`,
    tempo && `tempo ${tempo}`,
    trackingType && `tracked by ${String(trackingType).toLowerCase()}`,
    isUnilateral && "unilateral (each side)",
  ]
    .filter(Boolean)
    .join(", ");

  const prompt = `You are an expert strength and conditioning coach specializing in climbing and athletic performance. Write concise, practical coaching notes for the following exercise to be shown to a client.

Exercise: ${exerciseName}
Prescription: ${prescription || "standard sets/reps"}

Write 2-4 bullet points covering key technique cues, common mistakes to avoid, and a scaling option if useful. Keep each bullet to one short sentence. Use "•" as the bullet character. No headers. Write in English only.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const notes: string = data?.content?.[0]?.text?.trim() || "";
    return res.status(200).json({ notes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Notes generation failed", message });
  }
}
