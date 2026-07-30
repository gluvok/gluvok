import { describe, it, expect, vi, beforeEach } from "vitest"
import { useAuthStore } from "./auth"
import { Role } from "@/lib/constants/enums"
import { toast } from "sonner"
import axios from "axios"

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}))

// Mock axios
vi.mock("axios")

describe("Auth Store (Zustand with custom JWT API via Axios)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: null,
      hydrated: false,
      initialized: false,
      profileLoading: false,
    })
  })

  describe("initAuth", () => {
    it("should fetch /api/auth/me and set user state on success", async () => {
      const mockUser = {
        id: "user-123",
        username: "adminuser",
        name: "Admin User",
        role: Role.ADMIN,
        factory_id: 1,
      }

      vi.mocked(axios.get).mockResolvedValueOnce({
        data: { user: mockUser },
      })

      const unsubscribe = useAuthStore.getState().initAuth()
      await new Promise(process.nextTick)

      expect(axios.get).toHaveBeenCalledWith("/api/auth/me", expect.any(Object))
      expect(useAuthStore.getState().initialized).toBe(true)
      expect(useAuthStore.getState().user?.username).toBe("adminuser")
      expect(unsubscribe).toBeDefined()
    })

    it("should set user to null if /api/auth/me fails", async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error("Unauthorized"))

      useAuthStore.getState().initAuth()
      await new Promise(process.nextTick)

      expect(useAuthStore.getState().initialized).toBe(true)
      expect(useAuthStore.getState().user).toBeNull()
    })

    it("should do nothing if already initialized", () => {
      useAuthStore.setState({ initialized: true })
      const unsubscribe = useAuthStore.getState().initAuth()
      expect(axios.get).not.toHaveBeenCalled()
      unsubscribe()
    })
  })

  describe("login", () => {
    it("should call /api/auth/login with username & password and set user on success", async () => {
      const mockUser = {
        id: "user-456",
        username: "admin",
        name: "Admin User",
        role: Role.ADMIN,
        factory_id: 2,
      }

      vi.mocked(axios.post).mockResolvedValueOnce({
        status: 200,
        data: { success: true, user: mockUser },
      })

      const success = await useAuthStore.getState().login("admin", "secretpass")

      expect(success).toBe(true)
      expect(axios.post).toHaveBeenCalledWith(
        "/api/auth/login",
        { username: "admin", password: "secretpass" },
        expect.any(Object)
      )
      expect(useAuthStore.getState().user?.username).toBe("admin")
      expect(toast.success).toHaveBeenCalledWith("Welcome back, Admin User!")
    })

    it("should toast error and return false on invalid credentials", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        status: 401,
        data: { error: "Invalid username or password." },
      })

      const success = await useAuthStore.getState().login("wronguser", "badpass")

      expect(success).toBe(false)
      expect(toast.error).toHaveBeenCalledWith("Invalid username or password.")
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe("logout", () => {
    it("should call /api/auth/logout and clear user state", async () => {
      useAuthStore.setState({
        user: {
          id: "u1",
          username: "u1",
          name: "U1",
          role: Role.BASE,
          factory_id: 1,
        },
      })

      vi.mocked(axios.post).mockResolvedValueOnce({ data: { success: true } })

      await useAuthStore.getState().logout()

      expect(axios.post).toHaveBeenCalledWith("/api/auth/logout")
      expect(useAuthStore.getState().user).toBeNull()
      expect(toast.success).toHaveBeenCalledWith("Successfully logged out")
    })
  })
})
