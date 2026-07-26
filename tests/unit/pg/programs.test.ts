// Ported from tests/unit/api/{programs,createProgram,updateProgram,
// duplicateProgram}.test.ts. Program authoring is the coach's core tool, and
// its riskiest edge is the storefront: a program is what buyers see and pay
// for, so what gets published — and what must not be — is pinned here.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import listHandler from "../../../api/programs.ts";
import createHandler from "../../../api/createProgram.ts";
import updateHandler from "../../../api/updateProgram.ts";
import duplicateHandler from "../../../api/duplicateProgram.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedProgram } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

async function post(handler: any, body: Record<string, any>) {
  const res = makeRes();
  await handler(makeReq({ method: "POST", body }) as any, res as any);
  return res;
}

async function seedTemplate(id: string, programId: string, week: number, day: number) {
  await pool.query(
    `insert into workout_templates
       (template_id, program_id, week, day, session_name, session_type, exercise_name, exercise_order, sets, reps)
     values ($1, $2, $3, $4, $5, 'Strength', 'Back Squat', 1, 3, '5')`,
    [id, programId, week, day, `W${week}D${day}`]
  );
}

describe("api/createProgram (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await createHandler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400s without a program name", async () => {
    const res = await post(createHandler, { sport: "Climbing" });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from programs")).toHaveLength(0);
  });

  it("creates a program with a minted id", async () => {
    const res = await post(createHandler, { programName: "Season 1 Base" });
    expect(res.statusCode).toBe(200);

    const [program] = await rows("select program_id, name from programs");
    expect(program.program_id).toMatch(/^PR-/);
    expect(program.name).toBe("Season 1 Base");
  });

  it("is not on the storefront unless asked", async () => {
    await post(createHandler, { programName: "Draft Program" });

    // A newly authored program must never be purchasable by default —
    // publishing is an explicit act.
    const [program] = await rows("select public_store_visible from programs");
    expect(program.public_store_visible).toBe(false);
  });

  it("publishes to the store when explicitly requested", async () => {
    await post(createHandler, { programName: "For Sale", publicStoreVisible: true, price: 499 });

    const [program] = await rows("select public_store_visible, price from programs");
    expect(program.public_store_visible).toBe(true);
    expect(Number(program.price)).toBe(499);
  });
});

describe("api/updateProgram (postgres)", () => {
  it("400s without a programRecordId", async () => {
    const res = await post(updateHandler, { programName: "x" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing programRecordId");
  });

  it("400s when the payload has nothing to update", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    const res = await post(updateHandler, { programRecordId: "PR-1001" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("No fields to update");
  });

  it("updates only the fields provided", async () => {
    await seedProgram({
      program_id: "PR-1001",
      name: "Test Program",
      sport: "Climbing",
      price: "499",
    });

    const res = await post(updateHandler, { programRecordId: "PR-1001", programName: "Renamed" });
    expect(res.statusCode).toBe(200);

    const [program] = await rows("select name, sport, price from programs");
    expect(program.name).toBe("Renamed");
    // The editor didn't send these; a replace-style write would have blanked
    // them (#43).
    expect(program.sport).toBe("Climbing");
    expect(Number(program.price)).toBe(499);
  });

  it("can pull a program off the storefront", async () => {
    await seedProgram({ program_id: "PR-1001", name: "For Sale", public_store_visible: true });

    const res = await post(updateHandler, {
      programRecordId: "PR-1001",
      publicStoreVisible: false,
    });
    expect(res.statusCode).toBe(200);

    const [program] = await rows("select public_store_visible from programs");
    expect(program.public_store_visible).toBe(false);
  });
});

describe("api/duplicateProgram (postgres)", () => {
  it("400s without a programRecordId", async () => {
    const res = await post(duplicateHandler, { mode: "full" });
    expect(res.statusCode).toBe(400);
  });

  it("clones the program record and every session", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Season 1", sport: "Climbing" });
    await seedTemplate("WT-1", "PR-1001", 1, 1);
    await seedTemplate("WT-2", "PR-1001", 1, 3);
    await seedTemplate("WT-3", "PR-1001", 2, 1);

    const res = await post(duplicateHandler, { programRecordId: "PR-1001" });
    expect(res.statusCode).toBe(200);

    const programs = await rows("select program_id, name from programs order by program_id");
    expect(programs).toHaveLength(2);

    const clone = programs.find((p) => p.program_id !== "PR-1001")!;
    const cloned = await rows(
      "select week, day from workout_templates where program_id = $1 order by week, day",
      [clone.program_id]
    );
    expect(cloned).toHaveLength(3);
    // Week/day layout must survive the clone — collapsing an intentional
    // Day 1/3 gap is exactly the renumber bug from #35.
    expect(cloned.map((r) => `${r.week}/${r.day}`)).toEqual(["1/1", "1/3", "2/1"]);
  });

  it("never puts the clone on the storefront", async () => {
    await seedProgram({
      program_id: "PR-1001",
      name: "For Sale",
      public_store_visible: true,
      price: "499",
    });
    await seedTemplate("WT-1", "PR-1001", 1, 1);

    await post(duplicateHandler, { programRecordId: "PR-1001" });

    const clone = (await rows("select program_id, public_store_visible from programs")).find(
      (p) => p.program_id !== "PR-1001"
    )!;
    // A working copy of a published program must not itself be purchasable,
    // or a half-edited draft goes on sale.
    expect(clone.public_store_visible).toBe(false);
  });

  it("copies one week onto another in week mode", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Season 1" });
    await seedTemplate("WT-1", "PR-1001", 1, 1);
    await seedTemplate("WT-2", "PR-1001", 1, 4);

    const res = await post(duplicateHandler, {
      programRecordId: "PR-1001",
      mode: "week",
      fromWeek: 1,
      toWeek: 2,
    });
    expect(res.statusCode).toBe(200);

    const week2 = await rows(
      "select day from workout_templates where program_id = 'PR-1001' and week = 2 order by day"
    );
    expect(week2.map((r) => r.day)).toEqual([1, 4]);
    // Still one program — week mode copies inside it.
    expect(await rows("select 1 from programs")).toHaveLength(1);
  });

  it("400s in week mode without both weeks", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Season 1" });
    await seedTemplate("WT-1", "PR-1001", 1, 1);

    const res = await post(duplicateHandler, { programRecordId: "PR-1001", mode: "week", fromWeek: 1 });
    expect(res.statusCode).toBe(400);
  });

  it("404s when the source week has no sessions", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Season 1" });
    await seedTemplate("WT-1", "PR-1001", 1, 1);

    const res = await post(duplicateHandler, {
      programRecordId: "PR-1001",
      mode: "week",
      fromWeek: 5,
      toWeek: 6,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("api/programs list (postgres)", () => {
  it("returns [] when there are none", async () => {
    const res = makeRes();
    await listHandler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body.programs).toEqual([]);
  });

  it("exposes recordId as the business id on Postgres", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Season 1" });

    const res = makeRes();
    await listHandler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.body.programs).toHaveLength(1);
    // The store's checkout sends recordId back as the program link, so this
    // equivalence is load-bearing for purchases.
    expect(res.body.programs[0].recordId).toBe("PR-1001");
    expect(res.body.programs[0].programId).toBe("PR-1001");
  });
});
