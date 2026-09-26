import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { DataTableColumnHeader } from "./column-header";

describe("DataTableColumnHeader", () => {
  it("renders plain div when neither sorting nor hiding is supported", () => {
    const mockColumn = {
      getCanSort: () => false,
      getCanHide: () => false,
      getIsSorted: () => false,
      toggleSorting: vi.fn(),
      toggleVisibility: vi.fn(),
    };

    render(<DataTableColumnHeader column={mockColumn as never} title="Actions" />);
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders trigger button with chevrons and allows hiding when column cannot sort but can hide", () => {
    const mockColumn = {
      getCanSort: () => false,
      getCanHide: () => true,
      getIsSorted: () => false,
      toggleSorting: vi.fn(),
      toggleVisibility: vi.fn(),
    };

    render(<DataTableColumnHeader column={mockColumn as never} title="Images" />);
    expect(screen.getByRole("button", { name: /images/i })).toBeInTheDocument();
  });

  it("renders trigger button with sorting support when column can sort", () => {
    const mockColumn = {
      getCanSort: () => true,
      getCanHide: () => true,
      getIsSorted: () => "asc",
      toggleSorting: vi.fn(),
      toggleVisibility: vi.fn(),
    };

    render(<DataTableColumnHeader column={mockColumn as never} title="Vehicle Number" />);
    expect(screen.getByRole("button", { name: /vehicle number/i })).toBeInTheDocument();
  });
});
