import axios from "axios"
import { toast } from "sonner"

/** Prefer VITE_API_URL; keep VITE_API_BASE_URL for backwards compatibility. */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8001"

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300_000,
  headers: {
    "Content-Type": "application/json",
  },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.detail ??
      error?.response?.data?.message ??
      error?.message ??
      "An unexpected error occurred"
    toast.error(message)
    return Promise.reject(error)
  },
)

