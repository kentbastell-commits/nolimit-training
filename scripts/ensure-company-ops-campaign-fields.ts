import "dotenv/config";
import {
  getCompanyOpsConfig,
  type CompanyOpsConfig,
} from "../server/companyOps/config.ts";
import { FeishuClient } from "../server/companyOps/feishuClient.ts";

const normalize = (value: string): string =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u3000]+/g, " ")
    .trim();

interface RequiredField {
  fieldName: string;
  type: number;
  property?: Record<string, unknown>;
}

const REQUIRED_FIELDS: RequiredField[] = [
  { fieldName: "提成类型 Commission Type", type: 1 },
  { fieldName: "固定费用金额 Flat Fee Amount", type: 2, property: { formatter: "0.00" } },
  { fieldName: "超出区间提成比例% Rate Above Threshold", type: 2, property: { formatter: "0.00" } },
  { fieldName: "提成加速阈值 Threshold Amount", type: 2, property: { formatter: "0.00" } },
  { fieldName: "方案提出人 Originator", type: 1 },
  { fieldName: "活动负责人 Manager", type: 1 },
  { fieldName: "成交人 Closer", type: 1 },
  { fieldName: "申报折扣 Reported Discounts", type: 2, property: { formatter: "0.00" } },
  { fieldName: "申报退款 Reported Refunds", type: 2, property: { formatter: "0.00" } },
  { fieldName: "申报拒付 Reported Chargebacks", type: 2, property: { formatter: "0.00" } },
  { fieldName: "申报增值税 Reported VAT", type: 2, property: { formatter: "0.00" } },
  { fieldName: "净回款 Net Collected Revenue", type: 2, property: { formatter: "0.00" } },
  { fieldName: "提成规则快照 Commission Rule", type: 1 },
];

async function resolveCampaignTable(config: CompanyOpsConfig, client: FeishuClient) {
  const appToken = config.baseTokens.growth;
  if (!appToken) {
    throw new Error(
      "Growth base app token is not configured. Set FEISHU_GROWTH_BASE_APP_TOKEN or FEISHU_ADMIN_GROWTH_BASE_APP_TOKEN."
    );
  }

  const tableConfig = config.tables.campaign;
  let tableId = tableConfig.id || "";
  if (!tableId) {
    const names = new Set(tableConfig.names.map(normalize));
    const tables = await client.listTables(appToken);
    tableId = tables.find((table) => names.has(normalize(table.name)))?.table_id || "";
  }
  if (!tableId) {
    throw new Error(
      `Could not find campaign table in growth base. Looked for: ${tableConfig.names.join(", ")}`
    );
  }
  return { appToken, tableId };
}

async function main() {
  const config = getCompanyOpsConfig(process.env);
  const client = new FeishuClient(config);

  console.log("Resolving campaign table in growth base...");
  const { appToken, tableId } = await resolveCampaignTable(config, client);
  console.log(`Found campaign table: ${tableId}`);

  console.log("Listing existing fields...");
  const existingFields = await client.listFields(appToken, tableId);
  const existingNames = new Set(existingFields.map((field) => normalize(field.field_name)));

  const missing = REQUIRED_FIELDS.filter(
    (required) => !existingNames.has(normalize(required.fieldName))
  );

  if (missing.length === 0) {
    console.log("All required campaign commission fields already exist.");
    return;
  }

  console.log(`Creating ${missing.length} missing field(s)...`);
  const created: string[] = [];
  const failed: { fieldName: string; error: string }[] = [];

  for (const field of missing) {
    try {
      const result = await client.createField(appToken, tableId, field);
      created.push(`${field.fieldName} (${result.field_id})`);
      console.log(`  ✓ Created ${field.fieldName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failed.push({ fieldName: field.fieldName, error: message });
      console.error(`  ✗ Failed to create ${field.fieldName}: ${message}`);
    }
  }

  console.log("\nDone.");
  console.log(`Created: ${created.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
