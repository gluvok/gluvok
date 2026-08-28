/**
 * @file app/api/auth/login/route.ts
 * @description API route for browser authentication and cookie session initialization.
 */

import { NextRequest } from "next/server";
import { authenticateBrowserUser } from "@/lib/auth/browser";

export async function POST(request: NextRequest) {
  return authenticateBrowserUser(request);
}
