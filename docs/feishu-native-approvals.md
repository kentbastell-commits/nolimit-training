# Feishu native approvals — administrator build sheet

These definitions are intentionally created in **Feishu Approval Admin**, not
through OpenAPI. Feishu warns that API-created definitions cannot be disabled
or deleted. Use the exact names below so the Company Operations workspace can
link and sync them consistently.

The signed Employee Handbook and employment contract remain authoritative.

## Common settings

- Availability: all current employees; remove departed employees immediately.
- First approver: direct manager. While the company is small, use the founder.
- Finance visibility: founder plus the designated finance/accounting role.
- Employees may withdraw while pending, but may not edit an approved request.
- Require a rejection reason.
- Keep the Approval serial number and timestamps as the audit reference.
- Do not ask for health information in a general leave form. Medical details,
  if ever required, use a separately authorised confidential channel.

## 报销申请 / Expense reimbursement

Fields, in order:

1. Expense date — required date
2. Category — required single select: Travel / Meals / Marketing / Software /
   Equipment / Office / Other
3. Business purpose — required long text
4. Amount and currency — required amount, default CNY
5. Receipt/invoice — required attachment except when a written exception is
   approved
6. Pre-approval reference — conditional text
7. Campaign/project — optional text
8. Payment note — optional text; never collect bank credentials here

Route: direct manager/founder approval. Finance marks payment in the locked
payroll/expense register. Claims should be submitted within ten business days.

## 请假申请 / Leave

Fields: leave type, start/end, duration, work handover, urgent-contact plan and
notes. Route to direct manager. Do not include medical diagnosis fields.

## 出差申请 / Business travel

Fields: destination, dates, business purpose, transport estimate, hotel
estimate, other estimate, total budget, itinerary/quote and advance required.
Route to direct manager/founder before booking.

## 市场费用 / Marketing spend

Fields: campaign, objective, audience, supplier/platform, requested budget,
expected result, measurement plan, quote and decision deadline. Route to the
founder before any commitment.

## KOL/供应商合作 / KOL or vendor commitment

Fields: partner/vendor, deliverables, due dates, usage rights, total cost,
payment milestones, tracking code, quote/contract and expected outcome. Route
to the founder before confirming the engagement.

## 折扣与特殊商务条款 / Discount or special commercial terms

Fields: customer/partner, standard price, proposed price, discount percentage,
reason, expected commercial value, validity period and any non-standard terms.
Route to the founder before quoting or promising the exception externally.

## Connecting definitions to the workspace

After each definition is published, copy its Approval Code from the definition
URL into the matching server variable:

```text
FEISHU_EXPENSE_APPROVAL_CODE
FEISHU_LEAVE_APPROVAL_CODE
FEISHU_TRAVEL_APPROVAL_CODE
FEISHU_MARKETING_APPROVAL_CODE
FEISHU_VENDOR_APPROVAL_CODE
FEISHU_DISCOUNT_APPROVAL_CODE
```

Restart the server after adding codes. Until a code is present, the workspace
uses its controlled internal decision queue and clearly labels that fallback.
