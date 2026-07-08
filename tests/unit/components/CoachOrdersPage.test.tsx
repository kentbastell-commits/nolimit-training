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
  setOrderSearch: vi.fn(),
  setOrderStartDates: vi.fn(),
  setShowManualOrderForm: vi.fn(),
  showManualOrderForm: false,
  updateProductOrder: vi.fn(),
  visibleProductOrders: [],
};

describe("CoachOrdersPage", () => {
  it("renders the orders summary and empty review queue", () => {
    render(<CoachOrdersPage {...baseProps} />);
    expect(screen.getByText("Total Orders")).toBeInTheDocument();
    expect(screen.getByText("Intake Review Queue")).toBeInTheDocument();
    expect(
      screen.getByText("No intake items need review right now.")
    ).toBeInTheDocument();
  });

  it("toggles the manual order form", () => {
    const setShowManualOrderForm = vi.fn();
    render(
      <CoachOrdersPage
        {...baseProps}
        setShowManualOrderForm={setShowManualOrderForm}
      />
    );
    fireEvent.click(screen.getByText("+ Manual Order"));
    expect(setShowManualOrderForm).toHaveBeenCalledTimes(1);
  });
});
