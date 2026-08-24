/**
 * @file lib/services/interceptor.ts
 * @description Global Axios interceptor for automatic silent token refresh on 401 Unauthorized responses.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "@/lib/store/auth"
import { ApiRoutes, AppRoutes } from "@/lib/constants/enums"
import { AuthErrorMessage } from "@/lib/constants/messages"

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: Error | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

export function setupAxiosInterceptors() {
  axios.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as CustomAxiosRequestConfig

      if (!originalRequest) {
        return Promise.reject(error)
      }

      if (
        originalRequest.url?.includes(ApiRoutes.AUTH_LOGIN) ||
        originalRequest.url?.includes(ApiRoutes.AUTH_REFRESH)
      ) {
        return Promise.reject(error)
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then(() => axios(originalRequest))
            .catch((err) => Promise.reject(err))
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const refreshRes = await axios.post<{ success: boolean }>(
            ApiRoutes.AUTH_REFRESH,
            {},
            { validateStatus: (status) => status < 500 }
          )

          if (refreshRes.status === 200 && refreshRes.data?.success) {
            processQueue(null)
            return axios(originalRequest)
          }

          throw new Error(AuthErrorMessage.TOKEN_REFRESH_FAILED)
        } catch (refreshErr) {
          processQueue(
            refreshErr instanceof Error ? refreshErr : new Error(AuthErrorMessage.TOKEN_REFRESH_FAILED)
          )
          useAuthStore.getState().logout()
          if (
            typeof window !== "undefined" &&
            window.location.pathname !== AppRoutes.LOGIN
          ) {
            window.location.href = AppRoutes.LOGIN
          }
          return Promise.reject(refreshErr)
        } finally {
          isRefreshing = false
        }
      }

      return Promise.reject(error)
    }
  )
}
