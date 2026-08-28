import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT, verifyRefreshToken } from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/cookies";
import { fetchActiveUserById, generateAuthTokens, toUserSessionPayload } from "@/lib/auth/common";
import { CookieName } from "@/lib/constants";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CookieName.TOKEN)?.value;

    const payload = token ? await verifyJWT(token) : null;
    if (payload) {
      const userId = parseInt(payload.sub, 10);
      if (!isNaN(userId)) {
        const user = await fetchActiveUserById(userId);
        if (user) {
          return NextResponse.json({ user: toUserSessionPayload(user) });
        }
      }
    }

    // Access token is missing or expired — fallback to refresh_token self-healing
    const refreshToken = cookieStore.get(CookieName.REFRESH_TOKEN)?.value;
    if (refreshToken) {
      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (refreshPayload) {
        const userId = parseInt(refreshPayload.sub, 10);
        if (!isNaN(userId)) {
          const user = await fetchActiveUserById(userId);
          if (user && user.token_version === refreshPayload.token_version) {
            const tokens = await generateAuthTokens(user);
            const response = NextResponse.json({ user: toUserSessionPayload(user) });
            return setAuthCookies(response, tokens);
          }
        }
      }
    }

    return NextResponse.json({ user: null });
  } catch (error) {
    console.error("Auth /me error:", error);
    return NextResponse.json({ user: null });
  }
}
