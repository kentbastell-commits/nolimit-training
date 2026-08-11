export const FIELD_TYPES = Object.freeze({
  TEXT: 1,
  NUMBER: 2,
  SELECT: 3,
  MULTI_SELECT: 4,
  DATE: 5,
  CHECKBOX: 7,
  USER: 11,
  PHONE: 13,
  URL: 15,
  ATTACHMENT: 17,
  LINK: 18,
  CREATED_TIME: 1001,
  CREATED_USER: 1003,
});

const field = (name, type, extra = {}) => ({ name, type, ...extra });
const text = (name, description) => field(name, FIELD_TYPES.TEXT, { description });
const email = (name, description) =>
  field(name, FIELD_TYPES.TEXT, { ui_type: "Email", description });
const number = (name, description) =>
  field(name, FIELD_TYPES.NUMBER, {
    property: { formatter: "0.00" },
    description,
  });
const integer = (name, description) =>
  field(name, FIELD_TYPES.NUMBER, {
    property: { formatter: "0" },
    description,
  });
const select = (name, options, description, mergeOptions = false) =>
  field(name, FIELD_TYPES.SELECT, {
    property: { options: options.map((option) => ({ name: option })) },
    description,
    mergeOptions,
  });
const multiSelect = (name, options, description) =>
  field(name, FIELD_TYPES.MULTI_SELECT, {
    property: { options: options.map((option) => ({ name: option })) },
    description,
  });
const date = (name, description, withTime = false) =>
  field(name, FIELD_TYPES.DATE, {
    property: {
      date_formatter: withTime ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd",
      auto_fill: false,
    },
    description,
  });
const checkbox = (name, description) =>
  field(name, FIELD_TYPES.CHECKBOX, { property: null, description });
const user = (name, description, multiple = false) =>
  field(name, FIELD_TYPES.USER, {
    property: { multiple },
    description,
  });
const phone = (name, description) => field(name, FIELD_TYPES.PHONE, { description });
const url = (name, description) => field(name, FIELD_TYPES.URL, { description });
const attachment = (name, description) =>
  field(name, FIELD_TYPES.ATTACHMENT, { description });
const createdTime = (name) =>
  field(name, FIELD_TYPES.CREATED_TIME, {
    property: { date_formatter: "yyyy-MM-dd HH:mm" },
  });
const createdUser = (name) => field(name, FIELD_TYPES.CREATED_USER, { property: null });
const link = (name, linkTo, description, multiple = false) =>
  field(name, FIELD_TYPES.LINK, { linkTo, description, multiple });

const view = (name, type = "grid") => ({ name, type });
const form = (name, description, visible, required, { shared = false } = {}) => ({
  name,
  type: "form",
  description,
  shared,
  sharedLimit: shared ? "tenant_editable" : undefined,
  submitLimitOnce: false,
  visible,
  required,
});

const founderOnlyPermission = {
  external_access: false,
  invite_external: false,
  link_share_entity: "closed",
  security_entity: "only_full_access",
  comment_entity: "anyone_can_edit",
  share_entity: "only_full_access",
};

const controlledBasePermission = {
  external_access: false,
  invite_external: false,
  link_share_entity: "closed",
  security_entity: "only_full_access",
  comment_entity: "anyone_can_edit",
  share_entity: "only_full_access",
};

const internalReadableDocumentPermission = {
  external_access: false,
  invite_external: false,
  link_share_entity: "tenant_readable",
  security_entity: "only_full_access",
  comment_entity: "anyone_can_edit",
  share_entity: "only_full_access",
};

export const sharedAssetsTree = [
  { name: "01 Brand Assets" },
  {
    name: "02 Content",
    children: [
      {
        name: "2026",
        children: [{ name: "2026-08" }, { name: "2026-09" }],
      },
    ],
  },
  { name: "03 Campaigns" },
  { name: "04 Athlete Testimonials" },
  { name: "05 KOL Partnerships" },
  { name: "06 Templates" },
  { name: "99 Archive" },
];

export const companyOpsSchema = {
  bases: {
    confidential: {
      label: "Confidential",
      expectedName: "跃燃体育 HR·财务 Confidential",
      permission: founderOnlyPermission,
      tables: [
        {
          name: "员工名册 Staff",
          fields: [
            user("飞书用户 Feishu User", "员工的飞书账号；用于权限与任务分配。"),
            select("应用角色 App Role", ["增长 Growth", "财务 Finance", "员工 Staff"], "仅控制Company Operations权限；创始人权限只能由服务器白名单授予。"),
            text("员工编号 Employee ID", "内部稳定员工编号，不使用身份证号。"),
            select("部门 Department", ["创始人 Founders", "品牌增长 Brand & Growth", "教练 Coaching", "运营 Operations", "行政财务 Admin & Finance"]),
            user("直属负责人 Manager", "该员工的直接负责人。"),
            email("工作邮箱 Work Email", "仅填写公司工作邮箱。"),
            select("保密资料状态 Confidential Details", ["未提交 Missing", "待核验 To Verify", "已核验 Verified", "需更新 Needs Update"]),
            checkbox("机器人提醒 Bot Reminders", "员工明确选择后，提醒任务才可向该员工的飞书账号发送聚合待办数量。"),
          ],
          views: [view("在职员工 Active Staff"), view("待办资料 Missing Details")],
        },
        {
          name: "工资台账 Payroll",
          fields: [
            number("员工社保 Employee Social Insurance", "员工个人承担部分。"),
            number("个人公积金 Employee Housing Fund", "员工个人承担部分。"),
            number("个人所得税 IIT", "当月个人所得税。"),
            number("报销 Reimbursements", "随工资支付的已批准报销。"),
            number("应发合计 Gross Pay", "正式工资来源导入的应发合计。"),
            user("核算人 Prepared By"),
            user("审核人 Approved By"),
            text("版本 Version", "每次更正增加版本，不覆盖审计历史。"),
            checkbox("已锁定 Locked", "支付后锁定，禁止普通编辑。"),
          ],
          views: [view("待审核 Payroll Review"), view("待发放 Pending Payment")],
        },
        {
          name: "提成月结 Commission Statements",
          fields: [
            number("退款调整 Refund Adjustments", "退款或冲正，仅按制度处理。"),
            number("浮动薪酬合计 Total Variable Pay", "提成、增长奖金与允许调整的合计。"),
            createdTime("计算时间 Calculated At"),
            user("审核人 Approved By"),
            date("员工确认时间 Acknowledged At", "员工确认可读对账单的时间。", true),
            date("异议截止 Dispute Deadline", "制度规定的异议截止日期。"),
            select("异议状态 Dispute Status", ["无异议 None", "待处理 Raised", "已解决 Resolved"]),
            text("异议说明 Dispute Notes"),
            checkbox("已锁定 Locked"),
          ],
          views: [view("待审核 Commission Review"), view("员工待确认 Awaiting Acknowledgement")],
        },
        {
          name: "报销记录 Expenses",
          fields: [
            createdUser("提交人 Submitted By"),
            createdTime("提交时间 Submitted At"),
            text("业务目的 Business Purpose", "说明该费用与公司业务的关系。"),
            select("币种 Currency", ["CNY", "THB", "USD"]),
            text("供应商 Vendor"),
            text("关联项目 Related Project", "关联的活动、客户项目或内部项目名称。"),
            url("票据链接 Receipt URL", "上传到公司飞书后粘贴文件链接；不要使用公开分享链接。"),
            text("票据说明 Receipt Note", "无法直接上传票据时说明票据位置；正式报销仍须提供发票或收据。"),
            text("事前审批参考 Pre-approval Ref", "如费用需要事前审批，填写审批记录或消息链接。"),
            text("审核意见 Review Note"),
            text("付款参考 Payment Ref"),
          ],
          views: [view("待审批 Pending Review"), view("待打款 Approved to Pay"), view("本月已报销 Reimbursed This Month")],
          forms: [
            form(
              "报销申请 Expense Claim",
              "请在费用发生后10个工作日内提交。敏感支付信息不要写入备注。",
              ["事项 Item", "日期 Date", "类别 Category", "金额 Amount", "业务目的 Business Purpose", "供应商 Vendor", "发票/收据 Receipt", "事先审批 Pre-approved", "事前审批参考 Pre-approval Ref", "城市级别 City Tier", "备注 Notes"],
              ["事项 Item", "日期 Date", "类别 Category", "金额 Amount", "业务目的 Business Purpose", "发票/收据 Receipt", "事先审批 Pre-approved"],
            ),
          ],
        },
        {
          name: "月度绩效 Monthly Performance",
          fields: [
            user("直属负责人 Manager"),
            date("目标确认时间 Priorities Confirmed At", "每月前5个工作日内书面确认。", true),
            date("报告截止 Report Due", "员工提交月度成果报告的截止日期。"),
            text("目标 1 Goal 1", "由直属负责人书面确认；员工不可自行修改。"),
            text("衡量标准 1 Measure 1", "写明可核验的交付物、数量、质量或日期标准。"),
            text("成果 1 Result 1", "员工按目标逐项说明完成情况和证据。"),
            text("目标 2 Goal 2", "由直属负责人书面确认；员工不可自行修改。"),
            text("衡量标准 2 Measure 2", "写明可核验的交付物、数量、质量或日期标准。"),
            text("成果 2 Result 2", "员工按目标逐项说明完成情况和证据。"),
            text("目标 3 Goal 3", "由直属负责人书面确认；员工不可自行修改。"),
            text("衡量标准 3 Measure 3", "写明可核验的交付物、数量、质量或日期标准。"),
            text("成果 3 Result 3", "员工按目标逐项说明完成情况和证据。"),
            text("目标 4 Goal 4", "由直属负责人书面确认；员工不可自行修改。"),
            text("衡量标准 4 Measure 4", "写明可核验的交付物、数量、质量或日期标准。"),
            text("成果 4 Result 4", "员工按目标逐项说明完成情况和证据。"),
            text("目标 5 Goal 5", "由直属负责人书面确认；员工不可自行修改。"),
            text("衡量标准 5 Measure 5", "写明可核验的交付物、数量、质量或日期标准。"),
            text("成果 5 Result 5", "员工按目标逐项说明完成情况和证据。"),
            number("内容规划与交付(25) Content & Delivery", "合同附录固定权重25分；负责人评分0至100。"),
            number("内容质量与优化(20) Quality", "合同附录固定权重20分；负责人评分0至100。"),
            number("活动与合作(20) Campaigns & Partners", "合同附录固定权重20分；负责人评分0至100。"),
            number("社群线索转化(15) Community & Leads", "合同附录固定权重15分；负责人评分0至100。"),
            number("组织与主人翁(20) Ownership", "合同附录固定权重20分；负责人评分0至100。"),
            number("总分 Total", "服务器按合同固定权重25/20/20/15/20计算。"),
            number("奖金 Bonus (税前)", "服务器按总分档位计算：90/80/70/60对应2000/1500/1000/500元。"),
            number("个人系数 Personal Factor", "用于适用的季度增长奖金：90+=1，80-89=.8，70-79=.5，70以下=0。"),
            text("员工自评 Self Review"),
            text("证据链接 Evidence Links", "每行一个公司飞书内的资料或文件链接；不要使用公开分享链接。"),
            text("问题与背景 Context", "记录影响交付的背景、依赖或阻碍；不要填写身份、银行或医疗信息。"),
            date("报告提交时间 Report Submitted At", "员工正式提交月度报告的时间。", true),
            text("创始人评语 Founder Review", "员工可见的评分说明或补充要求；保密管理备注应另行保存。"),
            text("奖金计算规则 Bonus Formula", "服务器记录合同/员工手册规定的固定权重与奖金档位规则版本。"),
            date("初评时间 Scored At", "按手册时间要求完成初评。", true),
            date("员工回应时间 Employee Responded At", "员工3个工作日回应窗口。", true),
            date("定稿时间 Finalized At", "评分与回应处理完毕后的时间。", true),
            date("工资入账时间 Payroll Staged At", "定稿奖金安全写入待发工资台账的时间。", true),
            select("异议状态 Dispute Status", ["无异议 None", "员工说明 Submitted", "复核中 Reviewing", "已解决 Resolved"]),
            select("状态 Status", ["目标已确认 Goals Set", "报告已提交 Report Submitted", "需补充 Changes Requested", "评分中 Scoring", "员工确认中 Employee Review", "已确认 Confirmed", "已随工资支付 Paid"], "月度绩效工作流状态；只能通过Company Operations受控操作推进。", true),
          ],
          views: [view("本月流程 Current Cycle"), view("待员工确认 Employee Review"), view("已定稿 Finalized")],
        },
        {
          name: "员工保密资料 Confidential Details",
          create: true,
          primary: text("姓名 Legal Name", "与身份证件和银行账户一致。"),
          fields: [
            link("员工 Employee", "员工名册 Staff", "由管理员核验后关联。"),
            user("飞书账号 Feishu User"),
            select("证件类型 ID Type", ["中国居民身份证 PRC ID", "护照 Passport", "其他 Other"]),
            text("证件号码 ID Number"),
            attachment("证件文件 ID Files", "仅上传依法办理入职、薪税和社保所必需的文件。"),
            text("开户银行 Bank Name"),
            text("账户姓名 Account Name"),
            text("银行账号 Bank Account"),
            phone("个人手机 Personal Phone"),
            email("个人邮箱 Personal Email"),
            text("居住地址 Residential Address"),
            text("紧急联系人 Emergency Contact"),
            text("紧急联系人关系 Relationship"),
            phone("紧急联系人电话 Emergency Phone"),
            checkbox("信息授权确认 Consent", "确认信息仅用于劳动、人事、薪税和法定义务。"),
            createdUser("提交人 Submitted By"),
            createdTime("提交时间 Submitted At"),
            select("核验状态 Verification", ["待核验 To Verify", "已核验 Verified", "需补充 Needs Update"]),
            text("管理员备注 Admin Notes"),
          ],
          views: [view("待核验 To Verify"), view("需补充 Needs Update")],
          forms: [
            form(
              "员工保密资料 Confidential Employee Details",
              "此表仅进入创始人/人事可见的保密空间。请勿在群聊、共享文档或普通Base重复发送身份证和银行信息。",
              ["姓名 Legal Name", "飞书账号 Feishu User", "证件类型 ID Type", "证件号码 ID Number", "证件文件 ID Files", "开户银行 Bank Name", "账户姓名 Account Name", "银行账号 Bank Account", "个人手机 Personal Phone", "个人邮箱 Personal Email", "居住地址 Residential Address", "紧急联系人 Emergency Contact", "紧急联系人关系 Relationship", "紧急联系人电话 Emergency Phone", "信息授权确认 Consent"],
              ["姓名 Legal Name", "飞书账号 Feishu User", "证件类型 ID Type", "证件号码 ID Number", "证件文件 ID Files", "开户银行 Bank Name", "账户姓名 Account Name", "银行账号 Bank Account", "个人手机 Personal Phone", "紧急联系人 Emergency Contact", "紧急联系人关系 Relationship", "紧急联系人电话 Emergency Phone", "信息授权确认 Consent"],
              { shared: true },
            ),
          ],
        },
        {
          name: "制度确认 Policy Acknowledgements",
          create: true,
          primary: text("确认记录 Acknowledgement"),
          fields: [
            link("员工 Employee", "员工名册 Staff"),
            user("确认人 Acknowledged By"),
            select("文件 Document", ["员工手册 Employee Handbook", "报销制度 Expense Policy", "提成制度 Commission Structure", "保密与数据规则 Confidentiality & Data Rules"]),
            text("文件版本 Document Version"),
            checkbox("已阅读并确认 Read & Acknowledged"),
            createdTime("确认时间 Acknowledged At"),
            text("备注 Notes"),
          ],
          views: [view("确认记录 Acknowledgements")],
        },
      ],
    },

    teamOps: {
      label: "Team Ops",
      expectedName: "跃燃体育 团队运营 Team Ops",
      permission: controlledBasePermission,
      tables: [
        {
          name: "公司资产 Assets",
          fields: [
            text("资产编号 Asset ID"),
            user("持有人（飞书） Holder (Feishu)"),
            text("位置 Location"),
            date("归还截止 Return Due"),
            select("设备状况 Condition", ["良好 Good", "需维修 Needs Repair", "损坏 Damaged"]),
            date("归还日期 Returned At"),
            checkbox("员工已确认 Acknowledged"),
          ],
          views: [view("在用 In Use"), view("待归还 Due Back"), view("库存 Inventory")],
        },
        {
          name: "内部请求 Internal Requests",
          fields: [
            text("请求编号 Request ID"),
            user("提出人（飞书） Requested By (Feishu)"),
            createdTime("提交时间 Submitted At"),
            select("优先级 Priority", ["低 Low", "普通 Normal", "高 High", "紧急 Urgent"]),
            user("负责人 Owner"),
            text("处理结果 Resolution"),
            date("完成时间 Completed At", undefined, true),
          ],
          views: [view("待分配 Unassigned"), view("处理中 In Progress"), view("已完成 Completed")],
          forms: [
            form(
              "提交请求 Submit Request",
              "用于采购、账号、场地和一般内部支持。涉及请假、差旅或支出承诺时，请使用正式审批。",
              ["请求 Request", "提出人（飞书） Requested By (Feishu)", "类别 Category", "优先级 Priority", "备注 Notes"],
              ["请求 Request", "提出人（飞书） Requested By (Feishu)", "类别 Category", "优先级 Priority"],
            ),
          ],
        },
        {
          name: "产品与应用支持 Product & App Support",
          create: true,
          primary: text(
            "问题编号/标题 Issue ID / Title",
            "使用稳定问题编号加简短标题，例如 APP-2026-001 · 视频显示异常。",
          ),
          fields: [
            date("日期 Date"),
            user("报告人 Reporter"),
            user("业务负责人 Business Owner"),
            text(
              "用户/客户业务编号 User / Client Business ID",
              "只记录产品系统中的业务编号；不要记录姓名、身份证、伤病、训练评估或其他健康信息。",
            ),
            select("问题类型 Issue Type", [
              "故障 Bug",
              "数据问题 Data",
              "账号/权限 Access",
              "性能 Performance",
              "易用性 UX",
              "功能建议 Feature Request",
              "其他 Other",
            ]),
            select("严重级别 Severity", ["P0 紧急 Critical", "P1 高 High", "P2 中 Medium", "P3 低 Low"]),
            text("功能模块 Feature"),
            text("设备/系统 Device / OS"),
            text("问题描述 Description", "说明实际结果、预期结果和业务影响，不要粘贴敏感客户资料。"),
            text("复现步骤 Repro Steps"),
            attachment("附件 Attachment", "上传已遮挡姓名、联系方式、健康信息和支付信息的截图或录屏。"),
            integer("受影响数量 Affected Count"),
            text("临时方案 Workaround"),
            user("开发负责人 Developer Owner"),
            select("状态 Status", [
              "新建 New",
              "待确认 Triage",
              "处理中 In Progress",
              "待验证 Ready to Verify",
              "已解决 Resolved",
              "已关闭 Closed",
              "不处理 Won't Fix",
            ]),
            date("升级时间 Escalated At", undefined, true),
            date("解决时间 Resolved At", undefined, true),
            text("解决方案 Resolution"),
            user("验证人 Verified By"),
            checkbox("再次发生 Recurrence"),
            text("根本原因 Root Cause"),
          ],
          views: [
            view("未关闭 Open"),
            view("P0/P1 紧急 High Priority"),
            view("已分配 Assigned"),
            view("待验证 Ready to Verify"),
            view("已完成 Completed"),
          ],
        },
        {
          name: "系统链接 System Links",
          create: true,
          primary: text("链接 Link Name"),
          fields: [
            url("地址 URL"),
            select("类别 Category", ["公司资料 Company Assets", "制度 Policies", "运营工具 Operations", "培训 Training", "其他 Other"]),
            select("适用人群 Audience", ["全员 All Staff", "创始人 Founders", "品牌增长 Brand & Growth", "管理员 Admin"]),
            checkbox("启用 Active"),
            user("负责人 Owner"),
            text("说明 Notes"),
          ],
          views: [view("启用链接 Active Links")],
        },
        {
          name: "提醒发送记录 Reminder Delivery Log",
          create: true,
          primary: text(
            "幂等键 Idempotency Key",
            "日期、接收人Open ID与提醒类别的单向哈希；不保存原始Open ID。",
          ),
          fields: [
            date("提醒日期 Reminder Date"),
            text("接收人哈希 Recipient Hash", "仅保存不可逆哈希前缀，不保存原始Open ID。"),
            text("提醒类别 Category"),
            integer("待办数量 Item Count"),
            select("发送状态 Delivery Status", ["发送中 Sending", "已发送 Sent", "失败 Failed"]),
            date("发送时间 Sent At", undefined, true),
            text("飞书消息ID Message ID"),
            text("错误代码 Error Code", "只保存API错误代码，不保存消息内容或个人资料。"),
          ],
          views: [view("今日发送 Sent Today"), view("发送失败 Failed")],
        },
        {
          name: "入职任务模板 Onboarding Templates",
          create: true,
          primary: text("模板编号 Template Key"),
          fields: [
            text("任务 Task"),
            multiSelect("适用岗位 Roles", ["全员 All", "品牌增长 Brand & Growth", "教练 Coach", "运营 Operations"]),
            select("类别 Category", ["合同 Contract", "保密资料 Confidential", "制度 Policies", "账号 Accounts", "设备 Equipment", "培训 Training", "绩效 Performance", "行政 Admin"]),
            integer("相对天数 Relative Day", "相对于入职日的自然日；负数表示入职前。"),
            select("负责人角色 Owner Role", ["新员工 New Hire", "创始人 Founder", "行政 Admin", "直属负责人 Manager", "共同 Joint"]),
            checkbox("必做 Required"),
            text("说明 Instructions"),
            url("资料链接 Resource URL"),
            checkbox("启用 Active"),
            integer("排序 Sort Order"),
          ],
          views: [view("启用模板 Active Templates"), view("品牌增长入职 Brand Growth")],
        },
        {
          name: "入职案例 Onboarding Cases",
          create: true,
          primary: text("入职案例 Case"),
          fields: [
            text("员工姓名 Employee Name"),
            user("飞书用户 Feishu User"),
            select("岗位 Role", ["品牌增长 Brand & Growth", "教练 Coach", "运营 Operations", "行政 Admin", "其他 Other"]),
            date("入职日期 Start Date"),
            user("直属负责人 Manager"),
            select("状态 Status", ["准备中 Preparing", "进行中 Active", "受阻 Blocked", "已完成 Completed", "已取消 Cancelled"]),
            integer("完成率 Progress %"),
            select("保密资料 Confidential Details", ["未提交 Missing", "待核验 To Verify", "已核验 Verified"]),
            select("制度确认 Policy Acknowledgement", ["未完成 Missing", "部分完成 Partial", "已完成 Complete"]),
            date("30天复盘 Day 30 Review"),
            date("60天复盘 Day 60 Review"),
            date("90天复盘 Day 90 Review"),
            date("完成日期 Completed At"),
            text("备注 Notes"),
          ],
          views: [view("进行中 Active Cases"), view("需要关注 Blocked"), view("已完成 Completed")],
        },
        {
          name: "入职任务 Onboarding Tasks",
          create: true,
          primary: text("任务 Task"),
          fields: [
            link("入职案例 Case", "入职案例 Onboarding Cases"),
            link("任务模板 Template", "入职任务模板 Onboarding Templates"),
            select("类别 Category", ["合同 Contract", "保密资料 Confidential", "制度 Policies", "账号 Accounts", "设备 Equipment", "培训 Training", "绩效 Performance", "行政 Admin"]),
            user("负责人 Assignee"),
            date("截止日期 Due"),
            select("状态 Status", ["未开始 Todo", "进行中 Doing", "受阻 Blocked", "待复核 Review", "已完成 Done", "不适用 N/A"]),
            checkbox("必做 Required"),
            text("说明 Instructions"),
            url("资料链接 Resource URL"),
            attachment("完成证据 Evidence"),
            date("完成时间 Completed At", undefined, true),
            user("复核人 Reviewer"),
            text("飞书任务GUID Feishu Task GUID"),
            text("备注 Notes"),
          ],
          views: [view("我的入职任务 My Tasks"), view("本周到期 Due This Week"), view("受阻 Blocked"), view("已完成 Completed")],
        },
      ],
    },

    growth: {
      label: "Growth & Content",
      expectedName: "跃燃体育 增长与内容 Growth & Content OS",
      permission: controlledBasePermission,
      tables: [
        {
          name: "内容日历 Content Calendar",
          fields: [
            select("平台 Platform", ["小红书 XHS", "抖音 Douyin", "公众号 WeChat OA", "视频号 Channels", "网站 Website", "多平台 Multi"], undefined, true),
            user("负责人 Owner (Feishu)"),
            date("草稿截止 Draft Due"),
            select("内容支柱分类 Pillar Category", ["专业教育 Education", "创始人/品牌 Founder & Brand", "客户/社群 Client & Community", "产品/服务 Product & Offer", "伙伴/KOL Partner & KOL", "活动 Campaign"]),
            select("受众分类 Audience Segment", ["攀岩者 Climbers", "青少年家长 Youth Parents", "大众健身 General Fitness", "教练/专业人士 Coaches", "机构/团队 Institutions", "现有客户 Existing Clients"]),
            select("目标类型 Objective Type", ["触达 Reach", "教育 Educate", "互动 Engage", "获取线索 Generate Leads", "转化 Convert", "留存 Retain"]),
            select("审核状态 Approval Status", ["无需审核 Not Required", "草稿 Draft", "待创始人审核 Awaiting Review", "需修改 Changes Requested", "已批准 Approved"]),
            user("审核人 Reviewer"),
            text("审核意见 Review Note"),
            date("批准时间 Approved At", undefined, true),
            number("完播率 Completion Rate %"),
            integer("分享 Shares"),
            integer("点击 Clicks"),
            integer("购买 Purchases"),
            date("复盘截止 Analysis Due"),
            text("飞书任务GUID Feishu Task GUID"),
          ],
          views: [view("我的本周 My Week"), view("想法与调研 Ideas & Research"), view("待拍摄 Ready to Film"), view("待创始人审核 Founder Review"), view("已排期 Scheduled"), view("已发布待复盘 Published - Analyze"), view("归档 Archive")],
          forms: [
            form(
              "提交想法 Submit Idea",
              "先快速记录好想法；制作、审核和数据字段会在工作流中补充。",
              ["内容 Content", "平台 Platform", "内容支柱分类 Pillar Category", "受众分类 Audience Segment", "漏斗阶段 Funnel", "目标类型 Objective Type", "形式 Format", "出镜 Featured", "所属活动 Campaign", "学习/下一步 Learnings"],
              ["内容 Content", "平台 Platform", "内容支柱分类 Pillar Category", "受众分类 Audience Segment", "漏斗阶段 Funnel", "目标类型 Objective Type", "形式 Format"],
            ),
          ],
          manual: ["Create a Calendar view in Feishu UI bound to 发布日期 Publish Date.", "Configure each named view's filters, sorting, visible columns, and kanban grouping in Feishu UI."],
        },
        {
          name: "营销活动 Campaigns",
          fields: [
            select("状态 Status", ["计划中 Planning", "待批准 Pending Approval", "需修改 Changes Requested", "已批准 Approved", "进行中 Active", "已完成 Completed", "待核对 Reconciliation", "已核对 Reconciled", "已拒绝 Rejected", "已取消 Cancelled"], "状态只由Company Operations工作流推进，不得在表格中绕过审批。", true),
            select("产品 Product", ["数字计划 Digital", "线上1:1 Online Coaching", "线下训练 In-person", "团队/机构 Team"], undefined, true),
            multiSelect("目标受众 Target Audience", ["攀岩者 Climbers", "青少年家长 Youth Parents", "大众健身 General Fitness", "教练 Coaches", "机构/团队 Institutions", "现有客户 Existing Clients"]),
            text("核心卖点 Offer"),
            user("负责人 Owner"),
            text("需要决策 Decision Needed"),
            number("批准预算 Approved Budget"),
            user("审批人 Approver"),
            date("批准时间 Approved At", undefined, true),
            date("提交时间 Submitted At", "每次提交或重新提交方案的时间。", true),
            text("审核意见 Review Note"),
            number("目标回款 Revenue Target", "活动开始前设定的回款目标；不是实际收入。"),
            text("成功标准 Success Criteria"),
            text("活动代码 Campaign Code", "批准时由服务器生成并锁定；不得手工复用。"),
            text("员工归因代码 Staff Attribution Code", "不含姓名或身份证信息的内部归因代码。"),
            text("跟踪包 Tracking Kit", "批准时生成的渠道代码与HTTPS链接JSON；由Company Operations展示为可复制链接和二维码。"),
            number("员工归因比例% Attribution Share", "员工在该活动提成中的经批准归因份额。数字计划默认100%；需要成交人的项目默认80%。"),
            number("批准提成比例% Commission Rate", "批准时按提成制度快照；数字计划在核对时按实际档位重算。"),
            text("提成规则快照 Commission Rule", "保存批准时适用的规则。大于30万元的团队/机构合同必须在签约前书面确定比例。"),
            integer("触达/曝光 Reach"),
            integer("点击 Clicks"),
            integer("咨询 Consultations"),
            number("线下申报回款 Reported Offline Revenue", "线下、线上个训或机构合同的申报回款；必须附证据并由创始人核对。"),
            number("退款与调整 Refunds & Adjustments", "退款、取消和其他减少归因回款的调整总额。"),
            number("核准归因回款 Eligible Revenue", "创始人核对后的可计提回款。"),
            number("活动提成金额 Campaign Commission", "核准归因回款 × 提成比例 × 员工归因比例；进入月度提成结算单前仍不会自动支付。"),
            text("结果总结 Results Summary"),
            text("证据链接 Evidence Links", "每行一个HTTPS链接。不要粘贴客户健康、身份证或银行信息。"),
            date("结果提交时间 Results Submitted At", undefined, true),
            date("核对时间 Reconciled At", undefined, true),
            text("核对说明 Reconciliation Note"),
            number("投入产出 ROI"),
            date("下次决策/复盘 Next Review"),
          ],
          views: [view("计划中 Planning"), view("待批准 Pending Approval"), view("进行中 Active"), view("待复盘 Review Due"), view("归档 Archive")],
          forms: [
            form(
              "活动简报 Campaign Brief",
              "用于提出活动方案。任何对外承诺和支出必须在批准后执行。",
              ["活动 Campaign", "目标 Objective", "目标受众 Target Audience", "核心卖点 Offer", "产品 Product", "渠道 Channels", "预算 Budget", "目标回款 Revenue Target", "成功标准 Success Criteria", "开始 Start", "结束 End", "负责人 Owner", "需要决策 Decision Needed"],
              ["活动 Campaign", "目标 Objective", "目标受众 Target Audience", "产品 Product", "渠道 Channels", "预算 Budget", "目标回款 Revenue Target", "成功标准 Success Criteria", "开始 Start", "结束 End", "负责人 Owner"],
            ),
          ],
        },
        {
          name: "合作伙伴 KOL & Partners",
          fields: [
            user("负责人 Owner"),
            select("来源 Source", ["主动调研 Research", "员工推荐 Employee Referral", "伙伴推荐 Partner Referral", "自然联系 Inbound", "活动 Event", "其他 Other"]),
            select("受众匹配 Audience Fit", ["高 High", "中 Medium", "低 Low", "待评估 TBD"]),
            integer("典型播放 Typical Views"),
            number("拟议费用 Proposed Cost"),
            number("批准预算 Approved Budget"),
            select("费用审批 Spend Approval", ["不需要 Not Needed", "待申请 To Request", "审批中 Pending", "已批准 Approved", "已拒绝 Rejected"]),
            date("上次联系 Last Contact"),
            text("下一步 Next Action"),
            date("交付截止 Delivery Due"),
            select("交付状态 Deliverable Status", ["未开始 Todo", "制作中 In Progress", "待审核 Review", "已交付 Delivered", "已验收 Accepted"]),
            number("分佣比例 Affiliate Rate %"),
          ],
          views: [view("今日跟进 Follow Up Today"), view("已逾期 Overdue"), view("洽谈中 Negotiating"), view("合作中 Active"), view("已完成 Completed")],
          forms: [
            form(
              "快速添加伙伴 Quick Partner Capture",
              "只记录合作运营所需信息；不要在备注中放身份证、银行账户等敏感信息。",
              ["伙伴 Partner", "平台/账号 Platform & Handle", "领域 Sport/Niche", "城市 City", "粉丝数 Followers", "联系方式 Contact", "来源 Source", "受众匹配 Audience Fit", "合作形式 Type", "负责人 Owner", "备注 Notes"],
              ["伙伴 Partner", "平台/账号 Platform & Handle", "领域 Sport/Niche", "联系方式 Contact", "来源 Source", "受众匹配 Audience Fit", "负责人 Owner"],
            ),
          ],
        },
        {
          name: "线索 Leads CRM",
          fields: [
            select("平台 Platform", ["小红书 XHS", "抖音 Douyin", "公众号 WeChat OA", "视频号 Channels", "网站 Website", "线下 Offline", "其他 Other"]),
            user("负责人（飞书） Owner (Feishu)"),
            date("上次联系 Last Contact"),
            date("咨询日期 Consultation Date", undefined, true),
            select("咨询结果 Consultation Outcome", ["待进行 Pending", "合适 Qualified", "暂不合适 Not Fit", "需跟进 Follow Up", "已成交 Won"]),
            number("实际回款 Amount Collected"),
            date("成交日期 Conversion Date"),
            select("流失原因 Lost Reason", ["价格 Price", "时机 Timing", "产品不匹配 Product Fit", "无回复 No Response", "选择其他服务 Competitor", "其他 Other"]),
            text("订单/客户编号 Order or Client ID", "来自PostgreSQL的稳定编号。"),
            text("归因码 Attribution Code"),
            select("销售交接 Sales Handoff", ["未交接 Not Handed Off", "已通知 Founder Notified", "咨询处理中 Consultation", "已完成 Complete"]),
          ],
          views: [view("我的跟进 My Follow-ups"), view("新线索未分配 New & Unassigned"), view("咨询中 Consultations"), view("成交 Won"), view("流失/培育 Lost & Nurture")],
          forms: [
            form(
              "新线索登记 New Lead Form",
              "只记录联系与购买意向。健康、伤病和训练评估信息必须进入产品系统，不得写入此CRM。",
              ["线索 Lead", "创建日期 Created", "微信/联系 Contact", "平台 Platform", "城市 City", "运动项目 Sport", "来源 Source", "意向产品 Interest", "来源活动 Campaign", "来源伙伴 Partner", "下一步 Next Action", "下次跟进 Next Date", "备注 Notes (无健康信息 no health data)"],
              ["线索 Lead", "微信/联系 Contact", "平台 Platform", "来源 Source", "意向产品 Interest", "下一步 Next Action", "下次跟进 Next Date"],
            ),
          ],
        },
        {
          name: "平台数据 Platform Metrics",
          fields: [
            integer("主页访问 Profile Visits"),
            integer("点击 Clicks"),
            integer("分享 Shares"),
            integer("收藏 Saves"),
            integer("询盘 Inquiries"),
            text("最佳内容与原因 Best Content & Why"),
            text("最弱内容与原因 Weakest Content & Why"),
          ],
          views: [view("本周 This Week"), view("月度趋势 Monthly Trend")],
          forms: [
            form(
              "平台数据录入 Metrics Entry",
              "每个平台、每个周期提交一条。请使用同一统计口径。",
              ["记录 Record", "周期 Period", "平台 Platform", "期初粉丝 Start Followers", "期末粉丝 End Followers", "发布数 Posts", "总播放/曝光 Views", "互动 Engagement", "主页访问 Profile Visits", "点击 Clicks", "分享 Shares", "收藏 Saves", "询盘 Inquiries", "线索 Leads", "归因收入 Revenue", "最佳内容与原因 Best Content & Why", "最弱内容与原因 Weakest Content & Why", "学习 Learning"],
              ["记录 Record", "周期 Period", "平台 Platform", "期初粉丝 Start Followers", "期末粉丝 End Followers", "发布数 Posts", "总播放/曝光 Views", "线索 Leads", "归因收入 Revenue", "学习 Learning"],
            ),
          ],
        },
        {
          name: "周报与里程碑 Weekly Reports & Milestones",
          fields: [
            date("报告周 Reporting Week"),
            user("提交人 Author"),
            createdTime("提交时间 Submitted At"),
            user("查看人 Reviewed By"),
            date("查看时间 Reviewed At", undefined, true),
            select("决策状态 Decision Status", ["无需决策 None", "待创始人决策 Pending", "已决定 Decided"]),
          ],
          views: [view("本周 This Week"), view("待创始人查看 Founder Review"), view("需要决策 Decisions Needed"), view("历史 Archive")],
          forms: [
            form(
              "周报提交 Weekly Report",
              "每周五提交。重点写成果、问题、学习、需要创始人决定的事项和下周优先级。",
              ["报告 Report", "报告周 Reporting Week", "提交人 Author", "类型 Type", "A 完成事项 Completed", "B 主要成果 Results", "C 问题 Problems", "D 学习 Learnings", "E 需要决策 Decisions Needed", "F 下周优先级 Next Priorities"],
              ["报告 Report", "报告周 Reporting Week", "提交人 Author", "类型 Type", "A 完成事项 Completed", "B 主要成果 Results", "F 下周优先级 Next Priorities"],
            ),
          ],
        },
        {
          name: "增长实验 Growth Experiments",
          create: true,
          primary: text("实验 Experiment"),
          fields: [
            text("假设 Hypothesis"),
            user("负责人 Owner"),
            date("开始 Start"),
            date("结束 End"),
            text("变量 Variable"),
            multiSelect("渠道 Channel", ["小红书 XHS", "抖音 Douyin", "公众号 WeChat OA", "视频号 Channels", "网站 Website", "线下 Offline"]),
            text("成功指标 Success Metric"),
            number("基线 Baseline"),
            number("目标 Target"),
            select("状态 Status", ["想法 Idea", "待批准 Pending Approval", "运行中 Running", "分析中 Analyzing", "已完成 Completed", "已取消 Cancelled"]),
            text("结果 Result"),
            select("决策 Decision", ["未决定 Pending", "采用 Adopt", "迭代 Iterate", "停止 Stop"]),
            link("关联内容 Content", "内容日历 Content Calendar", undefined, true),
            link("关联活动 Campaign", "营销活动 Campaigns", undefined, true),
            text("学习 Learnings"),
          ],
          views: [view("运行中 Running"), view("待决策 Decision Needed"), view("已完成 Completed")],
          forms: [
            form(
              "提出增长实验 Propose Experiment",
              "一次只测试一个主要变量，并在开始前写清基线、目标和成功指标。",
              ["实验 Experiment", "假设 Hypothesis", "负责人 Owner", "开始 Start", "结束 End", "变量 Variable", "渠道 Channel", "成功指标 Success Metric", "基线 Baseline", "目标 Target", "关联内容 Content", "关联活动 Campaign"],
              ["实验 Experiment", "假设 Hypothesis", "负责人 Owner", "开始 Start", "结束 End", "变量 Variable", "成功指标 Success Metric", "基线 Baseline", "目标 Target"],
            ),
          ],
        },
      ],
    },
  },

  documents: [
    { name: "跃燃体育 Company OS · Start Here", type: "docx", permission: { ...internalReadableDocumentPermission, comment_entity: "anyone_can_view" } },
    { name: "提成制度 Commission Structure", type: "docx", permission: { ...internalReadableDocumentPermission, comment_entity: "anyone_can_view" } },
    { name: "报销制度 Expense Policy", type: "docx", permission: { ...internalReadableDocumentPermission, comment_entity: "anyone_can_view" } },
    { name: "入职指南 Onboarding Guide", type: "docx", permission: { ...internalReadableDocumentPermission, comment_entity: "anyone_can_view" } },
  ],

  manualFollowUps: [
    "Delete the default Team Ops 数据表 only after a human re-checks that all ten rows remain empty.",
    "Archive the legacy 入职流程 Onboarding table only after the new Templates/Cases/Tasks workflow is verified; never delete its existing rows automatically.",
    "Create the Content Calendar calendar view in Feishu UI and bind it to 发布日期 Publish Date (calendar binding is not supported by the view-create API).",
    "Configure filters, sorts, visible columns and kanban grouping for the named views in Feishu UI.",
    "Create Growth, Founder Finance and Team Ops dashboards in Feishu UI; the Open API can list/copy dashboards but cannot build dashboard widgets.",
    "Create native Expense, Leave, Travel and Marketing/KOL Spend approval definitions in Feishu Admin UI; do not create permanent approval definitions through the API.",
    "Enable the custom app's Web App and Bot capabilities, configure HTTPS URLs/event callbacks, publish a new version and obtain administrator approval.",
    "Move approved footage from the founder-personal folder into 公司共享资料 Company Shared Assets after founder access to the app-owned folder is verified.",
  ],
};

export const onboardingTemplateSeeds = [
  ["CONFIDENTIAL_DETAILS", "完成保密员工资料表 Complete confidential employee details", ["全员 All"], "保密资料 Confidential", 0, "新员工 New Hire", true, "只通过保密表单提交身份证、银行和紧急联系人信息。", 10],
  ["CONTRACT", "签署劳动合同与保密/IP条款 Sign contract and NDA/IP terms", ["全员 All"], "合同 Contract", 0, "创始人 Founder", true, "确保签署版本与员工手册一致并安全归档。", 20],
  ["POLICIES", "阅读并确认公司制度 Read and acknowledge company policies", ["全员 All"], "制度 Policies", 2, "新员工 New Hire", true, "完成员工手册、报销、保密与适用提成制度确认。", 30],
  ["EQUIPMENT", "发放并登记设备 Issue and register equipment", ["全员 All"], "设备 Equipment", 1, "行政 Admin", false, "仅在岗位需要公司设备时启用。", 40],
  ["FEISHU_ACCESS", "配置飞书账号和最小权限 Configure Feishu account and least-privilege access", ["全员 All"], "账号 Accounts", 1, "行政 Admin", true, "员工不得因日常运营需要而成为超级管理员。", 50],
  ["SOCIAL_ACCESS", "交接岗位所需社交账号 Grant required social-account access", ["品牌增长 Brand & Growth"], "账号 Accounts", 3, "创始人 Founder", true, "公司保留主所有权、恢复凭证和超级管理员控制。", 60],
  ["PAYROLL_PROFILE", "建立工资与适用提成档案 Create payroll and applicable commission profile", ["全员 All"], "行政 Admin", 3, "行政 Admin", true, "工资核算信息只保存在保密空间。", 70],
  ["ORIENTATION", "完成产品、品牌和职责边界培训 Complete product, brand and role-boundary orientation", ["全员 All"], "培训 Training", 3, "直属负责人 Manager", true, "明确可自主事项、需确认事项和禁止事项。", 80],
  ["PROBATION_GOALS", "书面确认试用期目标和首90天计划 Confirm probation goals and first 90-day plan", ["全员 All"], "绩效 Performance", 5, "共同 Joint", true, "确认交付物、时间、资源、证据和合理依赖。", 90],
  ["DAY30", "完成Day 1-30交付与复盘 Complete Day 1-30 deliverables and review", ["品牌增长 Brand & Growth"], "培训 Training", 30, "共同 Joint", true, "品牌/产品/账号审查、内容支柱、30天日历、素材库和SOP。", 100],
  ["MID_PROBATION", "进行试用期中期回顾 Hold mid-probation review", ["全员 All"], "绩效 Performance", 30, "直属负责人 Manager", true, "书面记录进展、障碍、资源与调整。", 110],
  ["DAY60", "完成Day 31-60交付与复盘 Complete Day 31-60 deliverables and review", ["品牌增长 Brand & Growth"], "培训 Training", 60, "共同 Joint", true, "稳定发布与复盘，至少一个经批准的活动/KOL/社群试点。", 120],
  ["PROBATION_REVIEW", "完成转正评估 Complete probation completion review", ["全员 All"], "绩效 Performance", 60, "直属负责人 Manager", true, "按合同、手册和岗位附件评估；合理排除公司未提供资源的影响。", 130],
  ["DAY90", "完成Day 61-90交付与首90天总结 Complete Day 61-90 deliverables and 90-day summary", ["品牌增长 Brand & Growth"], "培训 Training", 90, "共同 Joint", true, "完成增长活动、可追踪询盘/转化测试、核心SOP和下阶段计划。", 140],
].map(([key, task, roles, category, relativeDay, ownerRole, required, instructions, sortOrder]) => ({
  "模板编号 Template Key": key,
  "任务 Task": task,
  "适用岗位 Roles": roles,
  "类别 Category": category,
  "相对天数 Relative Day": relativeDay,
  "负责人角色 Owner Role": ownerRole,
  "必做 Required": required,
  "说明 Instructions": instructions,
  "启用 Active": true,
  "排序 Sort Order": sortOrder,
}));

export function fieldPayload(spec, tableIdsByName) {
  const payload = {
    field_name: spec.name,
    type: spec.type,
  };
  if (spec.ui_type) payload.ui_type = spec.ui_type;
  if (spec.description) {
    payload.description = {
      text: spec.description,
      disable_sync: false,
    };
  }
  if (spec.type === FIELD_TYPES.LINK) {
    const tableId = tableIdsByName.get(spec.linkTo);
    if (!tableId) throw new Error(`Cannot resolve linked table: ${spec.linkTo}`);
    payload.property = { table_id: tableId, multiple: Boolean(spec.multiple) };
  } else if (spec.property !== undefined) {
    payload.property = spec.property;
  }
  return payload;
}
