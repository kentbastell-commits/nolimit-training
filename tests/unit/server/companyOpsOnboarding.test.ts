import { describe, expect, it } from "vitest";
import {
  getCompanyOpsConfig,
  type CompanyOpsConfig,
} from "../../../server/companyOps/config.ts";
import {
  type FeishuField,
  type FeishuRecord,
  FeishuClient,
} from "../../../server/companyOps/feishuClient.ts";
import {
  CompanyOpsRepository,
  type CompanyOpsPrincipal,
} from "../../../server/companyOps/repository.ts";

const field = (
  field_name: string,
  type: number,
  is_primary = false
): FeishuField => ({
  field_id: `fld_${field_name}`,
  field_name,
  type,
  is_primary,
});

const caseFields: FeishuField[] = [
  field("入职案例 Case", 1, true),
  field("员工姓名 Employee Name", 1),
  field("飞书用户 Feishu User", 11),
  field("岗位 Role", 3),
  field("入职日期 Start Date", 5),
  field("直属负责人 Manager", 11),
  field("状态 Status", 3),
  field("完成率 Progress %", 2),
  field("保密资料 Confidential Details", 3),
  field("制度确认 Policy Acknowledgement", 3),
  field("30天复盘 Day 30 Review", 5),
  field("60天复盘 Day 60 Review", 5),
  field("90天复盘 Day 90 Review", 5),
  field("完成日期 Completed At", 5),
  field("备注 Notes", 1),
];

const templateFields: FeishuField[] = [
  field("模板编号 Template Key", 1, true),
  field("任务 Task", 1),
  field("适用岗位 Roles", 4),
  field("类别 Category", 3),
  field("相对天数 Relative Day", 2),
  field("负责人角色 Owner Role", 3),
  field("必做 Required", 7),
  field("说明 Instructions", 1),
  field("资料链接 Resource URL", 15),
  field("启用 Active", 7),
  field("排序 Sort Order", 2),
];

const taskFields: FeishuField[] = [
  field("任务 Task", 1, true),
  field("入职案例 Case", 18),
  field("任务模板 Template", 18),
  field("类别 Category", 3),
  field("负责人 Assignee", 11),
  field("截止日期 Due", 5),
  field("状态 Status", 3),
  field("必做 Required", 7),
  field("说明 Instructions", 1),
  field("资料链接 Resource URL", 15),
  field("完成证据 Evidence", 17),
  field("完成时间 Completed At", 5),
  field("复核人 Reviewer", 11),
  field("飞书任务GUID Feishu Task GUID", 1),
  field("备注 Notes", 1),
];

const template = (
  recordId: string,
  key: string,
  task: string,
  roles: string[],
  ownerRole: string,
  sortOrder: number,
  active = true
): FeishuRecord => ({
  record_id: recordId,
  fields: {
    "模板编号 Template Key": key,
    "任务 Task": task,
    "适用岗位 Roles": roles,
    "类别 Category": "培训 Training",
    "相对天数 Relative Day": sortOrder,
    "负责人角色 Owner Role": ownerRole,
    "必做 Required": true,
    "说明 Instructions": `Instructions for ${key}`,
    "资料链接 Resource URL": {
      link: "https://trainnolimit.cn/company-ops",
      text: "https://trainnolimit.cn/company-ops",
    },
    "启用 Active": active,
    "排序 Sort Order": sortOrder,
  },
});

const founder: CompanyOpsPrincipal = {
  openId: "ou_founder",
  name: "Founder",
  role: "founder",
};

interface Harness {
  repository: CompanyOpsRepository;
  records: Record<string, FeishuRecord[]>;
  creates: Array<{ tableId: string; fields: Record<string, unknown> }>;
}

const harness = (
  initialRecords: Partial<Record<string, FeishuRecord[]>> = {}
): Harness => {
  const config: CompanyOpsConfig = getCompanyOpsConfig({
    FEISHU_ADMIN_APP_ID: "cli_test",
    FEISHU_ADMIN_APP_SECRET: "secret",
    FEISHU_ADMIN_SESSION_SECRET: "a-secure-test-secret-that-is-over-32-characters",
    FEISHU_ADMIN_OAUTH_REDIRECT_URI:
      "https://trainnolimit.cn/api/companyOpsAuthCallback",
    FEISHU_ADMIN_BASE_APP_TOKEN: "confidential-token",
    FEISHU_GROWTH_BASE_APP_TOKEN: "growth-token",
    FEISHU_TEAMOPS_BASE_APP_TOKEN: "team-token",
    FEISHU_ADMIN_ONBOARDING_CASES_TABLE_ID: "tblCases",
    FEISHU_ADMIN_ONBOARDING_TEMPLATES_TABLE_ID: "tblTemplates",
    FEISHU_ADMIN_ONBOARDING_TABLE_ID: "tblTasks",
  });
  const records: Record<string, FeishuRecord[]> = {
    tblCases: [...(initialRecords.tblCases || [])],
    tblTemplates: [...(initialRecords.tblTemplates || [])],
    tblTasks: [...(initialRecords.tblTasks || [])],
  };
  const fields: Record<string, FeishuField[]> = {
    tblCases: caseFields,
    tblTemplates: templateFields,
    tblTasks: taskFields,
  };
  const creates: Harness["creates"] = [];
  const counters: Record<string, number> = {
    tblCases: records.tblCases.length,
    tblTasks: records.tblTasks.length,
  };
  const client = {
    listTables: async () => [],
    listFields: async (_appToken: string, tableId: string) => fields[tableId],
    listRecords: async (_appToken: string, tableId: string) => records[tableId] || [],
    createRecord: async (
      _appToken: string,
      tableId: string,
      newFields: Record<string, unknown>
    ) => {
      creates.push({ tableId, fields: newFields });
      counters[tableId] = (counters[tableId] || 0) + 1;
      const prefix = tableId === "tblCases" ? "recCase" : "recTask";
      const created = {
        record_id: `${prefix}${counters[tableId]}`,
        fields: newFields,
      };
      records[tableId].push(created);
      return created;
    },
  } as unknown as FeishuClient;
  return {
    repository: new CompanyOpsRepository(config, client),
    records,
    creates,
  };
};

describe("Company Operations founder-driven onboarding", () => {
  it("creates one linked case and only the active all/role templates, then reuses them", async () => {
    const value = harness({
      tblTemplates: [
        template(
          "recTemplateHire",
          "HIRE",
          "New-hire task",
          ["全员 All"],
          "新员工 New Hire",
          0
        ),
        template(
          "recTemplateFounder",
          "FOUNDER",
          "Founder task",
          ["品牌增长 Brand & Growth"],
          "创始人 Founder",
          1
        ),
        template(
          "recTemplateManager",
          "MANAGER",
          "Manager task",
          ["全员 All"],
          "直属负责人 Manager",
          2
        ),
        template(
          "recTemplateAdmin",
          "ADMIN",
          "Admin task",
          ["全员 All"],
          "行政 Admin",
          3
        ),
        template(
          "recTemplateJoint",
          "JOINT",
          "Joint task",
          ["品牌增长 Brand & Growth"],
          "共同 Joint",
          4
        ),
        template(
          "recTemplateCoach",
          "COACH_ONLY",
          "Coach-only task",
          ["教练 Coach"],
          "新员工 New Hire",
          5
        ),
        template(
          "recTemplateInactive",
          "INACTIVE",
          "Inactive task",
          ["全员 All"],
          "新员工 New Hire",
          6,
          false
        ),
      ],
    });

    const first = await value.repository.performAction(founder, {
      action: "generate_onboarding",
      payload: {
        newHireOpenId: "ou_new_hire",
        newHireName: "New Hire",
        role: "growth",
        startDate: "2026-08-15",
      },
    });

    expect(first.caseId).toBe("recCase1");
    expect(first.recordId).toBe("recCase1");
    expect(first.taskIds).toHaveLength(5);
    expect(first.recordIds).toEqual(first.taskIds);
    expect(first.warning).toContain("直属负责人 Manager");
    expect(first.warning).toContain("行政 Admin");
    expect(first.warning).toContain("共同 Joint");

    const caseCreate = value.creates.find((entry) => entry.tableId === "tblCases");
    const startDate = Date.parse("2026-08-15T00:00:00+08:00");
    expect(caseCreate?.fields).toMatchObject({
      "入职案例 Case": "New Hire · 2026-08-15",
      "员工姓名 Employee Name": "New Hire",
      "飞书用户 Feishu User": [{ id: "ou_new_hire" }],
      "岗位 Role": "品牌增长 Brand & Growth",
      "入职日期 Start Date": startDate,
      "状态 Status": "进行中 Active",
      "完成率 Progress %": 0,
      "保密资料 Confidential Details": "未提交 Missing",
      "制度确认 Policy Acknowledgement": "未完成 Missing",
      "30天复盘 Day 30 Review": startDate + 30 * 86_400_000,
      "60天复盘 Day 60 Review": startDate + 60 * 86_400_000,
      "90天复盘 Day 90 Review": startDate + 90 * 86_400_000,
    });

    const taskCreates = value.creates.filter((entry) => entry.tableId === "tblTasks");
    expect(taskCreates).toHaveLength(5);
    expect(taskCreates.map((entry) => entry.fields["任务 Task"])).toEqual([
      "New-hire task",
      "Founder task",
      "Manager task",
      "Admin task",
      "Joint task",
    ]);
    for (const entry of taskCreates) {
      expect(entry.fields["入职案例 Case"]).toEqual(["recCase1"]);
      expect(entry.fields["状态 Status"]).toBe("未开始 Todo");
      expect(entry.fields["类别 Category"]).toBe("培训 Training");
      expect(entry.fields["资料链接 Resource URL"]).toEqual({
        link: "https://trainnolimit.cn/company-ops",
        text: "https://trainnolimit.cn/company-ops",
      });
    }
    expect(taskCreates[0].fields["任务模板 Template"]).toEqual([
      "recTemplateHire",
    ]);
    expect(taskCreates[0].fields["负责人 Assignee"]).toEqual([
      { id: "ou_new_hire" },
    ]);
    expect(taskCreates[1].fields["负责人 Assignee"]).toEqual([
      { id: "ou_founder" },
    ]);
    for (const entry of taskCreates.slice(2)) {
      expect(entry.fields["负责人 Assignee"]).toEqual([
        { id: "ou_founder" },
      ]);
      expect(entry.fields["备注 Notes"]).toContain(
        "the new hire assignment was not overwritten"
      );
    }

    const second = await value.repository.performAction(founder, {
      action: "generate_onboarding",
      payload: {
        newHireOpenId: "ou_new_hire",
        newHireName: "New Hire",
        role: "品牌增长 Brand & Growth",
        startDate: "2026-08-15",
      },
    });
    expect(second.caseId).toBe("recCase1");
    expect(second.taskIds).toEqual(first.taskIds);
    expect(second.message).toContain("already present");
    expect(value.creates).toHaveLength(6);
  });

  it("fails closed when duplicate cases exist for the same user and Shanghai start date", async () => {
    const startDate = Date.parse("2026-08-15T00:00:00+08:00");
    const existingCase = (record_id: string): FeishuRecord => ({
      record_id,
      fields: {
        "入职案例 Case": record_id,
        "飞书用户 Feishu User": [{ id: "ou_new_hire" }],
        "岗位 Role": "品牌增长 Brand & Growth",
        "入职日期 Start Date": startDate,
      },
    });
    const value = harness({
      tblCases: [existingCase("recCaseA"), existingCase("recCaseB")],
      tblTemplates: [
        template(
          "recTemplateHire",
          "HIRE",
          "New-hire task",
          ["全员 All"],
          "新员工 New Hire",
          0
        ),
      ],
    });

    await expect(value.repository.performAction(founder, {
      action: "generate_onboarding",
      payload: {
        newHireOpenId: "ou_new_hire",
        newHireName: "New Hire",
        role: "growth",
        startDate: "2026-08-15",
      },
    })).rejects.toMatchObject({
      status: 409,
      message: "More than one onboarding case exists for this employee and start date",
    });
    expect(value.creates).toHaveLength(0);
  });
});
