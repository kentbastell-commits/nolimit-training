// All provider confirmation paths enforce the same integer-fen contract.
// Missing amounts must fail closed rather than silently skipping verification.
export function paymentAmountMatches(paidFen: unknown, expectedFen: number): boolean {
  return typeof paidFen === "number" && Number.isSafeInteger(paidFen) &&
    Number.isSafeInteger(expectedFen) && expectedFen > 0 && paidFen === expectedFen;
}
