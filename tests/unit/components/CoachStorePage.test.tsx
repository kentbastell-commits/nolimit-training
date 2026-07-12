import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CoachStorePage from "../../../src/CoachStorePage";

const baseProps = {
  programs: [],
  existingStoreCategories: ["Climbing"],
  createStoreProduct: vi.fn().mockResolvedValue(true),
  setProductLive: vi.fn().mockResolvedValue(undefined),
  saveProduct: vi.fn().mockResolvedValue(undefined),
  onEditProduct: vi.fn(),
  onNewProgram: vi.fn(),
  notify: vi.fn(),
};

const product = {
  recordId: "rec-program-1",
  programId: "PROGRAM-1",
  programName: "Climbing Power",
  productType: "Digital Program",
  publicStoreVisible: true,
  price: "399",
  currency: "CNY",
  durationWeeks: "6",
  sessionsPerWeek: "3",
} as any;

describe("CoachStorePage", () => {
  it("presents the create flow as a dialog and closes it with Escape", async () => {
    render(<CoachStorePage {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "New product" }));

    expect(
      screen.getByRole("dialog", { name: "Choose store product type" })
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Choose store product type" })
      ).not.toBeInTheDocument()
    );
  });

  it("exposes live state as a labelled switch", () => {
    const setProductLive = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachStorePage
        {...baseProps}
        programs={[product]}
        setProductLive={setProductLive}
      />
    );

    const liveSwitch = screen.getByRole("switch", {
      name: "Hide Climbing Power on the store",
    });
    expect(liveSwitch).toHaveAttribute("aria-checked", "true");
    fireEvent.click(liveSwitch);
    expect(setProductLive).toHaveBeenCalledWith(product, false);
  });

  it("labels product settings as a dialog and closes it with Escape", async () => {
    render(<CoachStorePage {...baseProps} programs={[product]} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(
      screen.getByRole("dialog", {
        name: "Product settings for Climbing Power",
      })
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Product settings for Climbing Power",
        })
      ).not.toBeInTheDocument()
    );
  });
});
