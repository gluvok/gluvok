import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsView } from "./settings-view";
import { Role, ProjectSlug } from "@/lib/constants/enums";

const mockUseAuthStore = vi.fn();
const mockFetchEntityListFromApi = vi.fn();
const mockUpdateRow = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("@/lib/store", () => ({
  useAuthStore: (selector: (state: { user: { role: Role; factory_id: number } }) => unknown) =>
    mockUseAuthStore(selector),
}));

vi.mock("@/lib/services/common", () => ({
  fetchEntityListFromApi: (...args: unknown[]) => mockFetchEntityListFromApi(...args),
  updateRow: (...args: unknown[]) => mockUpdateRow(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe("SettingsView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const factoryData = {
    id: 1,
    name: "Acme Sugar Mill",
    check_center_on_merge: false,
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-02T12:00:00.000Z",
  };

  it("loads and displays factory settings for Admin with editable fields", async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ user: { role: Role.ADMIN, factory_id: 1 } }),
    );
    mockFetchEntityListFromApi.mockResolvedValue([factoryData]);

    render(<SettingsView desc="Manage factory settings" />);

    expect(screen.getByText("Loading factory settings...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Acme Sugar Mill")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("Acme Sugar Mill");
    expect(nameInput).not.toBeDisabled();

    const switchEl = screen.getByRole("switch");
    expect(switchEl).not.toBeDisabled();
    expect(switchEl).toHaveAttribute("aria-checked", "false");

    // Save button should initially be disabled (no unsaved changes)
    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    expect(saveBtn).toBeDisabled();

    // Verify Factory ID is NOT rendered anywhere
    expect(screen.queryByText(/factory id:/i)).not.toBeInTheDocument();
  });

  it("renders view-only fields for non-admin Manager role", async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ user: { role: Role.MANAGER, factory_id: 1 } }),
    );
    mockFetchEntityListFromApi.mockResolvedValue([factoryData]);

    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Acme Sugar Mill")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("Acme Sugar Mill");
    expect(nameInput).toBeDisabled();

    const switchEl = screen.getByRole("switch");
    expect(switchEl).toBeDisabled();

    expect(screen.getByText(/view-only mode/i)).toBeInTheDocument();
  });

  it("allows Admin to edit name and save changes", async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ user: { role: Role.ADMIN, factory_id: 1 } }),
    );
    mockFetchEntityListFromApi.mockResolvedValue([factoryData]);
    mockUpdateRow.mockResolvedValue({
      ...factoryData,
      name: "Renamed Sugar Mill",
    });

    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Acme Sugar Mill")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("Acme Sugar Mill");
    fireEvent.change(nameInput, { target: { value: "Renamed Sugar Mill" } });

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateRow).toHaveBeenCalledWith(ProjectSlug.SETTINGS, 1, {
        name: "Renamed Sugar Mill",
        check_center_on_merge: false,
      });
      expect(mockToastSuccess).toHaveBeenCalledWith("Factory settings updated successfully.");
    });
  });

  it("allows Admin to reset modified fields back to original factory values", async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ user: { role: Role.ADMIN, factory_id: 1 } }),
    );
    mockFetchEntityListFromApi.mockResolvedValue([factoryData]);

    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Acme Sugar Mill")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("Acme Sugar Mill");
    fireEvent.change(nameInput, { target: { value: "Temporary Edit" } });

    const resetBtn = screen.getByRole("button", { name: /reset/i });
    expect(resetBtn).not.toBeDisabled();

    fireEvent.click(resetBtn);

    expect(screen.getByDisplayValue("Acme Sugar Mill")).toBeInTheDocument();
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });
});
