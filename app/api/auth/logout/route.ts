/**
 * @file app/api/auth/logout/route.ts
 * @description API route to clear authentication JWT cookie and sign out.
 */

import { NextResponse } from "next/server"
import { CookieName } from "@/lib/constants/enums";

export async function POST() {
  const response = NextResponse.json({ success: true })

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(0),
  }

  response.cookies.set(CookieName.TOKEN, "", cookieOptions);
  response.cookies.set(CookieName.AUTH_TOKEN, "", cookieOptions);
  return response
}
