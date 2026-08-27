import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "./auth";
import { Role } from "@/lib/constants/enums";
import { AuthErrorMessage } from "@/lib/constants";
import { toast } from "sonner";
import axios from "axios";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}));

// Mock axios
vi.mock("axios");

describe("Auth Store (Zustand with custom JWT API via Axios)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.get).mockResolvedValue({
      data: { commodities: [], centers: [], users: [], customers: [], rates: [] },
    });
    useAuthStore.setState({
      user: null,
      hydrated: false,
      initialized: false,
      userLoading: false,
    });
  });

  describe("initAuth", () => {
    it("should fetch /api/auth/me and set user state on success", async () => {
      const mockUser = {
        id: "user-123",
        username: "adminuser",
        role: Role.ADMIN,
        factory_id: 1,
      };

      vi.mocked(axios.get).mockResolvedValueOnce({
        data: { user: mockUser },
      });

      const unsubscribe = useAuthStore.getState().initAuth();
      await new Promise(process.nextTick);

      expect(axios.get).toHaveBeenCalledWith("/api/auth/me", expect.any(Object));
      expect(useAuthStore.getState().initialized).toBe(true);
      expect(useAuthStore.getState().user?.username).toBe("adminuser");
      expect(unsubscribe).toBeDefined();
    });

    it("should set user to null if /api/auth/me fails", async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error("Unauthorized"));

      useAuthStore.getState().initAuth();
      await new Promise(process.nextTick);

      expect(useAuthStore.getState().initialized).toBe(true);
      expect(useAuthStore.getState().user).toBeNull();
    });

    it("should do nothing if already initialized", () => {
      useAuthStore.setState({ initialized: true });
      const unsubscribe = useAuthStore.getState().initAuth();
      expect(axios.get).not.toHaveBeenCalled();
      unsubscribe();
    });
  });

  describe("login", () => {
    it("should call /api/auth/login with username & password and welcome by name", async () => {
      const mockUser = {
        id: "user-456",
        username: "admin",
        name: "Admin Person",
        role: Role.ADMIN,
        factory_id: 2,
      };

      vi.mocked(axios.post).mockResolvedValueOnce({
        status: 200,
        data: { success: true, user: mockUser },
      });

      const success = await useAuthStore.getState().login("admin", "secretpass");

      expect(success).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        "/api/auth/login",
        { username: "admin", password: "secretpass" },
        expect.any(Object),
      );
      expect(useAuthStore.getState().user?.username).toBe("admin");
      expect(toast.success).toHaveBeenCalledWith("Welcome back, Admin Person! 🎉");
    });

    it("should fallback to username when name is absent on login", async () => {
      const mockUser = {
        id: "user-789",
        username: "onlyusername",
        role: Role.OPERATOR,
        factory_id: 2,
      };

      vi.mocked(axios.post).mockResolvedValueOnce({
        status: 200,
        data: { success: true, user: mockUser },
      });

      const success = await useAuthStore.getState().login("onlyusername", "secretpass");

      expect(success).toBe(true);
      expect(toast.success).toHaveBeenCalledWith("Welcome back, onlyusername! 🎉");
    });

    it("should toast error and return false on invalid credentials", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        status: 401,
        data: { error: AuthErrorMessage.INVALID_CREDENTIALS },
      });

      const success = await useAuthStore.getState().login("wronguser", "badpass");

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(AuthErrorMessage.INVALID_CREDENTIALS);
      expect(useAuthStore.getState().user).toBeNull();
    });

    it("should toast server error message and return false on 500 internal server error", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        status: 500,
        data: { error: AuthErrorMessage.INTERNAL_SERVER_ERROR },
      });

      const success = await useAuthStore.getState().login("admin", "pass");

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(AuthErrorMessage.INTERNAL_SERVER_ERROR);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe("logout", () => {
    it("should call /api/auth/logout and say goodbye by user name", async () => {
      useAuthStore.setState({
        user: {
          id: "u1",
          username: "u1",
          name: "John Doe",
          role: Role.BASE,
          factory_id: 1,
        },
      });

      vi.mocked(axios.post).mockResolvedValueOnce({ data: { success: true } });

      await useAuthStore.getState().logout();

      expect(axios.post).toHaveBeenCalledWith("/api/auth/logout");
      expect(useAuthStore.getState().user).toBeNull();
      expect(toast.success).toHaveBeenCalledWith(
        "See you soon, John Doe! Logged out successfully 👋",
      );
    });

    it("should fallback to username on logout if name is absent", async () => {
      useAuthStore.setState({
        user: {
          id: "u1",
          username: "u1",
          role: Role.BASE,
          factory_id: 1,
        },
      });

      vi.mocked(axios.post).mockResolvedValueOnce({ data: { success: true } });

      await useAuthStore.getState().logout();

      expect(toast.success).toHaveBeenCalledWith("See you soon, u1! Logged out successfully 👋");
    });
  });
});
