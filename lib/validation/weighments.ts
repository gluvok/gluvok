/**
 * @file lib/validation/weighments.ts
 * @description Zod schema and validation rules for Weighments entities.
 */

import * as z from "zod";
import { WeighmentType } from "@/lib/constants/enums";
import { optionalIntegerIdSchema } from "./helpers";

export const editWeighmentSchema = z.object({
  type: z.enum([WeighmentType.UNASSIGNED, WeighmentType.IN, WeighmentType.OUT]).optional(),
  rate_id: optionalIntegerIdSchema("Rate"),
});
