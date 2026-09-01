/**
 * @file app/api/auth/login/route.ts
 * @description API route for unified authentication (browser sessions and hardware Bearer tokens).
 */

import { NextRequest } from "next/server";
import { authenticateUser } from "@/lib/auth/login";

export async function POST(request: NextRequest) {
  return authenticateUser(request);
}
