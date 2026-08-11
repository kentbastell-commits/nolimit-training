import { describe, expect, it, vi } from "vitest";
import {
  getCompanyOpsConfig,
  type CompanyOpsConfig,
  type CompanyOpsResource,
} from "../../../server/companyOps/config.ts";
import {
  canPerformAction,
  createOAuthState,
  createSession,
  requireMutationCsrf,
  verifyOAuthState,
  verifySessionToken,
} from "../../../server/companyOps/auth.ts";
import {
  FeishuClient,
  resetCompanyOpsFeishuTokenCacheForTests,
  type FeishuField,
  type FeishuRecord,
} from "../../../server/companyOps/feishuClient.ts";
import {
  CompanyOpsRepository,
  type CompanyOpsPrincipal,
} from "../../../server/companyOps/repository.ts";

const env = {
  FEISHU_ADMIN_APP_ID: "cli_test",
  FEISHU_ADMIN_APP_SECRET: "app-secret",
  FEISHU_ADMIN_SESSION_SECRET: "a-secure-test-secret-that-is-over-32-characters",
  FEISHU_ADMIN_OAUTH_REDIRECT_URI:
    "https://ops.example.test/api/companyOpsAuthCallback",
  FEISHU_ADMIN_COOKIE_SECURE: "true",
  FEISHU_ADMIN_BASE_APP_TOKEN: "confidential-token",
  FEISHU_GROWTH_BASE_APP_TOKEN: "growth-token",
  FEISHU_TEAMOPS_BASE_APP_TOKEN: "team-token",
  FEISHU_ADMIN_STAFF_TABLE_ID: "tblStaff",
};

const config = (): CompanyOpsConfig => getCompanyOpsConfig(env);

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

const staffPrincipal: CompanyOpsPrincipal = {
  openId: "ou_staff",
  name: "Staff Member",
  role: "staff",
  staffRecordId: "recStaff",
};

const growthPrincipal: CompanyOpsPrincipal = {
  openId: "ou_growth",
  name: "Growth Owner",
  role: "growth",
  staffRecordId: "recGrowth",
};

const founderPrincipal: CompanyOpsPrincipal = {
  openId: "ou_founder",
  name: "Founder",
  role: "founder",
  staffRecordId: "recFounder",
};

const pendingPrincipal: CompanyOpsPrincipal = {
  openId: "ou_pending",
  name: "Pending Employee",
  role: "pending",
};

const tableIds: Record<CompanyOpsResource, string> = {
  staff: "tblStaff",
  goal: "tblGoal",
  content: "tblContent",
  lead: "tblLead",
  partner: "tblPartner",
  campaign: "tblCampaign",
  experiment: "tblExperiment",
  weeklyReport: "tblWeekly",
  metrics: "tblMetrics",
  expense: "tblExpense",
  payroll: "tblPayroll",
  commission: "tblCommission",
  performance: "tblPerformance",
  policyAcknowledgement: "tblPolicy",
  support: "tblSupport",
  internalRequest: "tblRequest",
  onboardingCase: "tblOnboardingCase",
  onboardingTemplate: "tblOnboardingTemplate",
  onboarding: "tblOnboarding",
};

const policyFields: FeishuField[] = [
  field("确认记录 Acknowledgement", 1, true),
  field("员工 Employee", 18),
  field("确认人 Acknowledged By", 11),
  field("文件 Document", 3),
  field("文件版本 Document Version", 1),
  field("已阅读并确认 Read & Acknowledged", 7),
  field("确认时间 Acknowledged At", 1001),
];

const commissionFields: FeishuField[] = [
  field("记录 Record", 1, true),
  field("月份 Month", 1),
  field("员工 Employee", 18),
  field("归属销售额 Attributed Revenue", 2),
  field("比例% Rate", 2),
  field("提成金额 Amount", 2),
  field("季度增长奖金 Growth Bonus", 2),
  field("状态 Status", 3),
  field("员工确认时间 Acknowledged At", 5),
  field("异议截止 Dispute Deadline", 5),
  field("异议状态 Dispute Status", 3),
  field("异议说明 Dispute Notes", 1),
  field("已锁定 Locked", 7),
];

const payrollFields: FeishuField[] = [
  field("记录 Record", 1, true),
  field("月份 Month", 1),
  field("员工 Employee", 18),
  field("基本工资 Base", 2),
  field("月度绩效奖金 Perf Bonus", 2),
  field("提成 Commission", 2),
  field("奖金 Bonus", 2),
  field("报销 Reimbursements", 2),
  field("扣款 Deductions", 2),
  field("实发 Net Pay", 2),
  field("状态 Status", 3),
  field("已锁定 Locked", 7),
];

const performanceCategoryFields = [
  "内容规划与交付(25) Content & Delivery",
  "内容质量与优化(20) Quality",
  "活动与合作(20) Campaigns & Partners",
  "社群线索转化(15) Community & Leads",
  "组织与主人翁(20) Ownership",
] as const;

const performanceFields: FeishuField[] = [
  field("记录 Record", 1, true),
  field("员工 Employee", 18),
  field("月份 Month", 1),
  field("直属负责人 Manager", 11),
  field("状态 Status", 3),
  field("报告截止 Report Due", 5),
  field("目标确认时间 Priorities Confirmed At", 5),
  ...Array.from({ length: 5 }, (_, offset) => field(`目标 ${offset + 1} Goal ${offset + 1}`, 1)),
  ...Array.from({ length: 5 }, (_, offset) => field(`衡量标准 ${offset + 1} Measure ${offset + 1}`, 1)),
  ...Array.from({ length: 5 }, (_, offset) => field(`成果 ${offset + 1} Result ${offset + 1}`, 1)),
  ...performanceCategoryFields.map((name) => field(name, 2)),
  field("总分 Total", 2),
  field("奖金 Bonus (税前)", 2),
  field("个人系数 Personal Factor", 2),
  field("员工自评 Self Review", 1),
  field("证据链接 Evidence Links", 1),
  field("问题与背景 Context", 1),
  field("报告提交时间 Report Submitted At", 5),
  field("创始人评语 Founder Review", 1),
  field("奖金计算规则 Bonus Formula", 1),
  field("初评时间 Scored At", 5),
  field("员工异议/说明 Employee Response", 1),
  field("员工回应时间 Employee Responded At", 5),
  field("异议状态 Dispute Status", 3),
  field("定稿时间 Finalized At", 5),
  field("工资入账时间 Payroll Staged At", 5),
];

const fixedPerformanceGoals = Array.from({ length: 5 }, (_, offset) => ({
  index: offset + 1,
  title: `Goal ${offset + 1}`,
  measure: `Measurable result ${offset + 1}`,
}));

const fixedPerformanceResults = Array.from({ length: 5 }, (_, offset) => ({
  index: offset + 1,
  result: `Completed result ${offset + 1}`,
}));

const fixedPerformanceScores = (score: number) =>
  Array.from({ length: 5 }, (_, offset) => ({ index: offset + 1, score }));

const performanceRecord = (
  fields: Record<string, unknown> = {},
  employeeStaffRecordId = "recStaff",
  recordId = "recPerformance"
): FeishuRecord => ({
  record_id: recordId,
  fields: {
    "记录 Record": `2026-08 · ${employeeStaffRecordId}`,
    "员工 Employee": [employeeStaffRecordId],
    "月份 Month": "2026-08",
    "直属负责人 Manager": [{ id: "ou_founder", name: "Founder" }],
    "状态 Status": "目标已确认 Goals Set",
    "报告截止 Report Due": Date.parse("2026-08-31"),
    ...Object.fromEntries(
      fixedPerformanceGoals.flatMap((goal) => [
        [`目标 ${goal.index} Goal ${goal.index}`, goal.title],
        [`衡量标准 ${goal.index} Measure ${goal.index}`, goal.measure],
      ])
    ),
    ...fields,
  },
});

const contentFields: FeishuField[] = [
  field("内容 Content", 1, true),
  field("平台 Platform", 3),
  field("内容支柱分类 Pillar Category", 3),
  field("目标类型 Objective Type", 3),
  field("发布日期 Publish Date", 5),
  field("状态 Status", 3),
  field("负责人 Owner (Feishu)", 11),
];

const leadFields: FeishuField[] = [
  field("线索 Lead", 1, true),
  field("微信/联系 Contact", 1),
  field("来源 Source", 3),
  field("意向产品 Interest", 3),
  field("下一步 Next Action", 1),
  field("阶段 Stage", 3),
  field("负责人（飞书） Owner (Feishu)", 11),
];

const partnerFields: FeishuField[] = [
  field("伙伴 Partner", 1, true),
  field("平台/账号 Platform & Handle", 1),
  field("受众匹配 Audience Fit", 3),
  field("交付物与期限 Deliverables", 1),
  field("下次跟进 Next Follow-up", 5),
  field("阶段 Stage", 3),
  field("负责人 Owner", 11),
];

const campaignFields: FeishuField[] = [
  field("活动 Campaign", 1, true),
  field("目标 Objective", 1),
  field("目标受众 Target Audience", 4),
  field("核心卖点 Offer", 1),
  field("产品 Product", 3),
  field("渠道 Channels", 4),
  field("预算 Budget", 2),
  field("开始 Start", 5),
  field("结束 End", 5),
  field("状态 Status", 3),
  field("负责人 Owner", 11),
  field("目标回款 Revenue Target", 2),
  field("成功标准 Success Criteria", 1),
  field("提交时间 Submitted At", 5),
  field("审批人 Approver", 11),
  field("批准时间 Approved At", 5),
  field("审核意见 Review Note", 1),
  field("活动代码 Campaign Code", 1),
  field("员工归因代码 Staff Attribution Code", 1),
  field("跟踪包 Tracking Kit", 1),
  field("员工归因比例% Attribution Share", 2),
  field("批准提成比例% Commission Rate", 2),
  field("提成规则快照 Commission Rule", 1),
  field("线下申报回款 Reported Offline Revenue", 2),
  field("退款与调整 Refunds & Adjustments", 2),
  field("核准归因回款 Eligible Revenue", 2),
  field("活动提成金额 Campaign Commission", 2),
  field("结果总结 Results Summary", 1),
  field("证据链接 Evidence Links", 1),
  field("结果提交时间 Results Submitted At", 5),
  field("核对时间 Reconciled At", 5),
  field("核对说明 Reconciliation Note", 1),
  field("触达/曝光 Reach", 2),
  field("点击 Clicks", 2),
  field("咨询 Consultations", 2),
];

const experimentFields: FeishuField[] = [
  field("实验 Experiment", 1, true),
  field("假设 Hypothesis", 1),
  field("变量 Variable", 1),
  field("渠道 Channel", 4),
  field("成功指标 Success Metric", 1),
  field("基线 Baseline", 2),
  field("目标 Target", 2),
  field("开始 Start", 5),
  field("结束 End", 5),
  field("状态 Status", 3),
  field("负责人 Owner", 11),
];

const metricsFields: FeishuField[] = [
  field("记录 Record", 1, true),
  field("平台 Platform", 3),
  field("期初粉丝 Start Followers", 2),
  field("期末粉丝 End Followers", 2),
  field("发布数 Posts", 2),
  field("总播放/曝光 Views", 2),
  field("互动 Engagement", 2),
  field("主页访问 Profile Visits", 2),
  field("点击 Clicks", 2),
  field("线索 Leads", 2),
  field("归因收入 Revenue", 2),
  field("学习 Learning", 1),
];

const supportFields: FeishuField[] = [
  field("问题编号/标题 Issue ID / Title", 1, true),
  field("严重级别 Severity", 3),
  field("问题类型 Issue Type", 3),
  field("功能模块 Feature", 1),
  field("设备/系统 Device / OS", 1),
  field("问题描述 Description", 1),
  field("复现步骤 Repro Steps", 1),
  field("受影响数量 Affected Count", 2),
  field("临时方案 Workaround", 1),
  field("状态 Status", 3),
  field("报告人 Reporter", 11),
];

const weeklyFields: FeishuField[] = [
  field("报告 Report", 1, true),
  field("A 完成事项 Completed", 1),
  field("B 主要成果 Results", 1),
  field("C 问题 Problems", 1),
  field("D 学习 Learnings", 1),
  field("E 需要决策 Decisions Needed", 1),
  field("F 下周优先级 Next Priorities", 1),
  field("状态 Status", 3),
  field("提交人 Author", 11),
  field("创始人反馈 Founder Feedback", 1),
];

const expenseFields: FeishuField[] = [
  field("事项 Item", 1, true),
  field("日期 Date", 5),
  field("类别 Category", 3),
  field("金额 Amount", 2),
  field("币种 Currency", 3),
  field("业务目的 Business Purpose", 1),
  field("关联项目 Related Project", 1),
  field("事先审批 Pre-approved", 7),
  field("事前审批参考 Pre-approval Ref", 1),
  field("票据链接 Receipt URL", 15),
  field("票据说明 Receipt Note", 1),
  field("状态 Status", 3),
];

const requestFields: FeishuField[] = [
  field("请求 Request", 1, true),
  field("类别 Category", 3),
  field("备注 Notes", 1),
  field("优先级 Priority", 3),
  field("截止 Due", 5),
  field("状态 Status", 3),
  field("提出人（飞书） Requested By (Feishu)", 11),
  field("处理结果 Resolution", 1),
];

const staffAccessFields: FeishuField[] = [
  field("姓名 Name", 1, true),
  field("飞书用户 Feishu User", 11),
  field("应用角色 App Role", 3),
  field("状态 Status", 3),
];

interface RepositoryHarness {
  repository: CompanyOpsRepository;
  created: Array<{ tableId: string; fields: Record<string, unknown> }>;
  updated: Array<{ tableId: string; recordId: string; fields: Record<string, unknown> }>;
  sent: Array<{ openId: string; text: string }>;
}

const repositoryHarness = (
  recordsByTable: Record<string, FeishuRecord[]> = {},
  fieldsByTable: Record<string, FeishuField[]> = {},
  envOverrides: Record<string, string> = {}
): RepositoryHarness => {
  const created: RepositoryHarness["created"] = [];
  const updated: RepositoryHarness["updated"] = [];
  const sent: RepositoryHarness["sent"] = [];
  const value = Object.keys(envOverrides).length
    ? getCompanyOpsConfig({ ...env, ...envOverrides })
    : config();
  for (const [resource, tableId] of Object.entries(tableIds)) {
    value.tables[resource as CompanyOpsResource].id = tableId;
  }
  const fakeClient = {
    listTables: async () => [],
    listFields: async (_appToken: string, tableId: string) =>
      fieldsByTable[tableId] || [],
    listRecords: async (_appToken: string, tableId: string) =>
      recordsByTable[tableId] || [],
    getRecord: async (
      _appToken: string,
      tableId: string,
      recordId: string
    ) => {
      const record = (recordsByTable[tableId] || []).find(
        (item) => item.record_id === recordId
      );
      if (!record) throw new Error(`Missing fake record ${tableId}/${recordId}`);
      return record;
    },
    createRecord: async (
      _appToken: string,
      tableId: string,
      fields: Record<string, unknown>
    ) => {
      created.push({ tableId, fields });
      return { record_id: "recCreated", fields };
    },
    updateRecord: async (
      _appToken: string,
      tableId: string,
      recordId: string,
      fields: Record<string, unknown>
    ) => {
      updated.push({ tableId, recordId, fields });
      return { record_id: recordId, fields };
    },
    sendTextMessage: async (openId: string, text: string) => {
      sent.push({ openId, text });
    },
  } as unknown as FeishuClient;
  return {
    repository: new CompanyOpsRepository(value, fakeClient),
    created,
    updated,
    sent,
  };
};

describe("Company Operations configuration and sessions", () => {
  it("uses the existing canonical Growth and Team Ops token variables", () => {
    const value = config();
    expect(value.baseTokens.growth).toBe("growth-token");
    expect(value.baseTokens.teamOps).toBe("team-token");
  });

  it("rejects a tampered HMAC session cookie", () => {
    const value = config();
    const { token, session } = createSession(value, {
      openId: "ou_test_user",
      name: "Test User",
      role: "growth",
    });
    expect(verifySessionToken(token, value)?.csrfToken).toBe(session.csrfToken);
    expect(verifySessionToken(`${token}tampered`, value)).toBeUndefined();
  });

  it("binds OAuth state to the same browser cookie", () => {
    const value = config();
    const { token } = createOAuthState(value, "/company-ops?page=growth");
    expect(verifyOAuthState(token, token, value).returnTo).toBe(
      "/company-ops?page=growth"
    );
    expect(() => verifyOAuthState(token, `${token}x`, value)).toThrow(
      "could not be verified"
    );
  });

  it.each([
    "/\\\\evil.example/path",
    "/%2f%2fevil.example/path",
    "/%5c%5cevil.example/path",
    "/%252f%252fevil.example/path",
    "/company-ops%0d%0aLocation:%20https://evil.example",
    "/company-ops\u0000",
    "https://evil.example/company-ops",
    "//evil.example/company-ops",
  ])("rejects an unsafe OAuth return path: %s", (returnTo) => {
    const value = config();
    const { token } = createOAuthState(value, returnTo);
    expect(verifyOAuthState(token, token, value).returnTo).toBe(
      "/company-ops"
    );
  });

  it("revalidates a configured fallback before placing it in OAuth state", () => {
    const value = config();
    value.afterLoginPath = "/\\\\evil.example/path";
    const { token } = createOAuthState(value, undefined);
    expect(verifyOAuthState(token, token, value).returnTo).toBe(
      "/company-ops"
    );
  });

  it("requires both the session CSRF token and the configured origin", () => {
    const value = config();
    const { session } = createSession(value, {
      openId: "ou_test_user",
      name: "Test User",
      role: "staff",
    });
    const request = {
      headers: {
        "content-type": "application/json",
        "x-csrf-token": session.csrfToken,
        origin: "https://ops.example.test",
      },
    } as never;
    expect(() => requireMutationCsrf(request, session, value)).not.toThrow();
    expect(() =>
      requireMutationCsrf(
        {
          headers: {
            "content-type": "application/json",
            "x-csrf-token": session.csrfToken,
            origin: "https://evil.example",
          },
        } as never,
        session,
        value
      )
    ).toThrow("invalid origin");
  });

  it("keeps role action allowlists narrow", () => {
    expect(canPerformAction("growth", "create_content_idea")).toBe(true);
    expect(canPerformAction("staff", "create_content_idea")).toBe(false);
    expect(canPerformAction("finance", "approve_access")).toBe(false);
    expect(canPerformAction("pending", "request_access")).toBe(true);
    expect(canPerformAction("pending", "submit_expense")).toBe(false);
  });
});

describe("Feishu identity and role resolution", () => {
  it("accepts application administrator user_id when open_id is unavailable", async () => {
    resetCompanyOpsFeishuTokenCacheForTests();
    const responses = [
      new Response(
        JSON.stringify({
          code: 0,
          tenant_access_token: "tenant-token",
          expire: 7200,
        }),
        { status: 200 }
      ),
      new Response(
        JSON.stringify({
          code: 0,
          data: { user_list: [{ user_id: "founder-user-id" }] },
        }),
        { status: 200 }
      ),
    ];
    const client = new FeishuClient(
      config(),
      (async () => responses.shift() || new Response("{}")) as typeof fetch
    );
    const ids = await client.listApplicationAdminIds();
    expect(ids.userIds.has("founder-user-id")).toBe(true);
    expect(ids.openIds.size).toBe(0);
  });

  it("maps a unique active Staff record by Feishu Open ID", async () => {
    const fields: FeishuField[] = [
      { field_id: "fldName", field_name: "Name", type: 1, is_primary: true },
      { field_id: "fldOpen", field_name: "Feishu Open ID", type: 1 },
      { field_id: "fldRole", field_name: "Role", type: 1 },
      { field_id: "fldStatus", field_name: "Status", type: 3 },
    ];
    const records: FeishuRecord[] = [
      {
        record_id: "recYumei",
        fields: {
          Name: "Yumei",
          "Feishu Open ID": "ou_yumei",
          Role: "Brand Growth & Content Operations Specialist",
          Status: "Active",
        },
      },
    ];
    const fakeClient = {
      listFields: async () => fields,
      listRecords: async () => records,
    } as unknown as FeishuClient;
    const value = config();
    value.appAdminsAreFounders = false;
    const repository = new CompanyOpsRepository(value, fakeClient);
    const principal = await repository.resolvePrincipal({
      openId: "ou_yumei",
      name: "OAuth Name",
      role: "pending",
    });
    expect(principal.role).toBe("growth");
    expect(principal.staffRecordId).toBe("recYumei");
    expect(principal.name).toBe("Yumei");
  });

  it("fails closed when duplicate Staff records map to one Open ID", async () => {
    const fields: FeishuField[] = [
      { field_id: "fldName", field_name: "Name", type: 1, is_primary: true },
      { field_id: "fldOpen", field_name: "Feishu Open ID", type: 1 },
      { field_id: "fldRole", field_name: "Role", type: 1 },
    ];
    const records: FeishuRecord[] = [
      { record_id: "recOne", fields: { Name: "One", "Feishu Open ID": "ou_duplicate", Role: "staff" } },
      { record_id: "recTwo", fields: { Name: "Two", "Feishu Open ID": "ou_duplicate", Role: "founder" } },
    ];
    const fakeClient = {
      listFields: async () => fields,
      listRecords: async () => records,
    } as unknown as FeishuClient;
    const value = config();
    value.appAdminsAreFounders = false;
    const repository = new CompanyOpsRepository(value, fakeClient);
    const principal = await repository.resolvePrincipal({
      openId: "ou_duplicate",
      name: "Duplicate",
      role: "pending",
    });
    expect(principal.role).toBe("pending");
    expect(principal.staffRecordId).toBeUndefined();
  });
});

describe("Company Operations quick-action Feishu contracts", () => {
  it("stores a content idea with exact bilingual fields and authoritative workflow state", async () => {
    const { repository, created } = repositoryHarness({}, {
      tblContent: contentFields,
    });

    await repository.performAction(growthPrincipal, {
      action: "create_content_idea",
      payload: {
        workingTitle: "Three ways to improve footwork",
        platform: "xiaohongshu",
        contentPillar: "education",
        objective: "educate",
        plannedPublishDate: "2026-08-14",
        status: "Published",
      },
    });

    expect(created).toEqual([{ tableId: "tblContent", fields: {
      "内容 Content": "Three ways to improve footwork",
      "平台 Platform": "小红书 XHS",
      "内容支柱分类 Pillar Category": "专业教育 Education",
      "目标类型 Objective Type": "教育 Educate",
      "发布日期 Publish Date": Date.parse("2026-08-14"),
      "状态 Status": "想法 Idea",
      "负责人 Owner (Feishu)": [{ id: "ou_growth" }],
    } }]);
  });

  it("stores a lead with supported select values and cannot be client-promoted", async () => {
    const { repository, created } = repositoryHarness({}, {
      tblLead: leadFields,
    });

    await repository.performAction(growthPrincipal, {
      action: "create_lead",
      payload: {
        name: "Prospective Client 42",
        contact: "wechat-id-42",
        source: "referral",
        productInterest: "online coaching",
        nextAction: "Invite to a consultation",
        stage: "Won",
      },
    });

    expect(created).toEqual([{ tableId: "tblLead", fields: {
      "线索 Lead": "Prospective Client 42",
      "微信/联系 Contact": "wechat-id-42",
      "来源 Source": "转介绍 Referral",
      "意向产品 Interest": "线上1:1 Online Coaching",
      "下一步 Next Action": "Invite to a consultation",
      "阶段 Stage": "新 New",
      "负责人（飞书） Owner (Feishu)": [{ id: "ou_growth" }],
    } }]);
  });

  it("stores a partner and assigns the exact live Owner user field", async () => {
    const { repository, created } = repositoryHarness({}, {
      tblPartner: partnerFields,
    });

    await repository.performAction(growthPrincipal, {
      action: "create_partner",
      payload: {
        name: "Climbing Creator",
        platform: "xiaohongshu",
        handle: "@climbing-creator",
        audienceFit: "high",
        proposedCollaboration: "Two educational videos",
        nextFollowUpAt: "2026-08-18",
        stage: "Active",
      },
    });

    expect(created).toEqual([{ tableId: "tblPartner", fields: {
      "伙伴 Partner": "Climbing Creator",
      "平台/账号 Platform & Handle": "xiaohongshu · @climbing-creator",
      "受众匹配 Audience Fit": "高 High",
      "交付物与期限 Deliverables": "Two educational videos",
      "下次跟进 Next Follow-up": Date.parse("2026-08-18"),
      "阶段 Stage": "调研 Research",
      "负责人 Owner": [{ id: "ou_growth" }],
    } }]);
  });

  it("submits a complete campaign proposal in Pending Approval state", async () => {
    const { repository, created } = repositoryHarness({}, {
      tblCampaign: campaignFields,
    });

    await repository.performAction(growthPrincipal, {
      action: "create_campaign",
      payload: {
        name: "Autumn strength launch",
        objective: "Generate qualified consultations",
        targetAudience: "climbers",
        offer: "Four-week assessment and plan",
        product: "digital",
        channels: "xiaohongshu",
        budget: "2500",
        revenueTarget: "25000",
        successCriteria: "CNY 25,000 collected and 30 qualified leads",
        start: "2026-09-01",
        end: "2026-09-30",
      },
    });

    expect(created).toEqual([{ tableId: "tblCampaign", fields: {
      "活动 Campaign": "Autumn strength launch",
      "目标 Objective": "Generate qualified consultations",
      "目标受众 Target Audience": ["攀岩者 Climbers"],
      "核心卖点 Offer": "Four-week assessment and plan",
      "产品 Product": "数字计划 Digital",
      "渠道 Channels": ["小红书 XHS"],
      "预算 Budget": 2500,
      "目标回款 Revenue Target": 25000,
      "成功标准 Success Criteria": "CNY 25,000 collected and 30 qualified leads",
      "开始 Start": Date.parse("2026-09-01"),
      "结束 End": Date.parse("2026-09-30"),
      "状态 Status": "待批准 Pending Approval",
      "提交时间 Submitted At": expect.any(Number),
      "负责人 Owner": [{ id: "ou_growth" }],
    } }]);
  });

  it("rejects client-supplied campaign workflow fields", async () => {
    const { repository, created } = repositoryHarness({}, {
      tblCampaign: campaignFields,
    });
    await expect(repository.performAction(growthPrincipal, {
      action: "create_campaign",
      payload: {
        name: "Crafted campaign",
        objective: "Promote itself",
        targetAudience: "climbers",
        offer: "Offer",
        product: "digital",
        channels: "xiaohongshu",
        budget: 0,
        revenueTarget: 10_000,
        successCriteria: "Ten paid orders",
        start: "2026-09-01",
        end: "2026-09-30",
        campaignCode: "CLIENT-CODE",
      },
    })).rejects.toThrow("Unknown fields: campaignCode");
    expect(created).toHaveLength(0);
  });

  it("lets only the founder approve a submitted campaign and generates stable attribution links", async () => {
    const record: FeishuRecord = {
      record_id: "recCampaignApproval",
      fields: {
        "活动 Campaign": "Autumn strength launch",
        "产品 Product": "数字计划 Digital",
        "渠道 Channels": ["小红书 XHS", "抖音 Douyin"],
        "目标回款 Revenue Target": 50_000,
        "状态 Status": "待批准 Pending Approval",
        "负责人 Owner": [{ id: "ou_growth", name: "Growth Owner" }],
      },
    };
    const { repository, updated } = repositoryHarness(
      { tblCampaign: [record] },
      { tblCampaign: campaignFields },
    );

    await expect(repository.performAction(growthPrincipal, {
      action: "campaign.review",
      payload: { campaignId: record.record_id, decision: "approve" },
    })).rejects.toThrow("do not have permission");

    await repository.performAction(founderPrincipal, {
      action: "campaign.review",
      payload: {
        campaignId: record.record_id,
        decision: "approve",
        feedback: "Approved for launch",
        attributionSharePercent: 100,
      },
    });

    expect(updated).toHaveLength(1);
    expect(updated[0].recordId).toBe(record.record_id);
    expect(updated[0].fields).toMatchObject({
      "状态 Status": "已批准 Approved",
      "审核意见 Review Note": "Approved for launch",
      "审批人 Approver": [{ id: "ou_founder" }],
      "员工归因比例% Attribution Share": 100,
      "批准提成比例% Commission Rate": 4,
      "提成规则快照 Commission Rule": expect.stringContaining("4% / 5% / 6%"),
      "活动代码 Campaign Code": expect.stringMatching(/^CMP-\d{6}-[A-F0-9]{6}$/),
      "员工归因代码 Staff Attribution Code": expect.stringMatching(/^STF-[A-F0-9]{7}$/),
      "批准时间 Approved At": expect.any(Number),
    });
    const tracking = JSON.parse(String(updated[0].fields["跟踪包 Tracking Kit"]));
    expect(tracking).toHaveLength(2);
    expect(tracking[0].url).toContain("utm_campaign=CMP-");
    expect(tracking[0].url).toContain("staff=STF-");
    expect(tracking[0].url).not.toContain("Growth+Owner");
  });

  it("prevents bypassing the campaign workflow through generic status updates", async () => {
    const record: FeishuRecord = {
      record_id: "recCampaignStatus",
      fields: {
        "活动 Campaign": "Protected campaign",
        "状态 Status": "待批准 Pending Approval",
        "负责人 Owner": [{ id: "ou_growth" }],
      },
    };
    const { repository, updated } = repositoryHarness(
      { tblCampaign: [record] },
      { tblCampaign: campaignFields },
    );
    await expect(repository.performAction(founderPrincipal, {
      action: "update_status",
      payload: { resource: "campaign", recordId: record.record_id, status: "Active" },
    })).rejects.toThrow("approval and reconciliation workflow");
    expect(updated).toHaveLength(0);
  });

  it("moves an owner through activation and evidence-backed results submission", async () => {
    const approved: FeishuRecord = {
      record_id: "recCampaignApproved",
      fields: {
        "活动 Campaign": "Approved owner campaign",
        "状态 Status": "已批准 Approved",
        "负责人 Owner": [{ id: "ou_growth", name: "Growth Owner" }],
        "活动代码 Campaign Code": "CMP-202608-D4E5F6",
      },
    };
    const active: FeishuRecord = {
      record_id: "recCampaignActive",
      fields: {
        "活动 Campaign": "Active owner campaign",
        "状态 Status": "进行中 Active",
        "负责人 Owner": [{ id: "ou_growth", name: "Growth Owner" }],
      },
    };
    const { repository, updated } = repositoryHarness(
      { tblCampaign: [approved, active] },
      { tblCampaign: campaignFields },
    );

    await repository.performAction(growthPrincipal, {
      action: "campaign.activate",
      payload: { campaignId: approved.record_id },
    });
    await repository.performAction(growthPrincipal, {
      action: "campaign.results.submit",
      payload: {
        campaignId: active.record_id,
        resultsSummary: "Collected the contracted amount and documented the campaign outcome.",
        evidenceLinks: "https://example.feishu.cn/file/campaign-evidence",
        manualRevenue: 1000,
        adjustments: 200,
        reach: 5000,
        clicks: 250,
        consultations: 20,
      },
    });

    expect(updated[0].fields).toMatchObject({ "状态 Status": "进行中 Active" });
    expect(updated[1].fields).toMatchObject({
      "状态 Status": "待核对 Reconciliation",
      "线下申报回款 Reported Offline Revenue": 1000,
      "退款与调整 Refunds & Adjustments": 200,
      "证据链接 Evidence Links": "https://example.feishu.cn/file/campaign-evidence",
      "结果提交时间 Results Submitted At": expect.any(Number),
    });
  });

  it("subtracts refunds from the maximum reconciled revenue and stages no automatic payout", async () => {
    const record: FeishuRecord = {
      record_id: "recCampaignReconcile",
      fields: {
        "活动 Campaign": "Campaign ready to reconcile",
        "产品 Product": "数字计划 Digital",
        "目标回款 Revenue Target": 25_000,
        "状态 Status": "待核对 Reconciliation",
        "负责人 Owner": [{ id: "ou_growth", name: "Growth Owner" }],
        "活动代码 Campaign Code": "CMP-202608-A1B2C3",
        "员工归因比例% Attribution Share": 100,
        "批准提成比例% Commission Rate": 4,
        "线下申报回款 Reported Offline Revenue": 1000,
        "退款与调整 Refunds & Adjustments": 200,
      },
    };
    const { repository, updated } = repositoryHarness(
      { tblCampaign: [record] },
      { tblCampaign: campaignFields },
    );

    await expect(repository.performAction(founderPrincipal, {
      action: "campaign.reconcile",
      payload: {
        campaignId: record.record_id,
        eligibleRevenue: 801,
        reconciliationNote: "Reviewed offline collection and refund evidence.",
      },
    })).rejects.toThrow("after refunds and adjustments (CNY 800.00)");

    await repository.performAction(founderPrincipal, {
      action: "campaign.reconcile",
      payload: {
        campaignId: record.record_id,
        eligibleRevenue: 800,
        reconciliationNote: "Reviewed offline collection and refund evidence.",
      },
    });
    expect(updated).toHaveLength(1);
    expect(updated[0].fields).toMatchObject({
      "状态 Status": "已核对 Reconciled",
      "核准归因回款 Eligible Revenue": 800,
      "活动提成金额 Campaign Commission": 32,
      "核对说明 Reconciliation Note": "Reviewed offline collection and refund evidence.",
      "核对时间 Reconciled At": expect.any(Number),
    });
    expect(updated[0].fields).not.toHaveProperty("支付状态 Payment Status");
  });

  it("stores a growth experiment with exact fields and Idea state", async () => {
    const { repository, created } = repositoryHarness({}, {
      tblExperiment: experimentFields,
    });

    await repository.performAction(growthPrincipal, {
      action: "create_experiment",
      payload: {
        name: "Short hook test",
        hypothesis: "A shorter hook increases completion rate",
        variable: "Opening hook length",
        channel: "douyin",
        successMetric: "Completion rate",
        baseline: "31.5",
        target: "38",
        start: "2026-08-15",
        end: "2026-08-29",
        status: "Running",
      },
    });

    expect(created).toEqual([{ tableId: "tblExperiment", fields: {
      "实验 Experiment": "Short hook test",
      "假设 Hypothesis": "A shorter hook increases completion rate",
      "变量 Variable": "Opening hook length",
      "渠道 Channel": ["抖音 Douyin"],
      "成功指标 Success Metric": "Completion rate",
      "基线 Baseline": 31.5,
      "目标 Target": 38,
      "开始 Start": Date.parse("2026-08-15"),
      "结束 End": Date.parse("2026-08-29"),
      "状态 Status": "想法 Idea",
      "负责人 Owner": [{ id: "ou_growth" }],
    } }]);
  });

  it("stores every platform-metrics value under the exact live column", async () => {
    const { repository, created } = repositoryHarness({}, {
      tblMetrics: metricsFields,
    });

    await repository.performAction(growthPrincipal, {
      action: "submit_platform_metrics",
      payload: {
        period: "2026-W33",
        platform: "wechat channels",
        startFollowers: "1200",
        endFollowers: "1288",
        posts: "4",
        views: "32000",
        engagement: "1800",
        profileVisits: "620",
        clicks: "140",
        leads: "12",
        revenue: "9800",
        learning: "Technique explainers generated the strongest inquiries.",
        status: "Approved",
      },
    });

    expect(created).toEqual([{ tableId: "tblMetrics", fields: {
      "记录 Record": "2026-W33",
      "平台 Platform": "视频号 Channels",
      "期初粉丝 Start Followers": 1200,
      "期末粉丝 End Followers": 1288,
      "发布数 Posts": 4,
      "总播放/曝光 Views": 32000,
      "互动 Engagement": 1800,
      "主页访问 Profile Visits": 620,
      "点击 Clicks": 140,
      "线索 Leads": 12,
      "归因收入 Revenue": 9800,
      "学习 Learning": "Technique explainers generated the strongest inquiries.",
    } }]);
  });

  it("stores a support issue with exact select values and New state", async () => {
    const { repository, created } = repositoryHarness({}, {
      tblSupport: supportFields,
    });

    await repository.performAction(growthPrincipal, {
      action: "create_support_issue",
      payload: {
        title: "Video preview crops the athlete",
        severity: "P1",
        issueType: "ux",
        feature: "Workout video",
        deviceOs: "iPhone 15 / iOS 19",
        description: "The preview uses an incorrect crop.",
        reproductionSteps: "Open a workout and view a portrait video.",
        affectedCount: "7",
        workaround: "Open full screen.",
        status: "Resolved",
      },
    });

    expect(created).toEqual([{ tableId: "tblSupport", fields: {
      "问题编号/标题 Issue ID / Title": "Video preview crops the athlete",
      "严重级别 Severity": "P1 高 High",
      "问题类型 Issue Type": "易用性 UX",
      "功能模块 Feature": "Workout video",
      "设备/系统 Device / OS": "iPhone 15 / iOS 19",
      "问题描述 Description": "The preview uses an incorrect crop.",
      "复现步骤 Repro Steps": "Open a workout and view a portrait video.",
      "受影响数量 Affected Count": 7,
      "临时方案 Workaround": "Open full screen.",
      "状态 Status": "新建 New",
      "报告人 Reporter": [{ id: "ou_growth" }],
    } }]);
  });

  it("stores a weekly report with exact sections and Submitted state", async () => {
    const { repository, created } = repositoryHarness({}, {
      tblWeekly: weeklyFields,
    });

    await repository.performAction(growthPrincipal, {
      action: "submit_weekly_report",
      payload: {
        reportingWeek: "2026-08-10",
        completed: "Published three videos.",
        results: "Twelve qualified leads.",
        problems: "One filming delay.",
        learnings: "Education content converts best.",
        decisionsNeeded: "Approve September filming budget.",
        nextWeek: "Launch the autumn campaign.",
        status: "Reviewed",
      },
    });

    expect(created).toEqual([{ tableId: "tblWeekly", fields: {
      "报告 Report": "2026-08-10",
      "A 完成事项 Completed": "Published three videos.",
      "B 主要成果 Results": "Twelve qualified leads.",
      "C 问题 Problems": "One filming delay.",
      "D 学习 Learnings": "Education content converts best.",
      "E 需要决策 Decisions Needed": "Approve September filming budget.",
      "F 下周优先级 Next Priorities": "Launch the autumn campaign.",
      "状态 Status": "已提交 Submitted",
      "提交人 Author": [{ id: "ou_growth" }],
    } }]);
  });

  it("serializes an expense receipt as an HTTPS Feishu URL object and fixes Pending state", async () => {
    const { repository, created } = repositoryHarness({}, {
      tblExpense: expenseFields,
    });

    await repository.performAction(staffPrincipal, {
      action: "submit_expense",
      payload: {
        category: "transport",
        amount: "186.50",
        currency: "THB",
        expenseDate: "2026-08-09",
        businessPurpose: "Travel to a partner filming location.",
        relatedProject: "Autumn strength launch",
        preapproved: false,
        priorApprovalReference: "",
        receiptUrl: "https://example.feishu.cn/file/receipt-123",
        receiptNote: "Taxi receipt",
        status: "Reimbursed",
      },
    });

    expect(created).toEqual([{ tableId: "tblExpense", fields: {
      "事项 Item": "transport — 2026-08-09",
      "日期 Date": Date.parse("2026-08-09"),
      "类别 Category": "交通 Transport",
      "金额 Amount": 186.5,
      "币种 Currency": "THB",
      "业务目的 Business Purpose": "Travel to a partner filming location.",
      "关联项目 Related Project": "Autumn strength launch",
      "事先审批 Pre-approved": false,
      "票据链接 Receipt URL": {
        link: "https://example.feishu.cn/file/receipt-123",
        text: "https://example.feishu.cn/file/receipt-123",
      },
      "票据说明 Receipt Note": "Taxi receipt",
      "状态 Status": "待审批 Pending",
    } }]);
  });

  it("rejects an expense without the required receipt and never writes a record", async () => {
    const { repository, created } = repositoryHarness({}, {
      tblExpense: expenseFields,
    });

    await expect(repository.performAction(staffPrincipal, {
      action: "submit_expense",
      payload: {
        category: "meals",
        amount: 80,
        currency: "CNY",
        expenseDate: "2026-08-09",
        businessPurpose: "Approved client meeting.",
        preapproved: true,
        receiptUrl: "",
      },
    })).rejects.toMatchObject({ status: 400, message: "receiptUrl is required" });
    expect(created).toHaveLength(0);
  });

  it("rejects a non-HTTPS expense receipt and never writes a record", async () => {
    const { repository, created } = repositoryHarness({}, {
      tblExpense: expenseFields,
    });

    await expect(repository.performAction(staffPrincipal, {
      action: "submit_expense",
      payload: {
        category: "meals",
        amount: 80,
        currency: "CNY",
        expenseDate: "2026-08-09",
        businessPurpose: "Approved client meeting.",
        preapproved: true,
        receiptUrl: "http://files.example.test/receipt",
      },
    })).rejects.toMatchObject({ status: 400, message: "receiptUrl must use HTTPS" });
    expect(created).toHaveLength(0);
  });

  it("stores founder-decision and access requests in the exact Internal Requests contract", async () => {
    const founderRequestHarness = repositoryHarness({}, {
      tblRequest: requestFields,
    });
    await founderRequestHarness.repository.performAction(growthPrincipal, {
      action: "request_founder_decision",
      payload: {
        title: "Approve September filming budget",
        category: "spend",
        context: "Two location days are required.",
        neededBy: "2026-08-20",
      },
    });
    expect(founderRequestHarness.created).toEqual([{ tableId: "tblRequest", fields: {
      "请求 Request": "Approve September filming budget",
      "类别 Category": "其他 Other",
      "备注 Notes": "[Founder Decision: spend]\nTwo location days are required.",
      "优先级 Priority": "高 High",
      "截止 Due": Date.parse("2026-08-20"),
      "状态 Status": "待处理 Open",
      "提出人（飞书） Requested By (Feishu)": [{ id: "ou_growth" }],
    } }]);

    const accessHarness = repositoryHarness({}, { tblRequest: requestFields });
    await accessHarness.repository.performAction(pendingPrincipal, {
      action: "request_access",
      payload: { requestedRole: "growth", reason: "I manage social content." },
    });
    expect(accessHarness.created).toEqual([{ tableId: "tblRequest", fields: {
      "请求 Request": "Company Operations access — Pending Employee",
      "类别 Category": "IT/账号 IT & Accounts",
      "备注 Notes": "Requested role: growth\nReason: I manage social content.",
      "优先级 Priority": "高 High",
      "状态 Status": "待处理 Open",
      "提出人（飞书） Requested By (Feishu)": [{ id: "ou_pending" }],
    } }]);
  });

  it("rejects a founder-decision request that tries to set its own status", async () => {
    const { repository, created } = repositoryHarness({}, {
      tblRequest: requestFields,
    });
    await expect(repository.performAction(growthPrincipal, {
      action: "request_founder_decision",
      payload: {
        title: "Bypass review",
        category: "content",
        context: "This must stay pending.",
        neededBy: "2026-08-20",
        status: "Done",
      },
    })).rejects.toMatchObject({ status: 400, message: "Unknown fields: status" });
    expect(created).toHaveLength(0);
  });
});

describe("Company Operations founder decision actionType routing", () => {
  it.each([
    ["approve_decision", "已批准 Approved"],
    ["request_decision_changes", "已拒绝 Rejected"],
  ] as const)("routes an expense %s to Expenses", async (action, status) => {
    const { repository, updated } = repositoryHarness(
      { tblExpense: [{ record_id: "recExpense", fields: { "状态 Status": "待审批 Pending" } }] },
      { tblExpense: expenseFields }
    );
    await repository.performAction(founderPrincipal, {
      action,
      payload: { decisionId: "recExpense", actionType: "expense", feedback: "Checked" },
    });
    expect(updated).toEqual([{ tableId: "tblExpense", recordId: "recExpense", fields: {
      "状态 Status": status,
    } }]);
  });

  it.each([
    ["approve_decision", "创始人已阅 Reviewed", "Reviewed"],
    ["request_decision_changes", "已提交 Submitted", "Please add source links."],
  ] as const)("routes a weekly-report %s to Weekly Reports", async (action, status, feedback) => {
    const { repository, updated } = repositoryHarness(
      { tblWeekly: [{ record_id: "recWeekly", fields: { "状态 Status": "已提交 Submitted" } }] },
      { tblWeekly: weeklyFields }
    );
    await repository.performAction(founderPrincipal, {
      action,
      payload: {
        decisionId: "recWeekly",
        actionType: "weekly_report",
        feedback: action === "approve_decision" ? "" : feedback,
      },
    });
    expect(updated).toEqual([{ tableId: "tblWeekly", recordId: "recWeekly", fields: {
      "状态 Status": status,
      "创始人反馈 Founder Feedback": feedback,
    } }]);
  });

  it.each([
    ["approve_decision", "完成 Done"],
    ["request_decision_changes", "进行中 Doing"],
  ] as const)("routes a founder-decision %s to Internal Requests", async (action, status) => {
    const { repository, updated } = repositoryHarness(
      { tblRequest: [{
        record_id: "recDecision",
        fields: {
          "备注 Notes": "[Founder Decision: content]\nApprove the script.",
          "状态 Status": "待处理 Open",
        },
      }] },
      { tblRequest: requestFields }
    );
    await repository.performAction(founderPrincipal, {
      action,
      payload: {
        decisionId: "recDecision",
        actionType: "founder_decision",
        feedback: "Clear next step.",
      },
    });
    expect(updated).toEqual([{ tableId: "tblRequest", recordId: "recDecision", fields: {
      "状态 Status": status,
      "处理结果 Resolution": "Clear next step.",
    } }]);
  });

  it("routes an access-request rejection to Internal Requests", async () => {
    const { repository, updated } = repositoryHarness(
      { tblRequest: [{
        record_id: "recAccess",
        fields: {
          "请求 Request": "Company Operations access — Pending Employee",
          "提出人（飞书） Requested By (Feishu)": [{ id: "ou_pending", name: "Pending Employee" }],
          "备注 Notes": "Requested role: growth",
          "状态 Status": "待处理 Open",
        },
      }] },
      { tblRequest: requestFields }
    );
    await repository.performAction(founderPrincipal, {
      action: "request_decision_changes",
      payload: { decisionId: "recAccess", actionType: "access_request" },
    });
    expect(updated).toEqual([{ tableId: "tblRequest", recordId: "recAccess", fields: {
      "状态 Status": "拒绝 Declined",
    } }]);
  });

  it("routes an access-request approval to Staff and closes the request", async () => {
    const { repository, created, updated } = repositoryHarness(
      {
        tblRequest: [{
          record_id: "recAccess",
          fields: {
            "请求 Request": "Company Operations access — Pending Employee",
            "提出人（飞书） Requested By (Feishu)": [{ id: "ou_pending", name: "Pending Employee" }],
            "备注 Notes": "Requested role: growth",
            "状态 Status": "待处理 Open",
          },
        }],
        tblStaff: [],
      },
      { tblRequest: requestFields, tblStaff: staffAccessFields }
    );
    await repository.performAction(founderPrincipal, {
      action: "approve_decision",
      payload: { decisionId: "recAccess", actionType: "access_request" },
    });
    expect(created).toEqual([{ tableId: "tblStaff", fields: {
      "姓名 Name": "Pending Employee",
      "飞书用户 Feishu User": [{ id: "ou_pending" }],
      "应用角色 App Role": "增长 Growth",
      "状态 Status": "在职 Active",
    } }]);
    expect(updated).toEqual([{ tableId: "tblRequest", recordId: "recAccess", fields: {
      "状态 Status": "完成 Done",
    } }]);
  });

  it("rejects an unknown decision actionType without touching any table", async () => {
    const { repository, created, updated } = repositoryHarness();
    await expect(repository.performAction(founderPrincipal, {
      action: "approve_decision",
      payload: { decisionId: "recDecision", actionType: "payroll" },
    })).rejects.toMatchObject({ status: 400, message: "Unknown decision type" });
    expect(created).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });
});

describe("Company Operations confidential self-service contracts", () => {
  it("writes a policy acknowledgement through the exact writable live fields", async () => {
    const { repository, created } = repositoryHarness(
      { tblPolicy: [] },
      { tblPolicy: policyFields }
    );

    await repository.performAction(staffPrincipal, {
      action: "acknowledge_policy",
      payload: { policyId: "expense-policy", version: "2.0" },
    });

    expect(created).toHaveLength(1);
    expect(created[0]).toEqual({
      tableId: "tblPolicy",
      fields: {
        "确认记录 Acknowledgement":
          "Staff Member · 报销制度 Expense Policy · 2.0",
        "员工 Employee": ["recStaff"],
        "确认人 Acknowledged By": [{ id: "ou_staff" }],
        "文件 Document": "报销制度 Expense Policy",
        "文件版本 Document Version": "2.0",
        "已阅读并确认 Read & Acknowledged": true,
      },
    });
    expect(created[0].fields).not.toHaveProperty("确认时间 Acknowledged At");
  });

  it("exposes only this employee's confirmed policy IDs on the dashboard", async () => {
    const { repository } = repositoryHarness(
      {
        tblPolicy: [
          {
            record_id: "recMine",
            fields: {
              "员工 Employee": ["recStaff"],
              "确认人 Acknowledged By": [{ id: "ou_staff" }],
              "文件 Document": "报销制度 Expense Policy",
              "已阅读并确认 Read & Acknowledged": true,
            },
          },
          {
            record_id: "recOtherEmployee",
            fields: {
              "员工 Employee": ["recOther"],
              "确认人 Acknowledged By": [{ id: "ou_staff" }],
              "文件 Document": "提成制度 Commission Structure",
              "已阅读并确认 Read & Acknowledged": true,
            },
          },
          {
            record_id: "recOtherUser",
            fields: {
              "员工 Employee": ["recStaff"],
              "确认人 Acknowledged By": [{ id: "ou_other" }],
              "文件 Document": "提成制度 Commission Structure",
              "已阅读并确认 Read & Acknowledged": true,
            },
          },
          {
            record_id: "recUnchecked",
            fields: {
              "员工 Employee": ["recStaff"],
              "确认人 Acknowledged By": [{ id: "ou_staff" }],
              "文件 Document": "保密与数据规则 Confidentiality & Data Rules",
              "已阅读并确认 Read & Acknowledged": false,
            },
          },
        ],
      },
      {
        tblPolicy: policyFields,
        tblCommission: commissionFields,
        tblPayroll: payrollFields,
      }
    );

    const dashboard = await repository.getDashboard(staffPrincipal);
    expect(dashboard.acknowledgedPolicyIds).toEqual(["expense-policy"]);
  });

  it("reads exact payroll and commission fields into the self-only summary", async () => {
    const disputeDeadline = Date.now() + 3 * 86_400_000;
    const { repository } = repositoryHarness(
      {
        tblPolicy: [],
        tblPayroll: [
          {
            record_id: "recPayroll",
            fields: {
              "员工 Employee": ["recStaff"],
              "月份 Month": "2026-08",
              "基本工资 Base": 20_000,
              "月度绩效奖金 Perf Bonus": 2_000,
              "提成 Commission": 1_500,
              "奖金 Bonus": 500,
              "报销 Reimbursements": 300,
              "扣款 Deductions": 100,
              "实发 Net Pay": 24_200,
              "状态 Status": "已发放 Paid",
            },
          },
        ],
        tblCommission: [
          {
            record_id: "recCommission",
            fields: {
              "员工 Employee": ["recStaff"],
              "月份 Month": "2026-08",
              "归属销售额 Attributed Revenue": 30_000,
              "比例% Rate": 5,
              "提成金额 Amount": 1_500,
              "季度增长奖金 Growth Bonus": 600,
              "状态 Status": "已审核 Approved",
              "员工确认时间 Acknowledged At": Date.now() - 1_000,
              "异议截止 Dispute Deadline": disputeDeadline,
              "已锁定 Locked": false,
            },
          },
        ],
      },
      {
        tblPolicy: policyFields,
        tblCommission: commissionFields,
        tblPayroll: payrollFields,
      }
    );

    const dashboard = await repository.getDashboard(staffPrincipal);
    expect(dashboard.myCompensation).toEqual({
      payroll: {
        period: "2026-08",
        baseSalary: 20_000,
        performance: 2_000,
        commission: 1_500,
        bonus: 500,
        reimbursements: 300,
        deductions: 100,
        netPay: 24_200,
        status: "已发放 Paid",
      },
      commission: {
        id: "recCommission",
        period: "2026-08",
        attributedRevenue: 30_000,
        rate: 5,
        amount: 1_500,
        growthBonus: 600,
        status: "已审核 Approved",
        acknowledged: true,
        disputeDeadline: new Date(disputeDeadline).toISOString(),
        locked: false,
      },
    });
  });

  it("acknowledges a commission by writing only its employee timestamp", async () => {
    const { repository, updated } = repositoryHarness(
      {
        tblCommission: [
          {
            record_id: "recCommission",
            fields: {
              "员工 Employee": ["recStaff"],
              "月份 Month": "2026-08",
            },
          },
        ],
      },
      { tblCommission: commissionFields }
    );

    await repository.performAction(staffPrincipal, {
      action: "acknowledge_compensation",
      payload: { compensationId: "recCommission" },
    });

    expect(updated).toHaveLength(1);
    expect(updated[0].tableId).toBe("tblCommission");
    expect(updated[0].recordId).toBe("recCommission");
    expect(updated[0].fields).toEqual({
      "员工确认时间 Acknowledged At": expect.any(Number),
    });
  });

  it("rejects disputes against a locked commission statement", async () => {
    const { repository, updated } = repositoryHarness(
      {
        tblCommission: [
          {
            record_id: "recLocked",
            fields: {
              "员工 Employee": ["recStaff"],
              "月份 Month": "2026-08",
              "异议截止 Dispute Deadline": Date.now() + 86_400_000,
              "已锁定 Locked": true,
            },
          },
        ],
      },
      { tblCommission: commissionFields }
    );

    await expect(repository.performAction(staffPrincipal, {
      action: "dispute_compensation",
      payload: { compensationId: "recLocked", reason: "Please check the attribution." },
    })).rejects.toMatchObject({ status: 409, message: "This compensation statement is locked" });
    expect(updated).toHaveLength(0);
  });

  it("rejects disputes after the Shanghai calendar-day deadline", async () => {
    const { repository, updated } = repositoryHarness(
      {
        tblCommission: [
          {
            record_id: "recExpired",
            fields: {
              "员工 Employee": ["recStaff"],
              "月份 Month": "2026-08",
              "异议截止 Dispute Deadline": Date.now() - 2 * 86_400_000,
              "已锁定 Locked": false,
            },
          },
        ],
      },
      { tblCommission: commissionFields }
    );

    await expect(repository.performAction(staffPrincipal, {
      action: "dispute_compensation",
      payload: { compensationId: "recExpired", reason: "Please check the attribution." },
    })).rejects.toMatchObject({ status: 409, message: "The dispute deadline has passed" });
    expect(updated).toHaveLength(0);
  });

  it("raises an in-window dispute without changing the payroll status", async () => {
    const { repository, updated } = repositoryHarness(
      {
        tblCommission: [
          {
            record_id: "recOpen",
            fields: {
              "员工 Employee": ["recStaff"],
              "月份 Month": "2026-08",
              "状态 Status": "已审核 Approved",
              "异议截止 Dispute Deadline": Date.now() + 2 * 86_400_000,
              "已锁定 Locked": false,
            },
          },
        ],
      },
      { tblCommission: commissionFields }
    );

    await repository.performAction(staffPrincipal, {
      action: "dispute_compensation",
      payload: { compensationId: "recOpen", reason: "Order 123 is missing." },
    });

    expect(updated).toEqual([
      {
        tableId: "tblCommission",
        recordId: "recOpen",
        fields: {
          "异议说明 Dispute Notes": "Order 123 is missing.",
          "异议状态 Dispute Status": "待处理 Raised",
        },
      },
    ]);
    expect(updated[0].fields).not.toHaveProperty("状态 Status");
  });
});

describe("Company Operations monthly performance contracts", () => {
  it("allows only the founder to set five fixed-category goals and keeps weights server-authoritative", async () => {
    const records = {
      tblStaff: [{
        record_id: "recYumei",
        fields: {
          "姓名 Name": "Yumei",
          "状态 Status": "在职 Active",
        },
      }],
      tblPerformance: [],
    };
    const fields = {
      tblStaff: staffAccessFields,
      tblPerformance: performanceFields,
    };
    const founderHarness = repositoryHarness(records, fields);

    await founderHarness.repository.performAction(founderPrincipal, {
      action: "performance.goals.set",
      payload: {
        employeeStaffRecordId: "recYumei",
        month: "2026-08",
        reportDue: "2026-08-28",
        goals: fixedPerformanceGoals,
      },
    });

    expect(founderHarness.created).toHaveLength(1);
    expect(founderHarness.created[0]).toEqual({
      tableId: "tblPerformance",
      fields: expect.objectContaining({
        "记录 Record": "2026-08 · Yumei",
        "员工 Employee": ["recYumei"],
        "月份 Month": "2026-08",
        "直属负责人 Manager": [{ id: "ou_founder" }],
        "状态 Status": "目标已确认 Goals Set",
        "报告截止 Report Due": Date.parse("2026-08-28"),
        "目标 1 Goal 1": "Goal 1",
        "衡量标准 1 Measure 1": "Measurable result 1",
        "目标 5 Goal 5": "Goal 5",
        "衡量标准 5 Measure 5": "Measurable result 5",
        "奖金计算规则 Bonus Formula": "handbook_v2_fixed_categories_thresholds_v1",
        "异议状态 Dispute Status": "无异议 None",
      }),
    });
    expect(founderHarness.created[0].fields).not.toHaveProperty("weight");
    expect(founderHarness.created[0].fields).not.toHaveProperty("weights");
    expect(founderHarness.created[0].fields).not.toHaveProperty("奖金 Bonus (税前)");

    const employeeHarness = repositoryHarness(records, fields);
    await expect(employeeHarness.repository.performAction(growthPrincipal, {
      action: "performance.goals.set",
      payload: {
        employeeStaffRecordId: "recYumei",
        month: "2026-08",
        reportDue: "2026-08-28",
        goals: fixedPerformanceGoals,
      },
    })).rejects.toMatchObject({ status: 403 });
    expect(employeeHarness.created).toHaveLength(0);

    const craftedHarness = repositoryHarness(records, fields);
    await expect(craftedHarness.repository.performAction(founderPrincipal, {
      action: "performance.goals.set",
      payload: {
        employeeStaffRecordId: "recYumei",
        month: "2026-08",
        reportDue: "2026-08-28",
        goals: fixedPerformanceGoals.map((goal) => ({ ...goal, weight: 100 })),
      },
    })).rejects.toMatchObject({ status: 400, message: "Unknown goal fields: weight" });
    expect(craftedHarness.created).toHaveLength(0);
  });

  it("lets an employee submit only their own report and writes only report evidence fields", async () => {
    const ownRecord = performanceRecord();
    const ownHarness = repositoryHarness(
      { tblPerformance: [ownRecord] },
      { tblPerformance: performanceFields }
    );

    await ownHarness.repository.performAction(staffPrincipal, {
      action: "performance.report.submit",
      payload: {
        performanceId: ownRecord.record_id,
        selfReview: "I delivered the agreed monthly goals and documented the results.",
        results: fixedPerformanceResults,
        evidenceLinks: ["https://example.feishu.cn/file/video-1"],
        context: "One shoot moved by two days because the venue was unavailable.",
      },
    });

    expect(ownHarness.updated).toHaveLength(1);
    expect(ownHarness.updated[0]).toEqual({
      tableId: "tblPerformance",
      recordId: "recPerformance",
      fields: expect.objectContaining({
        "状态 Status": "报告已提交 Report Submitted",
        "员工自评 Self Review": "I delivered the agreed monthly goals and documented the results.",
        "成果 1 Result 1": "Completed result 1",
        "成果 5 Result 5": "Completed result 5",
        "证据链接 Evidence Links": "https://example.feishu.cn/file/video-1",
        "问题与背景 Context": "One shoot moved by two days because the venue was unavailable.",
        "报告提交时间 Report Submitted At": expect.any(Number),
      }),
    });
    expect(ownHarness.updated[0].fields).not.toHaveProperty("总分 Total");
    expect(ownHarness.updated[0].fields).not.toHaveProperty("奖金 Bonus (税前)");

    const otherRecord = performanceRecord({}, "recOther", "recOtherPerformance");
    const crossEmployeeHarness = repositoryHarness(
      { tblPerformance: [otherRecord] },
      { tblPerformance: performanceFields }
    );
    await expect(crossEmployeeHarness.repository.performAction(staffPrincipal, {
      action: "performance.report.submit",
      payload: {
        performanceId: otherRecord.record_id,
        selfReview: "Attempt to edit another employee's report.",
        results: fixedPerformanceResults,
      },
    })).rejects.toMatchObject({
      status: 403,
      message: "You can access only your own performance cycle",
    });
    expect(crossEmployeeHarness.updated).toHaveLength(0);
  });

  it("exposes only the employee's own cycles with immutable category weights", async () => {
    const { repository } = repositoryHarness(
      {
        tblPerformance: [
          performanceRecord({}, "recStaff", "recMine"),
          performanceRecord({}, "recOther", "recOther"),
        ],
      },
      {
        tblPerformance: performanceFields,
        tblPolicy: policyFields,
        tblCommission: commissionFields,
        tblPayroll: payrollFields,
      }
    );

    const dashboard = await repository.getDashboard(staffPrincipal);
    expect(dashboard.performance?.cycles).toHaveLength(1);
    expect(dashboard.performance?.cycles[0].id).toBe("recMine");
    expect(dashboard.performance?.cycles[0].goals.map((goal) => goal.weight)).toEqual([
      25,
      20,
      20,
      15,
      20,
    ]);
    expect(dashboard.performance?.staff).toBeUndefined();
    expect(dashboard.performance?.canManage).toBe(false);
  });

  it.each([
    [90, 2_000, 1],
    [80, 1_500, 0.8],
    [70, 1_000, 0.5],
    [60, 500, 0],
    [59, 0, 0],
  ])(
    "calculates a %i score as the correct CNY %i bonus and %s personal factor",
    async (score, expectedBonus, expectedFactor) => {
      const record = performanceRecord({
        "状态 Status": "报告已提交 Report Submitted",
      });
      const { repository, updated } = repositoryHarness(
        { tblPerformance: [record] },
        { tblPerformance: performanceFields }
      );

      await repository.performAction(founderPrincipal, {
        action: "performance.review.score",
        payload: {
          performanceId: record.record_id,
          scores: fixedPerformanceScores(score),
          feedback: "Founder scoring notes.",
        },
      });

      expect(updated).toHaveLength(1);
      expect(updated[0]).toEqual({
        tableId: "tblPerformance",
        recordId: "recPerformance",
        fields: expect.objectContaining({
          "总分 Total": score,
          "奖金 Bonus (税前)": expectedBonus,
          "个人系数 Personal Factor": expectedFactor,
          "奖金计算规则 Bonus Formula": "handbook_v2_fixed_categories_thresholds_v1",
          "创始人评语 Founder Review": "Founder scoring notes.",
          "初评时间 Scored At": expect.any(Number),
          "状态 Status": "员工确认中 Employee Review",
        }),
      });
      expect(performanceCategoryFields.map((name) => updated[0].fields[name])).toEqual([
        score,
        score,
        score,
        score,
        score,
      ]);
    }
  );

  it("rejects invalid scores and client-authored bonus, status, or weighting fields", async () => {
    const record = performanceRecord({
      "状态 Status": "报告已提交 Report Submitted",
    });
    const { repository, updated } = repositoryHarness(
      { tblPerformance: [record] },
      { tblPerformance: performanceFields }
    );

    await expect(repository.performAction(founderPrincipal, {
      action: "performance.review.score",
      payload: {
        performanceId: record.record_id,
        scores: fixedPerformanceScores(90).map((item, index) =>
          index === 0 ? { ...item, score: 101 } : item
        ),
        feedback: "Invalid score.",
      },
    })).rejects.toMatchObject({ status: 400, message: "score 1 must be between 0 and 100" });

    await expect(repository.performAction(founderPrincipal, {
      action: "performance.review.score",
      payload: {
        performanceId: record.record_id,
        scores: fixedPerformanceScores(90),
        feedback: "Attempt to bypass server calculation.",
        bonus: 99_999,
        status: "Paid",
      },
    })).rejects.toMatchObject({ status: 400, message: "Unknown fields: bonus, status" });

    await expect(repository.performAction(founderPrincipal, {
      action: "performance.review.score",
      payload: {
        performanceId: record.record_id,
        scores: fixedPerformanceScores(90).map((item) => ({ ...item, weight: 100 })),
        feedback: "Attempt to replace fixed category weights.",
      },
    })).rejects.toMatchObject({ status: 400, message: "Unknown score fields: weight" });
    expect(updated).toHaveLength(0);
  });

  it.each([
    ["accept", "Looks correct.", "[Accepted] Looks correct.", "无异议 None", undefined],
    ["challenge", "Please review the lead count.", "[Challenged] Please review the lead count.", "员工说明 Submitted", "评分中 Scoring"],
  ] as const)(
    "records an employee %s response without allowing a second employee to act",
    async (response, comment, expectedResponse, expectedDispute, expectedStatus) => {
      const scoredAt = Date.now() - 5_000;
      const record = performanceRecord({
        "状态 Status": "员工确认中 Employee Review",
        "初评时间 Scored At": scoredAt,
        "奖金 Bonus (税前)": 1_500,
      });
      const { repository, updated } = repositoryHarness(
        { tblPerformance: [record] },
        { tblPerformance: performanceFields }
      );

      await repository.performAction(staffPrincipal, {
        action: "performance.review.respond",
        payload: { performanceId: record.record_id, response, comment },
      });

      expect(updated).toHaveLength(1);
      expect(updated[0].fields).toEqual(expect.objectContaining({
        "员工异议/说明 Employee Response": expectedResponse,
        "员工回应时间 Employee Responded At": expect.any(Number),
        "异议状态 Dispute Status": expectedDispute,
      }));
      if (expectedStatus) {
        expect(updated[0].fields["状态 Status"]).toBe(expectedStatus);
      } else {
        expect(updated[0].fields).not.toHaveProperty("状态 Status");
      }
    }
  );

  it("finalizes only an accepted latest score and stages only Perf Bonus on an open payroll record", async () => {
    const scoredAt = Date.now() - 10_000;
    const respondedAt = scoredAt + 5_000;
    const record = performanceRecord({
      "状态 Status": "员工确认中 Employee Review",
      "初评时间 Scored At": scoredAt,
      "员工回应时间 Employee Responded At": respondedAt,
      "员工异议/说明 Employee Response": "[Accepted] Looks correct.",
      "奖金 Bonus (税前)": 1_500,
      "创始人评语 Founder Review": "Strong month.",
    });
    const payroll = {
      record_id: "recPayroll",
      fields: {
        "记录 Record": "2026-08 · Staff Member",
        "员工 Employee": ["recStaff"],
        "月份 Month": "2026-08",
        "基本工资 Base": 20_000,
        "月度绩效奖金 Perf Bonus": 0,
        "提成 Commission": 1_200,
        "状态 Status": "待发 Pending",
        "已锁定 Locked": false,
      },
    };
    const { repository, updated } = repositoryHarness(
      { tblPerformance: [record], tblPayroll: [payroll] },
      { tblPerformance: performanceFields, tblPayroll: payrollFields }
    );

    await repository.performAction(founderPrincipal, {
      action: "performance.finalize",
      payload: {
        performanceId: record.record_id,
        resolutionNote: "Employee accepted the final score.",
      },
    });

    expect(updated).toHaveLength(2);
    expect(updated[0]).toEqual({
      tableId: "tblPayroll",
      recordId: "recPayroll",
      fields: {
        "月度绩效奖金 Perf Bonus": 1_500,
      },
    });
    expect(updated[0].fields).not.toHaveProperty("基本工资 Base");
    expect(updated[0].fields).not.toHaveProperty("提成 Commission");
    expect(updated[0].fields).not.toHaveProperty("状态 Status");
    expect(updated[1]).toEqual({
      tableId: "tblPerformance",
      recordId: "recPerformance",
      fields: expect.objectContaining({
        "状态 Status": "已确认 Confirmed",
        "定稿时间 Finalized At": expect.any(Number),
        "工资入账时间 Payroll Staged At": expect.any(Number),
        "异议状态 Dispute Status": "已解决 Resolved",
        "创始人评语 Founder Review":
          "Strong month.\n\nFinal resolution: Employee accepted the final score.",
      }),
    });
  });

  it.each([
    ["locked", true, "待发 Pending"],
    ["paid", false, "已发 Paid"],
  ])("does not overwrite a %s payroll record during finalization", async (_label, locked, status) => {
    const scoredAt = Date.now() - 10_000;
    const record = performanceRecord({
      "状态 Status": "员工确认中 Employee Review",
      "初评时间 Scored At": scoredAt,
      "员工回应时间 Employee Responded At": scoredAt + 5_000,
      "员工异议/说明 Employee Response": "[Accepted]",
      "奖金 Bonus (税前)": 2_000,
    });
    const payroll = {
      record_id: "recProtectedPayroll",
      fields: {
        "员工 Employee": ["recStaff"],
        "月份 Month": "2026-08",
        "基本工资 Base": 20_000,
        "月度绩效奖金 Perf Bonus": 700,
        "提成 Commission": 1_200,
        "状态 Status": status,
        "已锁定 Locked": locked,
      },
    };
    const { repository, created, updated } = repositoryHarness(
      { tblPerformance: [record], tblPayroll: [payroll] },
      { tblPerformance: performanceFields, tblPayroll: payrollFields }
    );

    await expect(repository.performAction(founderPrincipal, {
      action: "performance.finalize",
      payload: { performanceId: record.record_id },
    })).rejects.toMatchObject({
      status: 409,
      message: "The matching payroll record is already locked or paid",
    });
    expect(created).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });

  it("refuses finalization when acceptance predates the latest founder score", async () => {
    const scoredAt = Date.now() - 1_000;
    const record = performanceRecord({
      "状态 Status": "员工确认中 Employee Review",
      "初评时间 Scored At": scoredAt,
      "员工回应时间 Employee Responded At": scoredAt - 1_000,
      "员工异议/说明 Employee Response": "[Accepted] Previous score.",
      "奖金 Bonus (税前)": 2_000,
    });
    const { repository, created, updated } = repositoryHarness(
      { tblPerformance: [record], tblPayroll: [] },
      { tblPerformance: performanceFields, tblPayroll: payrollFields }
    );

    await expect(repository.performAction(founderPrincipal, {
      action: "performance.finalize",
      payload: { performanceId: record.record_id },
    })).rejects.toMatchObject({
      status: 409,
      message: "The employee must accept the latest score before finalization",
    });
    expect(created).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });
});

describe("Feishu DM pings", () => {
  const goalFields: FeishuField[] = [
    field("目标 Goal", 1, true),
    field("回应 Response", 1),
    field("回应人 Responded By", 1),
    field("Created By Open ID", 1),
  ];
  const goalRecord: FeishuRecord = {
    record_id: "recGoal1",
    fields: {
      "目标 Goal": "August content plan",
      "Created By Open ID": "ou_founder",
    },
  };
  const staffTable: FeishuRecord[] = [
    {
      record_id: "recStaff",
      fields: {
        "姓名 Name": "Staff Member",
        "状态 Status": "在职 Active",
        "飞书用户 Feishu User": [{ id: "ou_staff" }],
      },
    },
  ];

  it("staff goal comments DM the founders without blocking the save", async () => {
    const harness = repositoryHarness(
      { tblGoal: [goalRecord], tblStaff: staffTable },
      { tblGoal: goalFields, tblStaff: staffAccessFields },
      { FEISHU_ADMIN_FOUNDER_OPEN_IDS: "ou_founder" }
    );
    const result = await harness.repository.performAction(staffPrincipal, {
      action: "respond_goal",
      payload: { goalId: "recGoal1", response: "Done — draft is in the calendar" },
    });
    expect(result.success).toBe(true);
    await vi.waitFor(() => {
      expect(harness.sent.some((message) => message.openId === "ou_founder")).toBe(true);
    });
    const ping = harness.sent.find((message) => message.openId === "ou_founder")!;
    expect(ping.text).toContain("August content plan");
    expect(ping.text).toContain("/company-ops");
    expect(harness.sent.some((message) => message.openId === "ou_staff")).toBe(false);
  });

  it("founder goal comments DM active staff, never the founder themself", async () => {
    const harness = repositoryHarness(
      { tblGoal: [goalRecord], tblStaff: staffTable },
      { tblGoal: goalFields, tblStaff: staffAccessFields },
      { FEISHU_ADMIN_FOUNDER_OPEN_IDS: "ou_founder" }
    );
    const result = await harness.repository.performAction(founderPrincipal, {
      action: "respond_goal",
      payload: { goalId: "recGoal1", response: "Looks great, ship it" },
    });
    expect(result.success).toBe(true);
    await vi.waitFor(() => {
      expect(harness.sent.some((message) => message.openId === "ou_staff")).toBe(true);
    });
    expect(harness.sent.some((message) => message.openId === "ou_founder")).toBe(false);
  });

  it("a failing DM send never fails the action", async () => {
    const harness = repositoryHarness(
      { tblGoal: [goalRecord], tblStaff: staffTable },
      { tblGoal: goalFields, tblStaff: staffAccessFields },
      { FEISHU_ADMIN_FOUNDER_OPEN_IDS: "ou_founder" }
    );
    (harness.repository as unknown as { client: { sendTextMessage: () => Promise<void> } })
      .client.sendTextMessage = async () => {
        throw new Error("permission denied: im:message scope missing");
      };
    const result = await harness.repository.performAction(staffPrincipal, {
      action: "respond_goal",
      payload: { goalId: "recGoal1", response: "Testing resilience" },
    });
    expect(result.success).toBe(true);
    expect(harness.updated).toHaveLength(1);
  });
});
