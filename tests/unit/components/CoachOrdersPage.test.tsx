import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CoachOrdersPage from "../../../src/CoachOrdersPage";

const baseProps = {
  activationClientName: "",
  activationPortalLink: "",
  activeCoaches: [],
  assignOrderIntake: vi.fn(),
  assignOrderProgram: vi.fn(),
  buildClientPortalLink: vi.fn(() => ""),
  copyToClipboard: vi.fn(),
  createManualProductOrder: vi.fn(),
  deleteProductOrder: vi.fn(),
  getContentResponseLabel: vi.fn(() => ""),
  getOrderClient: vi.fn(() => null),
  getOrderIntakeTemplate: vi.fn(() => null),
  getOrderPipelineStatus: vi.fn(() => "New"),
  getOrderPrimaryCoach: vi.fn(() => "--"),
  getOrderProgram: vi.fn(() => null),
  getOrderStageIndex: vi.fn(() => 0),
  getOrderStartDate: vi.fn(() => ""),
  loadProductOrders: vi.fn(),
  manualOrder: {},
  markOrderIntakeReviewed: vi.fn(),
  newOrdersQueue: [],
  openOrderReview: vi.fn(),
  openOrdersCount: 0,
  orderPipelineStages: ["New", "Intake Sent", "Ready"],
  orderProcessingId: "",
  orderReviewLoading: false,
  orderReviewOrder: null,
  orderReviewResponses: [],
  orderSearch: "",
  programs: [],
  readyOrdersCount: 0,
  resetManualOrderForm: vi.fn(),
  reviewAndLoadProgram: vi.fn(),
  reviewQueueOrders: [],
  savingManualOrder: false,
  selectManualOrderProgram: vi.fn(),
  selectedManualOrderProgram: null,
  setActivationClientName: vi.fn(),
  setActivationPortalLink: vi.fn(),
  setManualOrder: vi.fn(),
  setOrderReviewOrder: vi.fn(),
  setOrderSearch: vi.fn(),
  setOrderStartDates: vi.fn(),
  setShowManualOrderForm: vi.fn(),
  showManualOrderForm: false,
  updateProductOrder: vi.fn(),
  visibleProductOrders: [],
};

describe("CoachOrdersPage", () => {
  it("renders the onboarding board and empty coaching queue", () => {
    render(<CoachOrdersPage {...baseProps} />);
    // the "Total Orders" summary + "Intake Review Queue" were replaced by a
    // segmented layout; the default Online Coaching segment shows an
    // onboarding-queue board and an empty state
    expect(screen.getByText("Onboarding queue")).toBeInTheDocument();
    expect(screen.getByText("athletes need attention")).toBeInTheDocument();
    expect(screen.getByText("No coaching orders here")).toBeInTheDocument();
  });

  it("opens the manual order form from the in-person ledger", () => {
    const setShowManualOrderForm = vi.fn();
    const setManualOrder = vi.fn();
    render(
      <CoachOrdersPage
        {...baseProps}
        setShowManualOrderForm={setShowManualOrderForm}
        setManualOrder={setManualOrder}
      />
    );
    // "+ Manual Order" moved into the In-person segment as "New in-person order"
    fireEvent.click(screen.getByText("In-person"));
    fireEvent.click(
      screen.getByRole("button", { name: "New in-person order" })
    );
    expect(setShowManualOrderForm).toHaveBeenCalledWith(true);
    expect(setManualOrder).toHaveBeenCalledWith(
      expect.objectContaining({ productType: "In-Person Training" })
    );
  });
});
