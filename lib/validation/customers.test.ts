import { describe, expect, it } from "vitest";
import { addCustomerSchema, editCustomerSchema } from "./customers";

describe("customers validation", () => {
  describe("addCustomerSchema", () => {
    it("parses customer without login account credentials", () => {
      const result = addCustomerSchema.parse({
        name: "Ramesh Patel",
        father_name: "Suresh Patel",
      });

      expect(result.name).toBe("Ramesh Patel");
      expect(result.father_name).toBe("Suresh Patel");
    });

    it("parses customer with valid user credentials and matching passwords", () => {
      const result = addCustomerSchema.parse({
        name: "Ramesh Patel",
        father_name: "Suresh Patel",
        username: "ramesh_patel",
        password: "secretpassword123",
        confirmPassword: "secretpassword123",
      });

      expect(result.username).toBe("ramesh_patel");
      expect(result.password).toBe("secretpassword123");
    });

    it("rejects username when password is missing", () => {
      expect(() =>
        addCustomerSchema.parse({
          name: "Ramesh Patel",
          father_name: "Suresh Patel",
          username: "ramesh_patel",
        }),
      ).toThrow("Password is required when providing a username");
    });

    it("rejects password when username is missing", () => {
      expect(() =>
        addCustomerSchema.parse({
          name: "Ramesh Patel",
          father_name: "Suresh Patel",
          password: "secretpassword123",
          confirmPassword: "secretpassword123",
        }),
      ).toThrow("Username is required when providing a password");
    });

    it("rejects passwords shorter than 6 characters", () => {
      expect(() =>
        addCustomerSchema.parse({
          name: "Ramesh Patel",
          father_name: "Suresh Patel",
          username: "ramesh_patel",
          password: "123",
          confirmPassword: "123",
        }),
      ).toThrow("Password must be at least 6 characters");
    });

    it("rejects mismatched confirmPassword", () => {
      expect(() =>
        addCustomerSchema.parse({
          name: "Ramesh Patel",
          father_name: "Suresh Patel",
          username: "ramesh_patel",
          password: "secretpassword123",
          confirmPassword: "differentpassword",
        }),
      ).toThrow("Passwords do not match");
    });

    it("rejects missing or empty name and father_name", () => {
      expect(() =>
        addCustomerSchema.parse({
          name: "",
          father_name: "Suresh Patel",
        }),
      ).toThrow("Name is required");

      expect(() =>
        addCustomerSchema.parse({
          name: "Ramesh Patel",
          father_name: "",
        }),
      ).toThrow("Father's name is required");

      expect(() =>
        addCustomerSchema.parse({
          father_name: "Suresh Patel",
        }),
      ).toThrow();

      expect(() =>
        addCustomerSchema.parse({
          name: "Ramesh Patel",
        }),
      ).toThrow();
    });
  });

  describe("editCustomerSchema", () => {
    it("allows updating name or father_name only", () => {
      const result = editCustomerSchema.parse({
        name: "Updated Name",
      });
      expect(result.name).toBe("Updated Name");
      expect(result.father_name).toBeUndefined();
    });

    it("allows updating password with valid confirmation", () => {
      const result = editCustomerSchema.parse({
        password: "newsecretpassword",
        confirmPassword: "newsecretpassword",
      });
      expect(result.password).toBe("newsecretpassword");
    });

    it("rejects updating password with mismatched confirmation", () => {
      expect(() =>
        editCustomerSchema.parse({
          password: "newsecretpassword",
          confirmPassword: "mismatchpassword",
        }),
      ).toThrow("Passwords do not match");
    });

    it("rejects short password in edit schema", () => {
      expect(() =>
        editCustomerSchema.parse({
          password: "abc",
          confirmPassword: "abc",
        }),
      ).toThrow("Password must be at least 6 characters");
    });
  });
});
