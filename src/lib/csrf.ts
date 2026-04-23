/**
 * CSRF Protection Module
 * 
 * Generates and validates anti-CSRF tokens to prevent cross-site request forgery
 */

import { cookies } from 'next/headers'

// CSRF token storage (in production, use Redis or database)
// Format: token -> { expiresAt, applicationId }
const csrfTokens = new Map<string, { expiresAt: number; applicationId: string }>()

// Token validity in seconds (5 minutes)
const CSRF_TOKEN_EXPIRY = 5 * 60

// Cookie name
const CSRF_COOKIE_NAME = 'csrf_token'

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(applicationId: string): string {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  const expiresAt = Date.now() + (CSRF_TOKEN_EXPIRY * 1000)
  
  // Clean up expired tokens first
  cleanupCsrfTokens()
  
  // Store token
  csrfTokens.set(token, { expiresAt, applicationId })
  
  return token
}

/**
 * Validate a CSRF token
 * Returns true if valid, false if invalid/expired
 */
export function validateCsrfToken(
  token: string,
  applicationId?: string
): boolean {
  const tokenData = csrfTokens.get(token)
  
  if (!tokenData) {
    return false
  }
  
  // Check expiration
  if (Date.now() > tokenData.expiresAt) {
    csrfTokens.delete(token)
    return false
  }
  
  // Optionally verify it was generated for this application
  if (applicationId && tokenData.applicationId !== applicationId) {
    return false
  }
  
  // Token is valid - consume it (one-time use)
  csrfTokens.delete(token)
  
  return true
}

/**
 * Get CSRF token from cookie (server-side)
 */
export async function getCsrfTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  const csrfCookie = cookieStore.get(CSRF_COOKIE_NAME)
  return csrfCookie?.value || null
}

/**
 * Check if request has valid CSRF token
 * For use in API routes
 */
export async function checkCsrfToken(): Promise<{
  valid: boolean
  token: string | null
}> {
  const token = await getCsrfTokenFromCookie()
  
  if (!token) {
    return { valid: false, token: null }
  }
  
  // Validate but don't consume yet (validation function does that)
  const tokenData = csrfTokens.get(token)
  
  if (!tokenData) {
    return { valid: false, token: null }
  }
  
  if (Date.now() > tokenData.expiresAt) {
    csrfTokens.delete(token)
    return { valid: false, token: null }
  }
  
  return { valid: true, token }
}

/**
 * Clean up expired CSRF tokens
 */
function cleanupCsrfTokens() {
  const now = Date.now()
  for (const [token, data] of csrfTokens.entries()) {
    if (now > data.expiresAt) {
      csrfTokens.delete(token)
    }
  }
}

// Cleanup every minute
setInterval(cleanupCsrfTokens, 60 * 1000)

// ============================================================================
// EXPRESSIONS FOR COOKIE HEADERS
// ============================================================================

/**
 * Get cookie header value for CSRF token
 */
export function getCsrfCookie(token: string): string {
  const expires = new Date(Date.now() + CSRF_TOKEN_EXPIRY * 1000)
  return `${CSRF_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Expires=${expires.toUTCString()}`
}

/**
 * Get cookie header for clearing CSRF token
 */
export function clearCsrfCookie(): string {
  return `${CSRF_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
}