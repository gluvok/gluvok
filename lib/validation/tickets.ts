/**
 * @file lib/validation/tickets.ts
 * @description Zod validation schemas for Tickets entity.
 */

import * as z from "zod";
import { TicketStatus } from "@/lib/constants/enums";
import { optionalIntegerIdSchema } from "./helpers";

export const ticketStatusSchema = z
  .enum([TicketStatus.PENDING, TicketStatus.APPROVED, TicketStatus.REJECTED])
  .default(TicketStatus.PENDING);

export const createTicketSchema = z
  .object({
    entry_id: optionalIntegerIdSchema("Entry ID").nullable().optional(),
    weighment_id: optionalIntegerIdSchema("Weighment ID").nullable().optional(),
    concern: z
      .string({
        message: "Concern is required",
      })
      .trim()
      .min(5, "Concern must be at least 5 characters")
      .max(1000, "Concern cannot exceed 1000 characters"),
  })
  .refine(
    (data) => {
      const hasEntry = data.entry_id !== null && data.entry_id !== undefined;
      const hasWeighment = data.weighment_id !== null && data.weighment_id !== undefined;
      return (hasEntry && !hasWeighment) || (!hasEntry && hasWeighment);
    },
    {
      message: "A ticket must be linked to either an entry or a weighment, but not both",
      path: ["entry_id"],
    },
  );

export const updateTicketConcernSchema = z.object({
  concern: z
    .string({
      message: "Concern is required",
    })
    .trim()
    .min(5, "Concern must be at least 5 characters")
    .max(1000, "Concern cannot exceed 1000 characters"),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketConcernInput = z.infer<typeof updateTicketConcernSchema>;
