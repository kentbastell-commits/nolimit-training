import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StorePage from "../../../src/StorePage";

const baseProps: any = {
  clients: [],
  coaches: [],
  programs: [],
  programsLoading: false,
  toasts: [],
  storeReviews: [],
  storeLang: "en",
  setStoreLang: vi.fn(),
  storeStep: 1,
  setStoreStep: vi.fn(),
  requestStoreStep: vi.fn(),
  storeCategoryFilter: "all",
  setStoreCategoryFilter: vi.fn(),
  storeSeasonFilter: "all",
  setStoreSeasonFilter: vi.fn(),
  storeProgramSearch: "",
  setStoreProgramSearch: vi.fn(),
  storeFaqOpen: null,
  setStoreFaqOpen: vi.fn(),
  storeSelectedProgram: null,
  setStoreSelectedProgram: vi.fn(),
  storeSelectedAddonIds: [],
  setStoreSelectedAddonIds: vi.fn(),
  storeLauncherOpen: false,
  setStoreLauncherOpen: vi.fn(),
  storeLauncherClient: null,
  setStoreLauncherClient: vi.fn(),
  storeRegName: "",
  setStoreRegName: vi.fn(),
  storeRegPhone: "",
  setStoreRegPhone: vi.fn(),
  storeRegistering: false,
  storeRegStage: 0,
  storeRegisteredCode: "",
  setStoreRegisteredCode: vi.fn(),
  storeRegisteredOrderId: "",
  setStoreRegisteredOrderId: vi.fn(),
  storePaymentCode: "",
  findPortalOpen: false,
  setFindPortalOpen: vi.fn(),
  findPortalName: "",
  setFindPortalName: vi.fn(),
  findPortalPhone: "",
  setFindPortalPhone: vi.fn(),
  findPortalBusy: false,
  findPortalError: "",
  setFindPortalError: vi.fn(),
  findMyPortal: vi.fn(),
  previewProgram: null,
  setPreviewProgram: vi.fn(),
  previewLoading: false,
  openProgramPreview: vi.fn(),
  registerForProgram: vi.fn(),
  buildGlanceChain: vi.fn(() => []),
  rememberedPortalCode: "",
};

describe("StorePage", () => {
  it("renders the public store shell in English", () => {
    render(<StorePage {...baseProps} />);
    expect(screen.getByText("Find my portal")).toBeInTheDocument();
    // Redesigned nav still exposes the launcher + section links.
    expect(screen.getAllByText("Enter app").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "How it works" })).toBeInTheDocument();
    // The wordmark appears in both the nav and the footer.
    expect(screen.getAllByAltText("No Limit").length).toBeGreaterThan(0);
  });

  it("links straight to the portal when a portal code is remembered", () => {
    render(<StorePage {...baseProps} rememberedPortalCode="CL-0007" />);
    const portalLink = screen.getByText("Open my portal");
    expect(portalLink).toBeInTheDocument();
    expect(portalLink.closest("a")).toHaveAttribute(
      "href",
      "/?portal=client&client=CL-0007"
    );
  });
});
