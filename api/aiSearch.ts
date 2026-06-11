import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { query, exercises } = req.body;
  if (!query || !Array.isArray(exercises))
    return res.status(400).json({ error: "query and exercises required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const exerciseList = exercises
    .map(
      (e: { exerciseName: string; movementPattern?: string; equipment?: string }) =>
        `${e.exerciseName} (${e.movementPattern || "general"}, ${e.equipment || "bodyweight"})`
    )
    .join("\n");

  const prompt = `You are a strength and conditioning coach assistant. Given an exercise library and a coach's search query, return the 6 most relevant exercises.

SEARCH QUERY: "${query}"

EXERCISE LIBRARY:
${exerciseList}

Return ONLY a JSON array of exercise names exactly as they appear in the library, ordered by relevance. Maximum 6 results. If none are relevant return [].
Example: ["Exercise Name 1", "Exercise Name 2"]`;

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
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text: string = data?.content?.[0]?.text || "[]";
    const match = text.match(/\[[\s\S]*\]/);
    const names: string[] = match ? JSON.parse(match[0]) : [];

    return res.status(200).json({ names });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "AI search failed", message });
  }
}
