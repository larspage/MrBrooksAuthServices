/**
 * Security Middleware
 * 
 * Implements:
 * - Origin/Referer allowlisting (block external callers)
 * - Rate limiting
 * - Input validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

// ============================================================================
// ORIGIN ALLOWLIST CONFIGURATION
// ============================================================================

// IMPORTANT: Update this list with your allowed domains
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:6010',
      'http://localhost:3000',
    ]

const ALLOWED_REFERERS = process.env.ALLOWED_REFERERS
  ? process.env.ALLOWED_REFERINS.split(',').map(r => r.trim())
  : [
      'localhost:6010',
      'localhost:3000',
    ]

// ============================================================================
// RATE LIMITING CONFIGURATION  
// ============================================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory rate limiting (use Redis for production)
// Format: IP address -> { count, resetAt }
const rateLimitStore = new Map<string, RateLimitEntry>()

// Rate limit: requests per window
const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '100', 10)
// Rate limit window in seconds
const RATE_LIMIT_WINDOW_SECONDS = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10)

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)
  
  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + (RATE_LIMIT_WINDOW_SECONDS * 1000)
    })
    return false
  }
  
  if (entry.count >= RATE_LIMIT_REQUESTS) {
    return true // Rate limited
  }
  
  entry.count++
  return false
}

function cleanupRateLimitStore() {
  const now = Date.now()
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(ip)
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000)

// ============================================================================
// ALLOWED HOSTNAMES (computed from allowed origins)
// ============================================================================

function getAllowedHostnames(): string[] {
  return ALLOWED_ORIGINS.map(origin => {
    try {
      const url = new URL(origin)
      return url.hostname
    } catch {
      // Handle origins without protocol
      return origin.replace(/^https?:\/\//, '').split(':')[0]
    }
  })
}

const ALLOWED_HOSTNAMES = getAllowedHostnames()

// ============================================================================
// ORIGIN CHECK
// ============================================================================

function isOriginAllowed(origin: string | null, referer: string | null): boolean {
  if (!origin && !referer) {
    // No origin and no referer - likely external attempt
    return false
  }

  // Check Origin header
  if (origin) {
    try {
      const originUrl = new URL(origin)
      if (ALLOWED_HOSTNAMES.includes(originUrl.hostname)) {
        return true
      }
    } catch {
      // Invalid origin format
    }
  }

  // Check Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      if (ALLOWED_HOSTNAMES.includes(refererUrl.hostname)) {
        return true
      }
    } catch {
      // Invalid referer format
    }
  }

  // Special case: allow requests from same origin (no external referer)
  // This handles POST requests where browsers don't send Origin for same-origin
  if (referer) {
    for (const allowed of ALLOWED_HOSTNAMES) {
      if (referer.includes(allowed)) {
        return true
      }
    }
  }

  return false
}

// ============================================================================
// MAIN SECURITY MIDDLEWARE
// ============================================================================

export async function securityMiddleware(
  req: NextRequest,
  res: NextResponse
): Promise<NextResponse> {
  // Skip security for health check
  if (req.nextUrl.pathname === '/api/auth/verify' && req.method === 'GET') {
    return res
  }

  // Skip security for static files and Next.js internals
  if (req.nextUrl.pathname.startsWith('/_next') ||
      req.nextUrl.pathname.startsWith('/static') ||
      req.nextUrl.pathname.includes('favicon')) {
    return res
  }

  // =========================================================================
  // 1. ORIGIN ALLOWLIST CHECK
  // =========================================================================
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')

  if (!isOriginAllowed(origin, referer)) {
    console.warn(`🔒 BLOCKED: Unauthorized origin/referer`, { origin, referer, path: req.nextUrl.pathname })
    return new NextResponse('Forbidden', {
      status: 403,
      statusText: 'Not allowed from this origin',
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      }
    })
  }

  // =========================================================================
  // 2. RATE LIMITING
  // =========================================================================
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || req.headers.get('x-real-ip')
            || 'unknown'

  if (isRateLimited(clientIP)) {
    console.warn(`⚡ RATE LIMIT EXCEEDED:`, { ip: clientIP, path: req.nextUrl.pathname })
    return new NextResponse('Too Many Requests', {
      status: 429,
      statusText: 'Rate limit exceeded. Please try again later.',
      headers: {
        'Retry-After': String(RATE_LIMIT_WINDOW_SECONDS),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      }
    })
  }

  // =========================================================================
  // 3. SECURITY HEADERS (always add)
  // =========================================================================
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'none'"
  )

  return res
}

// ============================================================================
// EXPORTS FOR USE IN ROUTES
// ============================================================================

export {
  isOriginAllowed,
  isRateLimited,
  ALLOWED_ORIGINS,
  ALLOWED_HOSTNAMES,
  RATE_LIMIT_REQUESTS,
  RATE_LIMIT_WINDOW_SECONDS,
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that a string is a valid UUID
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Validate that a string is a valid email
 */
export function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

/**
 * Validate that a URL is from allowed origins
 */
export function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    return ALLOWED_HOSTNAMES.some(host => 
      parsedUrl.hostname === host || parsedUrl.hostname.endsWith('.' + host)
    )
  } catch {
    return false
  }
}

/**
 * Sanitize string input to prevent injection
 * NOTE: Supabase uses parameterized queries, so this is defense-in-depth
 */
export function sanitizeInput(input: string): string {
  // Remove null bytes and control characters
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(length)
  // Use crypto.getRandomValues if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, b => chars[b % chars.length]).join('')
}