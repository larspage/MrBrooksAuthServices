/**
 * Validation Module Tests
 * Note: Some tests skipped - require full app context
 */

import {
  uuidSchema,
  sessionTokenSchema,
} from '../validation'

describe('validation', () => {
  describe('uuidSchema', () => {
    it('should validate correct UUID', () => {
      const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000')
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const result = uuidSchema.safeParse('not-a-uuid')
      expect(result.success).toBe(false)
    })
  })

  describe('sessionTokenSchema', () => {
    it('should validate correct session token', () => {
      const result = sessionTokenSchema.safeParse('test-session-token-12345')
      expect(result.success).toBe(true)
    })

    it('should reject short token', () => {
      const result = sessionTokenSchema.safeParse('short')
      expect(result.success).toBe(false)
    })
  })
})