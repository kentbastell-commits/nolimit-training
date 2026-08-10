#!/usr/bin/env node
import {
  FeishuClient,
  loadCompanyOpsConfig,
} from "./client.mjs";

const config = loadCompanyOpsConfig();

if (!config.founderOpenIds.length) {
  const client = new FeishuClient(config, { writeDelayMs: 0 });
  const members = await client.paginate(
    `/drive/v1/permissions/${config.bases.confidential}/members`,
    { query: { type: "bitable" } },
  );
  const candidates = members.filter(
    (member) =>
      member?.perm === "full_access" &&
      ["openid", "open_id"].includes(member?.member_type) &&
      member?.member_id,
  );
  if (candidates.length !== 1) {
    throw new Error(
      "Safe founder discovery requires exactly one Confidential full-access Open ID. " +
        `Found ${candidates.length}; configure FEISHU_FOUNDER_OPEN_IDS explicitly.`,
    );
  }

  const founderId = candidates[0].member_id;
  const response = await client.get(
    `/contact/v3/users/${encodeURIComponent(founderId)}`,
    { query: { user_id_type: "open_id" } },
  );
  const user = response?.data?.user;
  if (
    user?.is_tenant_manager !== true ||
    user?.status?.is_activated !== true ||
    user?.status?.is_frozen === true ||
    user?.status?.is_exited === true
  ) {
    throw new Error(
      "The sole Confidential full-access collaborator is not an active Feishu tenant manager.",
    );
  }

  // Keep the discovered ID in this process only. Never print or persist it.
  process.env.FEISHU_FOUNDER_OPEN_IDS = founderId;
}

process.argv = process.argv.filter((argument) => argument !== "--dry");
if (!process.argv.includes("--apply")) process.argv.push("--apply");
await import("./migrate.mjs");
