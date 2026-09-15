import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth/session";
import { fetchActiveUserById, toUserSessionPayload } from "@/lib/auth/common";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value || cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const sessionUser = await validateSession(token);
    if (!sessionUser) {
      return NextResponse.json({ user: null });
    }

    const userId = parseInt(sessionUser.sub, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ user: null });
    }

    const user = await fetchActiveUserById(userId);
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: toUserSessionPayload(user) });
  } catch (error) {
    console.error("Auth /me error:", error);
    return NextResponse.json({ user: null });
  }
}
