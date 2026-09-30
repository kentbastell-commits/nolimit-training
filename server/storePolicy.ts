import { STORE_PUBLIC } from "../src/storeFlags.ts";

export const STORE_PAUSED = {
  code: "DIGITAL_STORE_PAUSED",
  error: "Digital programs are not available for purchase yet. Please contact your coach.",
  messageCn: "数字训练计划尚未开放购买，请联系您的教练。",
};

export function digitalSalesPaused(productType: string): boolean {
  return !STORE_PUBLIC && productType.trim().toLowerCase() === "digital program";
}
