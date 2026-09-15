/**
 * @file lib/auth/request.ts
 * @description Authentication resolution helpers for incoming Next.js requests.
 */

import { NextRequest } from "next/server";
import { validateSession } from "./session";
import { Role } from "@/lib/constants/enums";
import { AuthUserPayload } from "@/types";

export async function getAuthUser(
  req: NextRequest | Request,
): Promise<{ user: AuthUserPayload } | null> {
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
      },
    };
  }

  // 1. Try Bearer token from Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    const sessionUser = await validateSession(rawToken);
    if (sessionUser) {
      return { user: sessionUser };
    }
  }

  // 2. Try Cookies (session_token or legacy token)
  let cookieSessionToken: string | undefined;

  const nextReq = req as NextRequest;
  if (nextReq.cookies && typeof nextReq.cookies.get === "function") {
    cookieSessionToken =
      nextReq.cookies.get("session_token")?.value || nextReq.cookies.get("token")?.value;
  } else {
    const cookieHeader = req.headers.get("cookie") || "";
    const parsedCookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((cookie) => {
      const parts = cookie.trim().split("=");
      if (parts[0]) {
        parsedCookies[parts[0]] = parts.slice(1).join("=");
      }
    });
    cookieSessionToken = parsedCookies["session_token"] || parsedCookies["token"];
  }

  if (cookieSessionToken) {
    const sessionUser = await validateSession(cookieSessionToken);
    if (sessionUser) {
      return { user: sessionUser };
    }
  }

  return null;
}
