import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import AthleteSessionGate from "../../../src/AthleteSessionGate";
const { nativeFetch } = vi.hoisted(() => ({ nativeFetch: vi.fn() }));
vi.mock("../../../src/appCore", () => ({ nativeFetch }));
vi.mock("../../../src/WxLoginQr", () => ({ default: () => null }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en", changeLanguage: vi.fn() } }) }));
beforeEach(() => { window.history.replaceState(null, "", "/?portal=client&client=CL-9001"); nativeFetch.mockReset(); });
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });
const mount = () => render(<AthleteSessionGate><div>Private portal</div></AthleteSessionGate>);
describe("athlete login rollout gate", () => {
  it("preserves legacy portal access only when the server explicitly enables compatibility", async () => {
    nativeFetch.mockResolvedValue(new Response(JSON.stringify({ authenticated: false, required: false })));
    mount(); await screen.findByText("Private portal");
  });
  it.each([true, undefined])("requires login when enforcement is %s", async required => {
    nativeFetch.mockResolvedValue(new Response(JSON.stringify({ authenticated: false, required })));
    mount(); await screen.findByLabelText("athleteSessionPin"); expect(screen.queryByText("Private portal")).toBeNull();
  });
  it("cannot treat a failed session check as compatibility approval", async () => {
    nativeFetch.mockRejectedValue(new Error("Offline"));
    mount(); await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(screen.queryByText("Private portal")).toBeNull();
  });
});
