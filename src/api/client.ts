import axios from "axios"
import { toast } from "sonner"

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8001"

export const apiClient = axios.create({
  baseURL,
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

