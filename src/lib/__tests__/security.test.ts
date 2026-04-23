/**
 * Security Module Tests
 */

import { isValidUUID, isValidEmail, sanitizeInput, generateSecureToken } from '../security'

describe('security', () => {
  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(isValidUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true)
    })

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false)
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false)
      expect(isValidUUID('')).toBe(false)
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user@domain.org')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('not-an-email')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
    })
  })

  describe('sanitizeInput', () => {
    it('should remove null bytes', () => {
      expect(sanitizeInput('test\x00value')).toBe('testvalue')
    })

    it('should remove control characters', () => {
      expect(sanitizeInput('test\x01value\x1F')).toBe('testvalue')
    })

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test value  ')).toBe('test value')
    })
  })

  describe('generateSecureToken', () => {
    it('should generate token of correct length', () => {
      expect(generateSecureToken(32).length).toBe(32)
      expect(generateSecureToken(64).length).toBe(64)
    })

    it('should only contain allowed characters', () => {
      const token = generateSecureToken(32)
      expect(/^[a-zA-Z0-9_-]+$/.test(token)).toBe(true)
    })
  })
})