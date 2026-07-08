// Static regression tests for server/index.ts. Importing the module would
// start the Express server (app.listen + fetch-wrapping side effects), so the
// file is analysed as text instead. The real recurring bug this guards: a new
// api/<name>.ts handler that was never imported/registered in server/index.ts,
// which silently 404s in production while working on Vercel.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const serverSource = fs.readFileSync(
  path.join(repoRoot, "server", "index.ts"),
  "utf8"
);

// Every public handler module in api/ (helpers are _-prefixed by convention).
const handlerNames = fs
  .readdirSync(path.join(repoRoot, "api"))
  .filter((file) => file.endsWith(".ts") && !file.startsWith("_"))
  .map((file) => file.replace(/\.ts$/, ""));

// The literal `const handlers = { ... };` registration map.
const handlersBlockMatch = serverSource.match(
  /const handlers = \{([\s\S]*?)\n\};/
);

describe("server/index.ts handler registration", () => {
  it("finds handler modules in api/ and the handlers map in the server", () => {
    expect(handlerNames.length).toBeGreaterThan(0);
    expect(handlersBlockMatch).not.toBeNull();
  });

  it.each(handlerNames)("imports api/%s.ts", (name) => {
    expect(
      serverSource.includes(`from "../api/${name}.ts"`),
      `server/index.ts is missing an import for api/${name}.ts — ` +
        `the endpoint /api/${name} will 404 on the self-hosted server`
    ).toBe(true);
  });

  it.each(handlerNames)("registers %s in the handlers map", (name) => {
    const block = handlersBlockMatch![1];
    const registered = new RegExp(`(^|[\\s{,])${name}\\s*[,:}]`).test(block);
    expect(
      registered,
      `api/${name}.ts is imported but not listed in the handlers map — ` +
        `the endpoint /api/${name} will 404 on the self-hosted server`
    ).toBe(true);
  });

  it("gates coach-only handlers through COACH_ONLY_HANDLERS + coachKeyOk", () => {
    // The auth helpers must be imported from the shared module…
    expect(serverSource).toContain('from "../api/_coachAuth.ts"');
    expect(serverSource).toMatch(
      /import \{[^}]*COACH_ONLY_HANDLERS[^}]*coachKeyOk[^}]*\}/
    );
    // …and actually enforced in the routing loop with a 401 short-circuit.
    expect(serverSource).toContain("COACH_ONLY_HANDLERS.has(name)");
    expect(serverSource).toMatch(
      /COACH_ONLY_HANDLERS\.has\(name\)[\s\S]{0,200}?status\(401\)/
    );
  });

  it("registers every handler under /api/<name> via app.all", () => {
    expect(serverSource).toContain("Object.entries(handlers).forEach(");
    expect(serverSource).toContain("app.all(`/api/${name}`");
  });
});
