import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { deleteSession } from "@/lib/auth/session";

export async function POST(req?: NextRequest) {
  const token =
    req?.cookies.get("session_token")?.value ||
    req?.cookies.get("token")?.value ||
    req?.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];

  if (token) {
    try {
      await deleteSession(token);
    } catch (e) {
      console.error("Failed to delete session on logout:", e);
    }
  }

  return clearAuthCookies(NextResponse.json({ success: true }));
}
