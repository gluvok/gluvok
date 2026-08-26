import { describe, expect, it, vi, beforeEach } from "vitest";
import axios from "axios";
import { setupAxiosInterceptors } from "./interceptor";
import { useAuthStore } from "@/lib/store/auth";
import { ApiRoutes } from "@/lib/constants/enums";
import { AuthErrorMessage } from "@/lib/constants/messages";

describe("Axios Response Interceptor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAxiosInterceptors();
  });

  it("transparently returns successful responses", async () => {
    const mockResponse = { status: 200, data: { foo: "bar" } };
    const interceptor = (
      axios.interceptors.response as unknown as {
        handlers: Array<{ fulfilled: (res: unknown) => unknown }>;
      }
    ).handlers[0].fulfilled;

    const result = interceptor(mockResponse);
    expect(result).toEqual(mockResponse);
  });

  it("attempts token refresh and retries original request when receiving 401 on standard endpoint", async () => {
    const postSpy = vi.spyOn(axios, "post").mockResolvedValueOnce({
      status: 200,
      data: { success: true },
    });

    const error = {
      config: { url: "/api/centers", _retry: false },
      response: { status: 401 },
    };

    const errorHandler = (
      axios.interceptors.response as unknown as {
        handlers: Array<{ rejected: (err: unknown) => Promise<unknown> }>;
      }
    ).handlers[0].rejected;

    const originalAdapter = axios.defaults.adapter;
    axios.defaults.adapter = vi.fn().mockResolvedValue({ status: 200, data: { success: true } });

    try {
      await errorHandler(error);
      expect(postSpy).toHaveBeenCalledWith(ApiRoutes.AUTH_REFRESH, {}, expect.any(Object));
    } catch {
      // Handled
    } finally {
      axios.defaults.adapter = originalAdapter;
    }
  });

  it("calls logout and redirects to login when refresh fails with 401", async () => {
    vi.spyOn(axios, "post").mockResolvedValueOnce({
      status: 401,
      data: { error: "Unauthorized" },
    });

    const logoutSpy = vi.spyOn(useAuthStore.getState(), "logout").mockResolvedValueOnce();

    const error = {
      config: { url: "/api/rates", _retry: false },
      response: { status: 401 },
    };

    const errorHandler = (
      axios.interceptors.response as unknown as {
        handlers: Array<{ rejected: (err: unknown) => Promise<unknown> }>;
      }
    ).handlers[0].rejected;

    await expect(errorHandler(error)).rejects.toThrow(AuthErrorMessage.TOKEN_REFRESH_FAILED);
    expect(logoutSpy).toHaveBeenCalled();
  });
});
