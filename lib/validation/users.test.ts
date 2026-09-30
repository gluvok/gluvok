import { describe, expect, it } from "vitest";
import { Role } from "@/lib/constants/enums";
import { addUserSchema, editUserSchema, accountSchema } from "./users";

describe("users validation", () => {
  describe("addUserSchema", () => {
    it("parses valid user with manageable role", () => {
      const result = addUserSchema.parse({
        name: "Operator One",
        username: "operator_1",
        password: "securepassword",
        confirmPassword: "securepassword",
        role: Role.OPERATOR,
      });

      expect(result.name).toBe("Operator One");
      expect(result.username).toBe("operator_1");
      expect(result.role).toBe(Role.OPERATOR);
    });

    it("allows all manageable roles (admin, manager, operator, base)", () => {
      for (const role of [Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.BASE]) {
        const result = addUserSchema.parse({
          name: "User Name",
          username: "valid_user",
          password: "password123",
          confirmPassword: "password123",
          role,
        });
        expect(result.role).toBe(role);
      }
    });

    it("rejects invalid role for manual account creation", () => {
      expect(() =>
        addUserSchema.parse({
          name: "Hardware Device",
          username: "device_01",
          password: "password123",
          confirmPassword: "password123",
          role: "hardware" as unknown as Role,
        }),
      ).toThrow("Invalid role selected.");
    });

    it("rejects short username or invalid characters", () => {
      expect(() =>
        addUserSchema.parse({
          name: "User Name",
          username: "ab",
          password: "password123",
          confirmPassword: "password123",
          role: Role.OPERATOR,
        }),
      ).toThrow("Username must be at least 3 characters");

      expect(() =>
        addUserSchema.parse({
          name: "User Name",
          username: "user@invalid!",
          password: "password123",
          confirmPassword: "password123",
          role: Role.OPERATOR,
        }),
      ).toThrow("Username can only contain alphanumeric characters and underscores");
    });

    it("rejects password shorter than 6 characters", () => {
      expect(() =>
        addUserSchema.parse({
          name: "User Name",
          username: "valid_user",
          password: "123",
          confirmPassword: "123",
          role: Role.OPERATOR,
        }),
      ).toThrow("Password must be at least 6 characters");
    });

    it("rejects mismatched passwords", () => {
      expect(() =>
        addUserSchema.parse({
          name: "User Name",
          username: "valid_user",
          password: "password123",
          confirmPassword: "wrongpassword",
          role: Role.OPERATOR,
        }),
      ).toThrow("Passwords do not match");
    });
  });

  describe("editUserSchema", () => {
    it("allows updating name or role only", () => {
      const result = editUserSchema.parse({
        name: "New Name",
        role: Role.MANAGER,
      });

      expect(result.name).toBe("New Name");
      expect(result.role).toBe(Role.MANAGER);
    });

    it("allows password update with matching confirmation", () => {
      const result = editUserSchema.parse({
        password: "newpassword123",
        confirmPassword: "newpassword123",
      });

      expect(result.password).toBe("newpassword123");
    });

    it("rejects password update with mismatched confirmation", () => {
      expect(() =>
        editUserSchema.parse({
          password: "newpassword123",
          confirmPassword: "wrongpassword",
        }),
      ).toThrow("Passwords do not match");
    });
  });

  describe("accountSchema", () => {
    it("parses valid account input without password", () => {
      const result = accountSchema.parse({
        name: "Test User",
        username: "test_user_1",
      });

      expect(result.name).toBe("Test User");
      expect(result.username).toBe("test_user_1");
      expect(result.password).toBeUndefined();
    });

    it("parses valid account input with matching password", () => {
      const result = accountSchema.parse({
        name: "Test User",
        username: "test_user_1",
        password: "newpassword123",
        confirmPassword: "newpassword123",
      });

      expect(result.password).toBe("newpassword123");
    });

    it("allows empty string password", () => {
      const result = accountSchema.parse({
        name: "Test User",
        username: "test_user_1",
        password: "",
        confirmPassword: "",
      });

      expect(result.password).toBe("");
    });

    it("rejects missing or empty name", () => {
      expect(() =>
        accountSchema.parse({
          name: "",
          username: "test_user",
        }),
      ).toThrow("Name is required");
    });

    it("rejects username with invalid characters or under 3 characters", () => {
      expect(() =>
        accountSchema.parse({
          name: "Test User",
          username: "ab",
        }),
      ).toThrow("Username must be at least 3 characters");

      expect(() =>
        accountSchema.parse({
          name: "Test User",
          username: "test-user!",
        }),
      ).toThrow("Username can only contain alphanumeric characters and underscores");
    });

    it("rejects password under 6 characters", () => {
      expect(() =>
        accountSchema.parse({
          name: "Test User",
          username: "test_user",
          password: "123",
          confirmPassword: "123",
        }),
      ).toThrow("Password must be at least 6 characters");
    });

    it("rejects mismatched passwords", () => {
      expect(() =>
        accountSchema.parse({
          name: "Test User",
          username: "test_user",
          password: "newpassword123",
          confirmPassword: "differentpassword",
        }),
      ).toThrow("Passwords do not match");
    });
  });
});
