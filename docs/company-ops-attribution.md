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
