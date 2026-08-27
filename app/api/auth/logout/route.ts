/**
 * @file app/api/auth/logout/route.ts
 * @description API route to clear authentication JWT cookie and sign out.
 */

import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/cookies";

export async function POST() {
  return clearAuthCookies(NextResponse.json({ success: true }));
}
