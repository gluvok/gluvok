import { describe, it, expect } from "vitest";
import { FieldRequirementMode, Role } from "@/lib/constants/enums";
import { getDynamicCustomerSchema, getDynamicUserSchema } from "./dynamic";

describe("getDynamicCustomerSchema", () => {
  const mandatoryFactory = {
    id: 1,
    name: "Factory A",
    aadhar_number_mode: FieldRequirementMode.MANDATORY,
    govt_id_mode: FieldRequirementMode.MANDATORY,
    created_at: "",
    updated_at: "",
  };

  const optionalFactory = {
    id: 1,
    name: "Factory A",
    aadhar_number_mode: FieldRequirementMode.MANDATORY,
    govt_id_mode: FieldRequirementMode.OPTIONAL,
    created_at: "",
    updated_at: "",
  };

  const notRequiredFactory = {
    id: 1,
    name: "Factory A",
    aadhar_number_mode: FieldRequirementMode.MANDATORY,
    govt_id_mode: FieldRequirementMode.NOT_REQUIRED,
    created_at: "",
    updated_at: "",
  };

  it("validates mandatory govt_id in create mode", () => {
    const schema = getDynamicCustomerSchema(mandatoryFactory, false);

    // Missing govt_id should fail
    const emptyResult = schema.safeParse({
      name: "Ajay Kumar",
      father_name: "Vijay Kumar",
      govt_id: "",
    });
    expect(emptyResult.success).toBe(false);

    // Valid integer govt_id should pass
    const validResult = schema.safeParse({
      name: "Ajay Kumar",
      father_name: "Vijay Kumar",
      govt_id: "1001",
    });
    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data.govt_id).toBe(1001);
    }
  });

  it("allows optional govt_id to be empty or number", () => {
    const schema = getDynamicCustomerSchema(optionalFactory, false);

    const emptyResult = schema.safeParse({
      name: "Ajay Kumar",
      father_name: "Vijay Kumar",
      govt_id: "",
    });
    expect(emptyResult.success).toBe(true);
    if (emptyResult.success) {
      expect(emptyResult.data.govt_id).toBeNull();
    }

    const validResult = schema.safeParse({
      name: "Ajay Kumar",
      father_name: "Vijay Kumar",
      govt_id: "1001",
    });
    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data.govt_id).toBe(1001);
    }
  });

  it("coerces govt_id to null when NOT_REQUIRED", () => {
    const schema = getDynamicCustomerSchema(notRequiredFactory, false);

    const result = schema.safeParse({
      name: "Ajay Kumar",
      father_name: "Vijay Kumar",
      govt_id: "9999",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.govt_id).toBeNull();
    }
  });

  it("validates optional customer login credentials", () => {
    const schema = getDynamicCustomerSchema(mandatoryFactory, false);

    // Username provided without password should fail
    const noPasswordResult = schema.safeParse({
      name: "Ajay Kumar",
      father_name: "Vijay Kumar",
      govt_id: 101,
      username: "ajay123",
      password: "",
      confirmPassword: "",
    });
    expect(noPasswordResult.success).toBe(false);

    // Passwords mismatch should fail
    const mismatchResult = schema.safeParse({
      name: "Ajay Kumar",
      father_name: "Vijay Kumar",
      govt_id: 101,
      username: "ajay123",
      password: "password123",
      confirmPassword: "differentpassword",
    });
    expect(mismatchResult.success).toBe(false);

    // Valid matching credentials should pass
    const validResult = schema.safeParse({
      name: "Ajay Kumar",
      father_name: "Vijay Kumar",
      govt_id: 101,
      username: "ajay123",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(validResult.success).toBe(true);
  });

  it("allows blank passwords in edit mode", () => {
    const schema = getDynamicCustomerSchema(mandatoryFactory, true);

    const editResult = schema.safeParse({
      name: "Ajay Kumar",
      father_name: "Vijay Kumar",
      govt_id: 101,
      username: "ajay123",
      password: "",
      confirmPassword: "",
    });
    expect(editResult.success).toBe(true);
  });
});

describe("getDynamicUserSchema", () => {
  const mandatoryFactory = {
    id: 1,
    name: "Factory A",
    aadhar_number_mode: FieldRequirementMode.MANDATORY,
    govt_id_mode: FieldRequirementMode.MANDATORY,
    created_at: "",
    updated_at: "",
  };

  it("requires 12-digit aadhar in mandatory mode", () => {
    const schema = getDynamicUserSchema(mandatoryFactory, false);

    const invalidResult = schema.safeParse({
      name: "Ramesh",
      username: "ramesh1",
      role: Role.OPERATOR,
      aadhar_number: "123",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(invalidResult.success).toBe(false);

    const validResult = schema.safeParse({
      name: "Ramesh",
      username: "ramesh1",
      role: Role.OPERATOR,
      aadhar_number: "123456789012",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(validResult.success).toBe(true);
  });
});
