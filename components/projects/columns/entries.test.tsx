import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { getEntriesColumns } from "./entries";

describe("Entries columns definitions", () => {
  const columns = getEntriesColumns();

  it("defines user_id and user_name columns", () => {
    const userCol = columns.find((c) => c.id === "user_id");
    const userNameCol = columns.find((c) => c.id === "user_name");

    expect(userCol).toBeDefined();
    expect(userNameCol).toBeDefined();
  });

  describe("user_id column accessorFn", () => {
    const userCol = columns.find((c) => c.id === "user_id") as {
      accessorFn?: (row: unknown) => string;
    };

    it("extracts user_id directly when present", () => {
      expect(userCol.accessorFn).toBeDefined();
      const val = userCol.accessorFn?.({ user_id: 42, created_by: 10 });
      expect(val).toBe("42");
    });

    it("falls back to created_by when user_id is missing", () => {
      const val = userCol.accessorFn?.({ created_by: 10 });
      expect(val).toBe("10");
    });

    it("returns empty string when neither user_id nor created_by is provided", () => {
      const val = userCol.accessorFn?.({});
      expect(val).toBe("");
    });
  });

  describe("user_name column cell", () => {
    const userNameCol = columns.find((c) => c.id === "user_name") as {
      cell?: (props: { row: { original: unknown } }) => React.ReactNode;
    };

    it("renders user_name when present", () => {
      const { container } = render(
        userNameCol.cell?.({ row: { original: { user_name: "Alice" } } }) as React.ReactElement,
      );
      expect(container.textContent).toBe("Alice");
    });

    it("renders users.name fallback when user_name is missing", () => {
      const { container } = render(
        userNameCol.cell?.({
          row: { original: { users: { name: "Bob" } } },
        }) as React.ReactElement,
      );
      expect(container.textContent).toBe("Bob");
    });

    it("renders 'System' when auto_approved is true without user name", () => {
      const { container } = render(
        userNameCol.cell?.({
          row: { original: { auto_approved: true } },
        }) as React.ReactElement,
      );
      expect(container.textContent).toBe("System");
    });

    it("renders '—' when no user name and not auto_approved", () => {
      const { container } = render(
        userNameCol.cell?.({ row: { original: {} } }) as React.ReactElement,
      );
      expect(container.textContent).toBe("—");
    });
  });
});
