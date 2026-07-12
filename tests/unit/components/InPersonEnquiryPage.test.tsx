import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InPersonEnquiryPage from "../../../src/InPersonEnquiryPage";

const baseProps = {
  enquiryForm: {
    contactPerson: "",
    contact: "",
    organization: "",
    athletes: "",
    duration: "",
    notes: "",
  },
  enquirySubmitted: false,
  inviteLang: "en",
  setEnquiryForm: vi.fn(),
  setInviteLang: vi.fn(),
  submitEnquiry: vi.fn(),
  submittingEnquiry: false,
  toasts: [],
};

describe("InPersonEnquiryPage", () => {
  it("renders the enquiry form in English", () => {
    render(<InPersonEnquiryPage {...baseProps} />);
    expect(
      screen.getByText("In-Person Training & Consulting")
    ).toBeInTheDocument();
    expect(screen.getByText("Send Enquiry")).toBeInTheDocument();
  });

  it("shows the success state after submission", () => {
    render(<InPersonEnquiryPage {...baseProps} enquirySubmitted={true} />);
    expect(screen.getByText("Enquiry sent")).toBeInTheDocument();
  });

  it("switches language via the toggle", () => {
    const setInviteLang = vi.fn();
    render(<InPersonEnquiryPage {...baseProps} setInviteLang={setInviteLang} />);
    fireEvent.click(screen.getByText("中文"));
    expect(setInviteLang).toHaveBeenCalledWith("zh");
  });

  it("requires privacy and temporary cross-border consent", () => {
    render(<InPersonEnquiryPage {...baseProps} />);
    const submit = screen.getByRole("button", { name: "Send Enquiry" });
    expect(submit).toBeDisabled();
    const checks = screen.getAllByRole("checkbox");
    expect(checks).toHaveLength(2);
    checks.forEach((check) => fireEvent.click(check));
    expect(submit).toBeEnabled();
  });
});
