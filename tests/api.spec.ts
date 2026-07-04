import { test, expect } from "@playwright/test";

// Read-only API health: every list endpoint answers 200 with JSON.
const ENDPOINTS = [
  "analytics",
  "athleteMetrics",
  "checkIns",
  "clients",
  "coaches",
  "contentAssignments",
  "contentResponses",
  "enquiries",
  "exerciseResults",
  "exercises",
  "formTemplates",
  "formVideos",
  "notifications",
  "productOrders",
  "programs",
  "reviews",
  "subscriptions",
  "teams",
  "testTemplates",
  "workloadLogs",
  "workoutComments",
  "workoutHistory",
  "workouts",
];

for (const ep of ENDPOINTS) {
  test(`GET /api/${ep} responds 200 JSON`, async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/api/${ep}`);
    expect(res.status(), `status for ${ep}`).toBe(200);
    const body = await res.json();
    expect(body, `body for ${ep}`).toBeTruthy();
  });
}
