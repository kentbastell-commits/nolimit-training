# Company Ops revenue attribution

Use opaque codes in campaign and content links so paid orders can be reconciled
to Feishu Growth records without copying customer or coaching data into Feishu.

Example digital-program link:

```text
https://trainnolimit.cn/store?utm_source=douyin&utm_medium=organic-video&utm_campaign=AUG-LAUNCH&staff=BG-01&partner=KOL-021&attribution=VIDEO-007
```

The same parameters work on `/coaching`.

## Parameters

| Parameter | Purpose | Example |
|---|---|---|
| `utm_source` | Platform/source | `douyin` |
| `utm_medium` | Distribution method | `organic-video` |
| `utm_campaign` or `campaign` | Campaign code | `AUG-LAUNCH` |
| `staff` | Internal attribution code, never a name or ID number | `BG-01` |
| `partner` or `kol` | Partner/KOL code | `KOL-021` |
| `attribution` or `utm_content` | Individual content/link code | `VIDEO-007` |
| `ref` | Existing client referral code | `CL-1234` |

Keep codes stable and record them on the matching Campaign, Partner and Content
records. Do not place phone numbers, names, health details, bank details or other
personal information in these parameters.

The Company Operations campaign workflow creates these values at founder
approval. Staff must use the generated tracking link or QR code rather than
inventing a code. Each approved channel gets its own opaque attribution code,
which makes the campaign and channel auditable without exposing an employee's
name or Feishu identity in a public URL.

## Campaign workflow

1. Growth submits a guided brief with objective, audience, offer, product,
   channels, budget, revenue target, success criteria and dates.
2. The founder approves, requests changes or rejects. Approval snapshots the
   attribution share and applicable commission rule; campaigns over CNY
   300,000 require an explicit written custom rate before approval.
3. Approval generates a campaign code, staff code and channel-specific links
   and QR codes. Growth activates the campaign only after checking each link.
4. At completion, Growth submits a narrative result, HTTPS evidence links,
   offline/manual revenue and refunds or adjustments. Manual revenue requires
   evidence.
5. The founder reconciles against paid Postgres orders. Eligible revenue cannot
   exceed paid tracked revenue plus evidenced manual revenue, less refunds and
   adjustments.
6. Reconciliation calculates the commission preview and freezes the campaign
   record. It does not pay payroll automatically; the amount is staged for the
   reviewed monthly commission statement.

Status sequence:

```text
Pending Approval -> Approved -> Active -> Reconciliation -> Reconciled
        |
        +-> Changes Requested -> Pending Approval
        +-> Rejected
```

The current rules used by the calculator (revised 2026-08-12 — replaces the
earlier 4/5/6% tiered digital model, 3% in-person and 2% team contract):

| Product | Eligible commission rule | Default attribution share |
|---|---:|---:|
| Digital programs | 10% of net collected revenue; 13% on the portion above CNY 80,000 in a calendar month | 100% |
| Online 1:1 coaching | 8% of the first three paid months | 80% |
| In-person coaching | 5% of the first paid package | 80% |
| Team/institution contract | Pre-approved written flat fee, agreed before approval | 80% |
| Presentation / workshop / camp | Pre-approved written flat fee | 80% |

`server/companyOps/campaignPolicy.ts` is the executable copy of this table —
change both together or the app will pay a rate the policy doesn't state.

For shared work, the recommended evidence model is originator 40%, campaign
manager 40% and closer 20%, with an unassigned role redistributed among the
documented contributors. The founder-approved staff share is the amount used
for the campaign calculation. The signed contract and Employee Handbook remain
authoritative if policy changes.

## Money controls

- Postgres product orders are the source of truth for collected product revenue.
- Feishu tracks campaigns, approved commission rules, review, acknowledgement
  and disputes; it is not the formal accounting ledger.
- Only orders whose payment status is verified as `Paid` count as collected
  revenue.
- Link parameters are attribution evidence, not authorization; they are
  client-supplied and must never trigger an automatic payout by themselves.
- Refunds, cancellations, taxes and other adjustments must be reviewed before a
  commission statement is approved.
- No automated payout should be enabled until the signed commission appendix and
  effective-dated rules have been approved by the company.
