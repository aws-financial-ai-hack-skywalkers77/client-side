/**
 * Utility functions for localStorage persistence
 */

/**
 * Load data from localStorage
 */
export function loadFromStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return null
    
    const parsed = JSON.parse(stored)
    return parsed as T
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error)
    return null
  }
}

/**
 * Save data to localStorage
 */
export function saveToStorage<T>(key: string, data: T | null): void {
  if (typeof window === "undefined") return
  
  try {
    if (data === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(data))
    }
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error)
  }
}

/**
 * Clear data from localStorage
 */
export function clearStorage(key: string): void {
  if (typeof window === "undefined") return
  
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to clear ${key} from localStorage:`, error)
  }
}

// Storage keys
export const STORAGE_KEYS = {
  INVOICES: "invoices_data",
  CONTRACTS: "contracts_data",
  DASHBOARD: "dashboard_data",
  WORKFLOW_BATCH: "invoice_workflow_batch",
} as const

