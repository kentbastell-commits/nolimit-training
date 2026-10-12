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
  isChinese: false,
};

describe("CoachOrdersPage", () => {
  it("renders the onboarding board and empty coaching queue", () => {
    render(<CoachOrdersPage {...baseProps} />);
    // the "Total Orders" summary + "Intake Review Queue" were replaced by a
    // segmented layout; the default Online Coaching segment shows an
    // onboarding-queue board and an empty state
    expect(screen.getByText("Onboarding queue")).toBeInTheDocument();
    expect(screen.getByText("paid orders need attention")).toBeInTheDocument();
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

  it("shows and verifies a pending digital payment reference", () => {
    const updateProductOrder = vi.fn();
    const order = {
      recordId: "rec-order-1",
      orderId: "ORD-1001",
      clientName: "Wei Chen",
      productName: "Climbing S1",
      productType: "Digital Program",
      amount: "299",
      currency: "CNY",
      paymentStatus: "Pending",
      paymentReference: "NL-7KQ9",
    };
    render(
      <CoachOrdersPage
        {...baseProps}
        visibleProductOrders={[order]}
        updateProductOrder={updateProductOrder}
      />
    );

    fireEvent.click(screen.getByText("1 unpaid digital checkout attempt — not a sale"));
    fireEvent.click(screen.getByText("Wei Chen · 1 unpaid attempt"));
    expect(screen.getByText("NL-7KQ9")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Verify payment" }));
    expect(updateProductOrder).toHaveBeenCalledWith(
      order,
      { paymentStatus: "Paid" }
    );
  });

  it("separates CC's unpaid attempts and historical fixtures from paid sales", () => {
    const digital = (recordId: string, extras = {}) => ({ recordId, orderId: recordId, productType: "Digital Program", clientName: "CC", clientId: "CL-CC", amount: "299", currency: "CNY", paymentStatus: "Pending", ...extras });
    const orders = [
      ...Array.from({length:38},(_,i)=>digital(`ORD-${i}`)),
      digital("paid",{clientName:"Claire",clientId:"CL-CLAIRE",amount:"288",paymentStatus:"Paid"}),
      digital("demo",{paymentStatus:"Paid",paymentProvider:"Internal Demo",amount:"0"}),
      digital("test1",{paymentStatus:"Paid",clientName:"Battery Test 1784644538425"}),
      digital("test2",{paymentStatus:"Paid",clientName:"Battery Test 1784644585867"}),
      digital("penny",{paymentStatus:"Paid",productName:"Payment Test 0.01",amount:"0.01"}),
    ];
    render(<CoachOrdersPage {...baseProps} visibleProductOrders={orders} />);
    expect(screen.getByText("1 paid order")).toBeInTheDocument();
    expect(screen.getByText("CNY 288")).toBeInTheDocument();
    expect(screen.queryByText(/43 sales/)).not.toBeInTheDocument();
    const history=screen.getByText("38 unpaid digital checkout attempts — not sales").closest("details");
    expect(history).not.toHaveAttribute("open");
    expect(screen.getByText("CC · 38 unpaid attempts")).toBeInTheDocument();
    expect(screen.getByText("Test and demo records · 4")).toBeInTheDocument();
  });

  it("shows Xiaowei paid without inventing questionnaire work or active athletes", () => {
    const paid={recordId:"XW",orderId:"XW",clientName:"Xiaowei",productType:"Online Coaching",amount:"16800",currency:"CNY",paymentStatus:"Paid",intakeStatus:"Not Needed",assignedCoach:"Mario"};
    const pending={...paid,recordId:"UNPAID",orderId:"UNPAID",clientName:"Unpaid prospect",paymentStatus:"Pending",intakeStatus:"Not Sent",assignedCoach:""};
    render(<CoachOrdersPage {...baseProps} visibleProductOrders={[paid,pending]} />);
    expect(screen.getByText("Paid CNY 16,800")).toBeInTheDocument();
    expect(screen.getByText("Not required")).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Review intake"})).not.toBeInTheDocument();
    expect(screen.queryByText("Active this month")).not.toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Questionnaire pending · 0"})).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Paid · 1"}));
    expect(screen.queryByText("Unpaid prospect")).not.toBeInTheDocument();
  });

  it("uses a completed client intake instead of the order's stale Sent status", () => {
    render(<CoachOrdersPage {...baseProps} getOrderClient={()=>({intakeStatus:"Submitted"})} visibleProductOrders={[{recordId:"CC",clientName:"CC",productType:"Online Coaching",paymentStatus:"Paid",intakeStatus:"Sent",assignedCoach:"Kent"}]} />);
    expect(screen.getByRole("button",{name:"Questionnaire pending · 0"})).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("puts cancelled requests in history with no action to mark them paid", () => {
    render(<CoachOrdersPage {...baseProps} visibleProductOrders={[{recordId:"OLD",clientName:"Xiaowei",productType:"Manual Collection",paymentStatus:"Cancelled",amount:"16866"}]} />);
    expect(screen.getByText("Cancelled and archived orders · 1")).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Unarchive"})).not.toBeInTheDocument();
    expect(screen.queryByText("Payments outside the three streams")).not.toBeInTheDocument();
  });

  it("presents the manual order form as a dialog and closes it with Escape", () => {
    const setShowManualOrderForm = vi.fn();
    render(
      <CoachOrdersPage
        {...baseProps}
        manualOrder={{
          clientName: "",
          phone: "",
          productName: "",
          purchasedAt: "2026-07-13",
          amount: "0",
          currency: "CNY",
          paymentProvider: "WeChat QR",
          paymentStatus: "Paid",
          assignedCoach: "",
          paymentReference: "",
          notes: "",
        }}
        setShowManualOrderForm={setShowManualOrderForm}
        showManualOrderForm
      />
    );

    expect(
      screen.getByRole("dialog", { name: "New in-person order" })
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(setShowManualOrderForm).toHaveBeenCalledWith(false);
  });
});
