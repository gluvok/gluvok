import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import {
  getTokenExpiresIn,
  signJWT,
  signRefreshToken,
  verifyJWT,
  verifyRefreshToken,
} from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/cookies";
import { CookieName, EntityKey, TableName } from "@/lib/constants";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CookieName.TOKEN)?.value;

    const payload = token ? await verifyJWT(token) : null;

    if (payload) {
      const userId = parseInt(payload.sub, 10);
      if (!isNaN(userId)) {
        const { data: user, error } = await db
          .from(TableName.USERS)
          .select("*")
          .eq(EntityKey.ID, userId)
          .is(EntityKey.DELETED_AT, null)
          .maybeSingle();

        if (!error && user) {
          const userPayload = {
            id: user.id,
            username: user.username,
            name: user.name,
            aadhar_number: user.aadhar_number ?? null,
            role: user.role,
            factory_id: user.factory_id,
          };

          return NextResponse.json({ user: userPayload });
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
          const { data: user, error: userError } = await db
            .from(TableName.USERS)
            .select("*")
            .eq(EntityKey.ID, userId)
            .is(EntityKey.DELETED_AT, null)
            .maybeSingle();

          if (!userError && user && user.token_version === refreshPayload.token_version) {
            const factoryId = user.factory_id;

            const newAccessToken = await signJWT({
              sub: String(user.id),
              username: user.username,
              name: user.name,
              role: user.role,
              factory_id: factoryId,
            });
            const accessExpiresIn = getTokenExpiresIn(newAccessToken);

            const newRefreshToken = await signRefreshToken({
              sub: String(user.id),
              token_version: user.token_version,
            });
            const refreshExpiresIn = getTokenExpiresIn(newRefreshToken);

            const userPayload = {
              id: user.id,
              username: user.username,
              name: user.name,
              aadhar_number: user.aadhar_number ?? null,
              role: user.role,
              factory_id: factoryId,
            };

            const response = NextResponse.json({ user: userPayload });
            return setAuthCookies(response, {
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
              accessExpiresIn,
              refreshExpiresIn,
            });
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
