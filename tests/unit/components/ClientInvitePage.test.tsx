import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ClientInvitePage from "../../../src/ClientInvitePage";

const baseProps = {
  copyToClipboard: vi.fn(),
  inviteClientId: "",
  inviteForm: {
    name: "",
    trainingFormat: "Online Coaching",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    height: "",
    weight: "",
    experience: "",
    sport: "",
    currentTraining: "",
    daysPerWeek: "",
    sessionLength: "",
    equipment: "",
    goals: "",
    notes: "",
  },
  inviteLang: "en",
  inviteSubmitted: false,
  setInviteForm: vi.fn(),
  setInviteLang: vi.fn(),
  submitInviteForm: vi.fn(),
  submittingInvite: false,
  toasts: [],
};

describe("ClientInvitePage", () => {
  it("renders the intake form in English", () => {
    render(<ClientInvitePage {...baseProps} />);
    expect(
      screen.getByRole("heading", { name: "Client Intake" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit Intake" })
    ).toBeInTheDocument();
  });

  it("toggles the form language", () => {
    const setInviteLang = vi.fn();
    render(<ClientInvitePage {...baseProps} setInviteLang={setInviteLang} />);
    fireEvent.click(screen.getByRole("button", { name: "中文" }));
    expect(setInviteLang).toHaveBeenCalledWith("zh");
  });

  it("shows the success state with a portal link after submission", () => {
    render(
      <ClientInvitePage
        {...baseProps}
        inviteSubmitted={true}
        inviteClientId="CL-1"
      />
    );
    expect(
      screen.getByRole("heading", { name: "You're In" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open My Training Portal" })
    ).toBeInTheDocument();
  });
});
