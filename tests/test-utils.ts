/**
 * @file tests/test-utils.ts
 * @description Central testing utilities and fixture exports.
 */

export * from "./mocks/supabase";

/**
 * Helper to build mock Next.js / Web Request objects with JSON bodies and query parameters.
 */
export function createMockJsonRequest(
  url: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" = "GET",
  body?: unknown,
  headers?: Record<string, string>,
): Request {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body !== undefined && method !== "GET") {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new Request(url, init);
}
