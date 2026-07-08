import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AddClientModal from "../../../src/AddClientModal";

const baseProps = {
  t: (k: string) => k,
  activeCoaches: [{ recordId: "rec1", coachId: "C-1", name: "Kent" }],
  closeClientForm: vi.fn(),
  editingClient: null,
  newClient: {
    name: "",
    clientType: "Online Coaching",
    coach: "",
    primaryCoachId: "",
    secondaryCoachId: "",
    packageType: "Active",
    packageName: "",
    languagePreference: "English",
    email: "",
    phone: "",
    startDate: "",
    subscriptionStatus: "Active",
    intakeStatus: "Not Sent",
    paymentStatus: "Unpaid",
    source: "Manual Entry",
    purchasedProgramId: "",
    accessStartDate: "",
    accessEndDate: "",
    notes: "",
  },
  saveClientForm: vi.fn(),
  savingClient: false,
  setNewClient: vi.fn(),
};

describe("AddClientModal", () => {
  it("renders the add-client form", () => {
    render(<AddClientModal {...baseProps} />);
    expect(
      screen.getByRole("heading", { name: "Add Client" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Client" })
    ).toBeInTheDocument();
  });

  it("renders edit mode when editing a client", () => {
    render(<AddClientModal {...baseProps} editingClient={{ id: "CL-1" }} />);
    expect(
      screen.getByRole("heading", { name: "Edit Client" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Client" })
    ).toBeInTheDocument();
  });

  it("calls closeClientForm from the Cancel button", () => {
    const closeClientForm = vi.fn();
    render(<AddClientModal {...baseProps} closeClientForm={closeClientForm} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(closeClientForm).toHaveBeenCalled();
  });
});
