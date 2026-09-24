import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EntryApproveDialog, EntryRejectDialog } from "./entry-status-dialogs";

describe("EntryApproveDialog", () => {
  it("renders idle state with check icon and enabled buttons", () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <EntryApproveDialog
        open={true}
        onOpenChange={onOpenChange}
        itemId="101"
        vehicleNumber="MH12AB1234"
        loading={false}
        onConfirm={onConfirm}
      />,
    );

    const confirmBtn = screen.getByRole("button", { name: /approve/i });
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });

    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).not.toBeDisabled();
    expect(cancelBtn).not.toBeDisabled();

    const spinIcon = confirmBtn.querySelector(".animate-spin");
    expect(spinIcon).toBeNull();

    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders loading state with spinning loader and disabled buttons", () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <EntryApproveDialog
        open={true}
        onOpenChange={onOpenChange}
        itemId="101"
        vehicleNumber="MH12AB1234"
        loading={true}
        onConfirm={onConfirm}
      />,
    );

    const confirmBtn = screen.getByRole("button", { name: /approve/i });
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });

    expect(confirmBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();

    const spinIcon = confirmBtn.querySelector(".animate-spin");
    expect(spinIcon).not.toBeNull();
  });
});

describe("EntryRejectDialog", () => {
  it("renders idle state with reject icon and enabled buttons", () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <EntryRejectDialog
        open={true}
        onOpenChange={onOpenChange}
        itemId="102"
        vehicleNumber="MH12AB1234"
        loading={false}
        onConfirm={onConfirm}
      />,
    );

    const confirmBtn = screen.getByRole("button", { name: /reject/i });
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });

    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).not.toBeDisabled();
    expect(cancelBtn).not.toBeDisabled();

    const spinIcon = confirmBtn.querySelector(".animate-spin");
    expect(spinIcon).toBeNull();

    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders loading state with spinning loader and disabled buttons", () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <EntryRejectDialog
        open={true}
        onOpenChange={onOpenChange}
        itemId="102"
        vehicleNumber="MH12AB1234"
        loading={true}
        onConfirm={onConfirm}
      />,
    );

    const confirmBtn = screen.getByRole("button", { name: /reject/i });
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });

    expect(confirmBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();

    const spinIcon = confirmBtn.querySelector(".animate-spin");
    expect(spinIcon).not.toBeNull();
  });
});
