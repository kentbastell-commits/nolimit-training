import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrateSource = readFileSync(
  new URL("../../../scripts/company-ops/migrate.mjs", import.meta.url),
  "utf8",
);
const verifySource = readFileSync(
  new URL("../../../scripts/company-ops/verify.mjs", import.meta.url),
  "utf8",
);
const attributionRepairSource = readFileSync(
  new URL(
    "../../../server/db/migrations/0018_marketing_attribution_repair.sql",
    import.meta.url,
  ),
  "utf8",
);
const migrationJournal = JSON.parse(
  readFileSync(
    new URL("../../../server/db/migrations/meta/_journal.json", import.meta.url),
    "utf8",
  ),
) as {
  entries: Array<{ idx: number; when: number; tag: string }>;
};

describe("Company Ops migration safety contract", () => {
  it("hardens every Base before the first schema mutation", () => {
    const authenticate = migrateSource.indexOf("await client.authenticate();");
    const resolveIdentities = migrateSource.indexOf(
      "await resolveFounderAdminIdentities();",
    );
    const hardenBases = migrateSource.indexOf(
      "await ensureResourceSecurity(baseSecurityResources, founderPrincipals);",
    );
    const ensureFirstTable = migrateSource.indexOf(
      "tableMaps[baseKey] = await ensureTables(baseKey, baseSpec, appToken);",
    );

    expect(authenticate).toBeGreaterThan(-1);
    expect(resolveIdentities).toBeGreaterThan(authenticate);
    expect(hardenBases).toBeGreaterThan(resolveIdentities);
    expect(ensureFirstTable).toBeGreaterThan(hardenBases);
  });

  it("contains no delete or reminder-notification operation", () => {
    expect(migrateSource).not.toMatch(/\bclient\.delete\s*\(/);
    expect(migrateSource).not.toMatch(/method\s*:\s*["']DELETE["']/);
    expect(migrateSource).not.toContain("need_notification: true");
    expect(migrateSource).not.toMatch(/from\s+["'].+reminders\.mjs["']/);
  });

  it("uses the narrow Feishu create-table request contract", () => {
    const ensureTablesStart = migrateSource.indexOf("async function ensureTables");
    const ensureTablesEnd = migrateSource.indexOf("function optionNames", ensureTablesStart);
    const ensureTablesSource = migrateSource.slice(ensureTablesStart, ensureTablesEnd);

    expect(ensureTablesSource).toContain("const desiredPrimary = fieldPayload");
    expect(ensureTablesSource).toContain("fields: [primary]");
    expect(ensureTablesSource).not.toContain("description: desiredPrimary.description");
    // Unlike the create-field endpoint, Feishu's create-table endpoint does
    // not accept a client_token query parameter.
    expect(ensureTablesSource).not.toContain("idempotent: true");
  });

  it("serializes field descriptions and single-user properties for Feishu", async () => {
    const { fieldPayload } = await import("../../../scripts/company-ops/schema.mjs");
    const payload = fieldPayload(
      {
        name: "飞书用户 Feishu User",
        type: 11,
        property: { multiple: false },
        description: "员工的飞书账号。",
      },
      new Map(),
    );

    expect(payload).toEqual({
      field_name: "飞书用户 Feishu User",
      type: 11,
      property: { multiple: false },
      description: {
        text: "员工的飞书账号。",
        disable_sync: false,
      },
    });
  });

  it("verifies the Confidential collaborator allowlist and closed Base sharing", () => {
    expect(verifySource).toContain('/user/v4/app_admin_user/list');
    expect(verifySource).toContain("unexpected direct collaborator(s)");
    expect(verifySource).toContain("unsafe public/tenant-edit settings");
    expect(verifySource).toContain('link_share_entity: "closed"');
    expect(verifySource).toContain('share_entity: "only_full_access"');
  });

  it("accepts a verified explicit founder when the optional app-admin scope is unavailable", () => {
    expect(verifySource).toContain("let administratorLookupError");
    expect(verifySource).toContain(
      "verified the explicit founder allowlist instead",
    );
    expect(verifySource).toContain(
      "administratorLookupError && config.founderOpenIds.length",
    );
  });

  it("repairs skipped attribution migrations idempotently after every prior migration", () => {
    const repair = migrationJournal.entries.find(
      ({ tag }) => tag === "0018_marketing_attribution_repair",
    );

    expect(repair).toBeDefined();
    const latestPriorTimestamp = Math.max(
      ...migrationJournal.entries
        .filter(({ idx }) => idx < repair!.idx)
        .map(({ when }) => when),
    );
    expect(repair!.when).toBeGreaterThan(latestPriorTimestamp);
    expect(attributionRepairSource.match(/ADD COLUMN IF NOT EXISTS/g)).toHaveLength(6);
    expect(attributionRepairSource.match(/CREATE INDEX IF NOT EXISTS/g)).toHaveLength(2);
    expect(attributionRepairSource).not.toMatch(/\bDROP\b|\bDELETE\b|\bTRUNCATE\b/i);
  });
});
