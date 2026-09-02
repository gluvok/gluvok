import { describe, expect, it } from "vitest";
import { createTicketSchema, updateTicketConcernSchema, ticketStatusSchema } from "./tickets";
import { TicketStatus } from "@/lib/constants/enums";

describe("tickets validation", () => {
  describe("createTicketSchema", () => {
    it("accepts valid ticket linked to an entry", () => {
      const result = createTicketSchema.parse({
        entry_id: 42,
        concern: "Weight measurement seems lower than expected for truck",
      });
      expect(result.entry_id).toBe(42);
      expect(result.weighment_id).toBeUndefined();
      expect(result.concern).toBe("Weight measurement seems lower than expected for truck");
    });

    it("accepts valid ticket linked to a weighment", () => {
      const result = createTicketSchema.parse({
        weighment_id: 15,
        concern: "Discrepancy in gross weight between slip and register",
      });
      expect(result.weighment_id).toBe(15);
      expect(result.entry_id).toBeUndefined();
      expect(result.concern).toBe("Discrepancy in gross weight between slip and register");
    });

    it("rejects when neither entry_id nor weighment_id is provided", () => {
      expect(() =>
        createTicketSchema.parse({
          concern: "No linked record provided here",
        }),
      ).toThrow("A ticket must be linked to either an entry or a weighment, but not both");
    });

    it("rejects when both entry_id and weighment_id are provided", () => {
      expect(() =>
        createTicketSchema.parse({
          entry_id: 10,
          weighment_id: 20,
          concern: "Both linked records provided here",
        }),
      ).toThrow("A ticket must be linked to either an entry or a weighment, but not both");
    });

    it("rejects concern shorter than 5 characters", () => {
      expect(() =>
        createTicketSchema.parse({
          entry_id: 10,
          concern: "bad",
        }),
      ).toThrow("Concern must be at least 5 characters");
    });
  });

  describe("updateTicketConcernSchema", () => {
    it("accepts valid concern update", () => {
      const result = updateTicketConcernSchema.parse({
        concern: "Updated explanation of the weight issue on scale",
      });
      expect(result.concern).toBe("Updated explanation of the weight issue on scale");
    });

    it("rejects empty concern", () => {
      expect(() =>
        updateTicketConcernSchema.parse({
          concern: "",
        }),
      ).toThrow();
    });
  });

  describe("ticketStatusSchema", () => {
    it("defaults to PENDING", () => {
      expect(ticketStatusSchema.parse(undefined)).toBe(TicketStatus.PENDING);
    });

    it("accepts APPROVED and REJECTED", () => {
      expect(ticketStatusSchema.parse(TicketStatus.APPROVED)).toBe(TicketStatus.APPROVED);
      expect(ticketStatusSchema.parse(TicketStatus.REJECTED)).toBe(TicketStatus.REJECTED);
    });
  });
});
