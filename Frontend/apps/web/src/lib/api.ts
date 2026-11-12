import { createApi } from '@intyoza/shared/api/client'
import { setFacilitiesBaseUrl } from '@intyoza/shared/services/api'
import { chatStorage } from './privacy/consent'

/** Sent on window when the server stops accepting the login token (AccountProvider listens). */
export const SIGNED_OUT_EVENT = 'intyoza:signed-out'

// Read the backend URL from Vite's environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL

// Safety check: If this is missing in production, log a clear error.
if (!API_BASE_URL && import.meta.env.PROD) {
  console.error(
    "CRITICAL ERROR: VITE_API_URL is missing! The app will not be able to talk to the backend."
  )
}

export const api = createApi({
  // Fallback to empty string only for local development if the env var is missing
  baseUrl: API_BASE_URL || '',
  storage: chatStorage,
  onSignedOut: () => window.dispatchEvent(new Event(SIGNED_OUT_EVENT)),
})

setFacilitiesBaseUrl(API_BASE_URL || '')