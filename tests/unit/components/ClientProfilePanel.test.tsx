import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ClientProfilePanel from "../../../src/ClientProfilePanel";
import type { Client } from "../../../src/appCore";
const client = { id: "CL-0002", clientCode: "CL-0002", name: "Mei Lin", initials: "ML", status: "Active", coach: "Kent Bastell", primaryCoach: "COACH-KENT", clientType: "Online Coaching", notes: "Climbing athlete" } as Client;
const props = () => ({ accountClient: client, allCoaches: [{ recordId: "COACH-KENT", coachId: "COACH-KENT", name: "Kent Bastell", role: "Admin", status: "Active" }], teams: [], programs: [], setAccountClientId: vi.fn(), openAthleteCalendar: vi.fn(), openProfileTraining: vi.fn(), openProfileOrders: vi.fn(), saveProfile: vi.fn().mockResolvedValue(undefined), reloadProfileSubscriptions: vi.fn().mockResolvedValue([]), saveProfileTeam: vi.fn() });
describe("client profile", () => {
  it("saves a private alias, merged tags and custom colours through the profile", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ orders: [] }) }));
    const p = props();
    render(<ClientProfilePanel {...p} accountClient={{ ...client, categories: ["Youth"] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByLabelText("Coach alias"), { target: { value: "Mei" } });
    fireEvent.click(screen.getByRole("button", { name: "Teams & tags", exact: true }));
    expect(screen.queryByText("Sports & categories")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Colour for Youth"), { target: { value: "#223344" } });
    fireEvent.change(screen.getByLabelText("New tag", { exact: true }), { target: { value: "Climbing" } });
    fireEvent.click(screen.getByRole("button", { name: "Add", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(p.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ name: client.name, coachAlias: "Mei", tags: ["Youth", "Climbing"], categories: [], tagColors: { Youth: "#223344", Climbing: "#e8ddbf" } })));
  });
  it("renders the client identity and profile sections", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ orders: [] }) }));
    render(<ClientProfilePanel {...props()} />);
    expect(screen.getByRole("heading", { name: client.name })).toBeInTheDocument();
    for (const name of ["Overview", "Coaching & access", "Payments", "Teams & tags"]) {
      expect(screen.getByRole("button", { name, exact: true })).toBeInTheDocument();
    }
    await screen.findByText("No payment recorded");
  });
  it("closes via the profile close button", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ orders: [] }) }));
    const p = props();
    render(<ClientProfilePanel {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Close profile" }));
    expect(p.setAccountClientId).toHaveBeenCalledWith("");
  });
  it("preserves the draft after a failed save", async () => {
    const p = props(); p.saveProfile.mockRejectedValue(new Error("Connection lost"));
    render(<ClientProfilePanel {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByLabelText("Phone / WeChat"), { target: { value: "13900001111" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection lost");
    expect(screen.getByLabelText("Phone / WeChat")).toHaveValue("13900001111");
    expect(p.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ coach: "Kent Bastell", primaryCoachId: "COACH-KENT", phone: "13900001111" }));
  });
  it("protects unsaved profile changes when navigating to the calendar", () => {
    const p = props(); render(<ClientProfilePanel {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByLabelText("Name", { exact: true }), { target: { value: "Mei" } });
    fireEvent.click(screen.getByRole("button", { name: "Calendar", exact: true }));
    expect(p.openAthleteCalendar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("Name", { exact: true })).toHaveValue("Mei");
    fireEvent.click(screen.getByRole("button", { name: "Close profile" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(p.setAccountClientId).toHaveBeenCalledWith("");
  });
  it("shows unavailable payment history instead of claiming no payment exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<ClientProfilePanel {...props()} />);
    await screen.findByText("Unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Payments", exact: true }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
    expect(screen.queryByText("No payments recorded")).not.toBeInTheDocument();
  });
  it("never exposes another athlete's payment, even when names match", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ orders: [
      { recordId: "ORD-1", clientId: client.id, clientName: client.name, productName: "Climbing coaching", paymentStatus: "Paid", paidAt: "2026-10-12", amount: "100", currency: "CNY" },
      { recordId: "ORD-2", clientId: "CL-OTHER", clientName: client.name, productName: "Other athlete payment", paymentStatus: "Paid", paidAt: "2026-10-15", amount: "999", currency: "CNY" },
    ] }) }));
    render(<ClientProfilePanel {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Payments", exact: true }));
    await screen.findByText("Climbing coaching");
    expect(screen.queryByText("Other athlete payment")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/12 Oct 2026/).length).toBeGreaterThan(0));
  });
});
