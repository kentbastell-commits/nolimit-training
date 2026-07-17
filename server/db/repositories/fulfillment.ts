// Order-fulfillment orchestration: autoLoadProgram turns a client's PAID,
// unloaded program orders into scheduled assigned-workouts, marks the orders
// fulfilled, and stamps the client's program link / intake status / access
// window. Composes several tables, so it gets its own domain.
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/fulfillment.ts";
import { invalidateCache } from "../../../api/_cache.ts";

export type AutoLoadProgramInput = {
  // Feishu record_id of the client; the CL-… code on Postgres.
  clientRecordId: string;
  startDate?: string;
};

// HTTP-shaped result + an optional coach notification composed by the impl
// (the handler fires it — impls never talk to WeChat/webhooks directly).
export type AutoLoadProgramResult = {
  status: number;
  body: Record<string, any>;
  notice?: string;
};

export async function autoLoadProgram(
  input: AutoLoadProgramInput
): Promise<AutoLoadProgramResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/fulfillment.ts")).autoLoadProgram(input)
      : await feishu.autoLoadProgram(input);

  // Only a load that actually created workouts touches these tables — the
  // alreadyLoaded / payment-pending / failure paths never invalidate (same as
  // the old handler).
  if (result.status === 200 && result.body?.workoutsCreated !== undefined) {
    invalidateCache("workouts");
    invalidateCache("productOrders");
    invalidateCache("clients");
    invalidateCache("contentAssignments");
  }
  return result;
}

/* ---------------------- store + coaching signups --------------------------- */

// HTTP-shaped result + coach notifications composed by the impl (the handler
// fires them in order — impls never talk to the webhook directly).
export type SignupResult = {
  status: number;
  body: Record<string, any>;
  notices: string[];
};

export type ActivateDigitalOrderInput = {
  clientName: string;
  phone: string;
  email?: string;
  programId: string;
  // Feishu record_id of the program; the PR-… code on Postgres.
  programRecordId?: string;
  programName?: string;
  amount?: unknown;
  currency?: string;
  defaultIntakeFormId?: string;
  paymentCode?: string;
  addons?: any[];
  bundleItems?: any[];
  languagePreference?: string;
  consentVersion?: string;
};

export type CoachingSignupInput = {
  stage?: string;
  clientName?: string;
  clientCode?: string;
  // Feishu record_id of the client; the CL-… code on Postgres.
  clientRecordId?: string;
  phone?: string;
  termLabel?: string;
  amount?: unknown;
  currency?: string;
  paymentCode?: string;
  languagePreference?: string;
  startDate?: string;
  sport?: string;
  goal?: string;
  consentVersion?: string;
  trainingAge?: string;
  position?: string;
  days?: string;
  compDate?: string;
  injuries?: string;
  equipment?: string;
  notes?: string;
  healthConsent?: unknown;
  [key: string]: unknown;
};

export async function activateDigitalOrder(
  input: ActivateDigitalOrderInput
): Promise<SignupResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/fulfillment.ts")).activateDigitalOrder(input)
      : await feishu.activateDigitalOrder(input);
  if (result.status === 200) {
    invalidateCache("clients");
    invalidateCache("productOrders");
    invalidateCache("contentAssignments");
    invalidateCache("workouts");
  }
  return result;
}

export async function coachingSignup(input: CoachingSignupInput): Promise<SignupResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/fulfillment.ts")).coachingSignup(input)
      : await feishu.coachingSignup(input);
  if (result.status === 200) {
    invalidateCache("clients");
    // Only the order stage touches orders; the intake stage only edits the client.
    if (input.stage !== "intake") invalidateCache("productOrders");
  }
  return result;
}
