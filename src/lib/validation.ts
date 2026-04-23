/**
 * Input Validation Schemas using Zod
 * 
 * Prevents SQL injection by validating all user inputs match expected types
 * Supabase uses parameterized queries, but this provides defense-in-depth
 */

import { z } from 'zod'

// ============================================================================
// UUID VALIDATION
// ============================================================================

/**
 * Validates a UUID v4 string
 */
export const uuidSchema = z.string().uuid()

/**
 * Validates optional UUID
 */
export const optionalUuidSchema = z.string().uuid().optional()

// ============================================================================
// APPLICATION ID
// ============================================================================

/**
 * Application ID - must be valid UUID
 */
export const applicationIdSchema = uuidSchema

// ============================================================================
// AUTH SESSION TOKEN  
// ============================================================================

/**
 * Session token - alphanumeric, 20-100 chars
 */
export const sessionTokenSchema = z
  .string()
  .min(20, 'Session token too short')
  .max(100, 'Session token too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid session token format')

// ============================================================================
// USER TOKEN
// ============================================================================

/**
 * User token - JWT or session token
 */
export const userTokenSchema = z
  .string()
  .min(20, 'User token too short')
  .max(2000, 'User token too long')

// ============================================================================
// REDIRECT URL
// ============================================================================

/**
 * Validates redirect URL is from allowed origins
 * This is checked in the route handler, so we just validate format here
 */
export const redirectUrlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2000, 'Redirect URL too long')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url)
        // Only allow http and https
        return ['http:', 'https:'].includes(parsed.protocol)
      } catch {
        return false
      }
    },
    { message: 'Only HTTP and HTTPS URLs allowed' }
  )

// ============================================================================
// TIER LEVEL
// ============================================================================

/**
 * Membership tier level - integer between 0 and 100
 */
export const tierLevelSchema = z
  .number()
  .int('Tier level must be an integer')
  .min(0, 'Tier level must be at least 0')
  .max(100, 'Tier level must not exceed 100')

// ============================================================================
// APPLICATION CREATE
// ============================================================================

/**
 * Application creation input
 */
export const createApplicationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z0-9_\s-]+$/, 'Name can only contain letters, numbers, spaces, hyphens and underscores'),
  description: z.string().max(500, 'Description too long').optional(),
  url: redirectUrlSchema.optional(),
  allowed_redirect_urls: z.array(redirectUrlSchema).max(10, 'Too many redirect URLs').optional(),
})

// ============================================================================
// APPLICATION UPDATE
// ============================================================================

/**
 * Application update input
 */
export const updateApplicationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z0-9_\s-]+$/, 'Name can only contain letters, numbers, spaces, hyphens and underscores')
    .optional(),
  description: z.string().max(500, 'Description too long').optional(),
  url: redirectUrlSchema.optional().nullable(),
  allowed_redirect_urls: z.array(redirectUrlSchema).max(10, 'Too many redirect URLs').optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
})

// ============================================================================
// AUTH INITIATE REQUEST
// ============================================================================

/**
 * POST /api/auth/initiate request body
 */
export const authInitiateSchema = z.object({
  application_id: applicationIdSchema,
  redirect_url: redirectUrlSchema.optional(),
  user_email: z.string().email('Invalid email format').optional(),
  session_state: z.string().max(500, 'Session state too long').optional(),
  expires_in_minutes: z
    .number()
    .int()
    .min(5, 'Minimum expiry is 5 minutes')
    .max(60 * 24 * 7, 'Maximum expiry is 7 days')
    .optional(),
})

// ============================================================================
// AUTH COMPLETE REQUEST
// ============================================================================

/**
 * POST /api/auth/complete request body
 */
export const authCompleteSchema = z.object({
  session_token: sessionTokenSchema,
  redirect_url: redirectUrlSchema.optional(),
})

// ============================================================================
// AUTH VERIFY REQUEST
// ============================================================================

/**
 * POST /api/auth/verify request body
 */
export const authVerifySchema = z.object({
  application_id: applicationIdSchema,
  user_token: userTokenSchema.optional(),
  required_tier_level: tierLevelSchema.optional(),
})

// ============================================================================
// CSRF TOKEN
// ============================================================================

/**
 * CSRF token - random string
 */
export const csrfTokenSchema = z
  .string()
  .min(32, 'CSRF token too short')
  .max(100, 'CSRF token too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid CSRF token format')

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Parse and validate input with schema
 * Returns parsed data or throws error
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  return schema.parse(data)
}

/**
 * Safe parse - returns result without throwing
 */
export function safeValidateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { 
    success: false, 
    error: result.error.errors.map(e => e.message).join(', ') 
  }
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>
export type AuthInitiateInput = z.infer<typeof authInitiateSchema>
export type AuthCompleteInput = z.infer<typeof authCompleteSchema>
export type AuthVerifyInput = z.infer<typeof authVerifySchema>