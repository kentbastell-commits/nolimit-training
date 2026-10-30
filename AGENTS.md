# Codex project instructions

Before working on exercise footage, read `docs/footage-reframing-runbook.md` in full. It is the canonical record of the approved 9:16 and 16:9 workflows, framing decisions, audio rules, output locations, and QA requirements. Its future-edit decision process and full-duration visual/technical QA gates are mandatory: measure the complete technique-critical motion envelope, render a candidate, and verify movement extremes before replacing a master. Do not replace its per-clip decisions with a generic center crop or use a paid reframe service unless Kent explicitly authorizes new spending.

## Company bank transfer reference

For company bank account details and customer bank-transfer instructions, read `company-reference.local/bank-transfer-details.json`. The reusable Chinese and English customer text is in `company-reference.local/customer-bank-transfer-details.txt`. Kent supplied these details on 2026-10-19. This local reference folder is excluded from Git by the existing `*.local` rule. Keep the full record local unless Kent requests a specific use; preparing a template does not authorize sending it to anyone or publishing it in the app.

Kent subsequently requested bank-transfer instructions in Orders with an editable remark. The implementation is `src/BankTransferModal.tsx`, backed by the coach-authenticated `api/bankTransferDetails.ts`; the customer payment fields are intentionally available there, while the legal representative remains in the local record. Keep the local reference and the endpoint consistent when Kent changes bank details. Copying or sharing instructions must not mark an order paid.
