import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession, refreshSessionExpiry } from "@/lib/auth/session";
import { fetchActiveUserById, toUserSessionPayload } from "@/lib/auth/common";
import { clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value || cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const sessionUser = await validateSession(token);
    if (!sessionUser) {
      const response = NextResponse.json({ user: null });
      clearAuthCookies(response);
      return response;
    }

    const userId = parseInt(sessionUser.sub, 10);
    if (isNaN(userId)) {
      const response = NextResponse.json({ user: null });
      clearAuthCookies(response);
      return response;
    }

    const user = await fetchActiveUserById(userId);
    if (!user) {
      const response = NextResponse.json({ user: null });
      clearAuthCookies(response);
      return response;
    }

    const response = NextResponse.json({ user: toUserSessionPayload(user) });
    await refreshSessionExpiry(token);
    return setAuthCookies(response, token);
  } catch (error) {
    console.error("Auth /me error:", error);
    return NextResponse.json({ user: null });
  }
}
