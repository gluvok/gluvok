/**
 * @file app/api/auth/device/login/route.ts
 * @description API route for hardware microcontroller authentication and Bearer token issuance.
 */

import { NextRequest } from "next/server";
import { authenticateDeviceUser } from "@/lib/auth/device";

export async function POST(request: NextRequest) {
  return authenticateDeviceUser(request);
}
