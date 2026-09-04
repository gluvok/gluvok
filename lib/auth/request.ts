/**
 * @file lib/auth/request.ts
 * @description Authentication resolution and token refresh helpers for incoming Next.js requests.
 */

import { NextRequest } from "next/server";
import { verifyJWT, verifyRefreshToken, JWTPayload } from "./jwt";
import { fetchActiveUserById, generateAuthTokens } from "./common";
import { Role } from "@/lib/constants/enums";

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}

export async function getAuthUser(
  req: NextRequest | Request,
): Promise<{ user: JWTPayload; refreshedTokens?: RefreshedTokens } | null> {
  const userId = req.headers.get("x-user-id");
  const username = req.headers.get("x-user-username");
  const rawName = req.headers.get("x-user-name");
  const role = req.headers.get("x-user-role");
  const factoryIdStr = req.headers.get("x-user-factory-id");

  if (userId && username && role && rawName) {
    return {
      user: {
        sub: userId,
        username,
        name: decodeURIComponent(rawName),
        role: role as Role,
        factory_id: factoryIdStr ? parseInt(factoryIdStr, 10) : 1,
        token_version: 1,
      },
    };
  }

  // 1. Try Bearer token from Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const payload = await verifyJWT(token);
    if (payload) {
      return { user: payload };
    }
  }

  // 2. Try Cookies (access token first, then fallback to refresh token)
  let cookieAccessToken: string | undefined;
  let cookieRefreshToken: string | undefined;

  const nextReq = req as NextRequest;
  if (nextReq.cookies && typeof nextReq.cookies.get === "function") {
    cookieAccessToken =
      nextReq.cookies.get("token")?.value || nextReq.cookies.get("accessToken")?.value;
    cookieRefreshToken =
      nextReq.cookies.get("refresh_token")?.value || nextReq.cookies.get("refreshToken")?.value;
  } else {
    const cookieHeader = req.headers.get("cookie") || "";
    const parsedCookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((cookie) => {
      const parts = cookie.trim().split("=");
      if (parts[0]) {
        parsedCookies[parts[0]] = parts.slice(1).join("=");
      }
    });
    cookieAccessToken = parsedCookies["token"] || parsedCookies["accessToken"];
    cookieRefreshToken = parsedCookies["refresh_token"] || parsedCookies["refreshToken"];
  }

  if (cookieAccessToken) {
    const payload = await verifyJWT(cookieAccessToken);
    if (payload) {
      return { user: payload };
    }
  }

  if (cookieRefreshToken) {
    const refreshPayload = await verifyRefreshToken(cookieRefreshToken);
    if (refreshPayload) {
      const user = await fetchActiveUserById(Number(refreshPayload.sub));
      if (user && user.token_version === refreshPayload.token_version) {
        const tokens = await generateAuthTokens(user);
        const newPayload: JWTPayload = {
          sub: String(user.id),
          username: user.username,
          name: user.name,
          role: user.role,
          factory_id: user.factory_id,
          factory_name: user.factories?.name,
          token_version: user.token_version,
        };

        return {
          user: newPayload,
          refreshedTokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            accessExpiresIn: tokens.accessExpiresIn,
            refreshExpiresIn: tokens.refreshExpiresIn,
          },
        };
      }
    }
  }

  return null;
}
