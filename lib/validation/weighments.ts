/**
 * @file lib/validation/weighments.ts
 * @description Zod schema and validation rules for Weighments entities.
 */

import * as z from "zod"
import { ColumnLabel, Unit, WeighmentType } from "@/lib/constants/enums"
import { EntityKey } from "@/lib/constants/enums"
import { integerIdSchema } from "./helpers"

// Indian State & Union Territory codes (mirrors constants.py STATE_CODES, excluding BH which is handled separately)
const STATE_CODES = [
  'AN','AP','AR','AS','BR','CH','CG','DD','DL','DN','GA','GJ','HR','HP',
  'JK','JH','KA','KL','LA','LD','MP','MH','MN','ML','MZ','NL','OD','OR',
  'PB','PY','RJ','SK','TN','TS','TR','UP','UA','UK','WB'
]

// Mirrors INDIAN_PLATE_REGEX in constants.py.
// Standard: State(2L) + RTO(1-2 alphanum) + Series(1-3L) + Serial(3-4 digits), optional [\s.-] separators
// BH series: 2-digit year + BH + 4-digit serial + 1-2 letter class, optional [\s.-] separators
const INDIAN_PLATE_REGEX =
  /^(?:([A-Z]{2})[\s.-]?([A-Z0-9]{1,2})[\s.-]?([A-Za-z]{1,3})[\s.-]?(\d{3,4})|(\d{2})[\s.-]?(BH)[\s.-]?(\d{4})[\s.-]?([A-Za-z]{1,2}))$/i

export const addWeighmentSchema = z.object({
  [EntityKey.VEHICLE_NUMBER]: z
    .string()
    .min(1, `${ColumnLabel.VEHICLE_NUMBER} plate number is required`)
    .max(15, `${ColumnLabel.VEHICLE_NUMBER} plate must be 15 characters or less`)
    .regex(
      INDIAN_PLATE_REGEX,
      `Must match standard Indian plate (e.g. MH04BG6491, PB10XY1234) or BH series (e.g. 22BH1234AA)`
    )
    .refine(
      (val) => {
        // BH series plates start with 2 digits followed by BH — no state code check needed
        if (/^\d{2}[\s.-]?BH/i.test(val)) return true
        return STATE_CODES.includes(val.substring(0, 2).toUpperCase())
      },
      {
        message: `First two characters must be a valid Indian state or union territory code`
      }
    ),
  [EntityKey.WEIGHT]: z.coerce.number({ message: `${ColumnLabel.WEIGHT} must be a number` }).positive(`Measured ${ColumnLabel.WEIGHT.toLowerCase()} must be a positive number`),
  [EntityKey.UNIT]: z.enum(Unit, { message: `${ColumnLabel.UNIT} must be a valid unit (kg, q, or gal)` }),
  [EntityKey.TYPE]: z.enum(WeighmentType, { message: `${ColumnLabel.TYPE} must be a valid type (in or out)` }),
  [EntityKey.RATE_ID]: integerIdSchema(ColumnLabel.RATE),
  [EntityKey.CENTER_ID]: integerIdSchema(ColumnLabel.CENTER),
  [EntityKey.PROFILE_ID]: integerIdSchema(ColumnLabel.PROFILE),
  [EntityKey.CUSTOMER_ID]: integerIdSchema(ColumnLabel.CUSTOMER),
  [EntityKey.IS_ACTIVE]: z.boolean().default(true),
  [EntityKey.IMAGES]: z.array(z.string()).optional(),
})

export const editWeighmentSchema = addWeighmentSchema

