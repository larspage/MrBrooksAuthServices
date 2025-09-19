// Mock the Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn(),
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }))
}))

// Mock console.error to prevent noise in test output
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

import { supabase, setApplicationContext, getApplicationContext, isAdmin } from '../supabase'

describe('Supabase Helper Functions', () => {
  let mockRpc: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockConsoleError.mockClear()
    
    // Get the mocked rpc function
    mockRpc = supabase.rpc as jest.Mock
  })

  afterAll(() => {
    mockConsoleError.mockRestore()
  })

  describe('supabase client initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(supabase).toBeDefined()
      expect(supabase.auth).toEqual({
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      })
    })
  })

  describe('setApplicationContext', () => {
    it('should successfully set application context', async () => {
      const applicationId = 'app-123'
      
      mockRpc.mockResolvedValue({
        data: null,
        error: null
      })

      await setApplicationContext(applicationId)

      expect(mockRpc).toHaveBeenCalledWith('set_application_context', {
        app_id: applicationId
      })
    })

    it('should handle empty application ID', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: null
      })

      await setApplicationContext('')

      expect(mockRpc).toHaveBeenCalledWith('set_application_context', {
        app_id: ''
      })
    })

    it('should handle null application ID', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: null
      })

      await setApplicationContext(null as any)

      expect(mockRpc).toHaveBeenCalledWith('set_application_context', {
        app_id: null
      })
    })

    it('should handle very long application ID', async () => {
      const longAppId = 'a'.repeat(1000)
      
      mockRpc.mockResolvedValue({
        data: null,
        error: null
      })

      await setApplicationContext(longAppId)

      expect(mockRpc).toHaveBeenCalledWith('set_application_context', {
        app_id: longAppId
      })
    })

    it('should handle special characters in application ID', async () => {
      const specialAppId = 'app-123!@#$%^&*()_+-=[]{}|;:,.<>?'
      
      mockRpc.mockResolvedValue({
        data: null,
        error: null
      })

      await setApplicationContext(specialAppId)

      expect(mockRpc).toHaveBeenCalledWith('set_application_context', {
        app_id: specialAppId
      })
    })

    it('should throw error when RPC fails', async () => {
      const applicationId = 'app-123'
      const mockError = new Error('RPC failed')
      
      mockRpc.mockResolvedValue({
        data: null,
        error: mockError
      })

      await expect(setApplicationContext(applicationId)).rejects.toThrow('RPC failed')

      expect(mockRpc).toHaveBeenCalledWith('set_application_context', {
        app_id: applicationId
      })
    })

    it('should handle database connection errors', async () => {
      const applicationId = 'app-123'
      const dbError = {
        message: 'Connection timeout',
        code: 'CONNECTION_ERROR',
        details: 'Database connection failed'
      }
      
      mockRpc.mockResolvedValue({
        data: null,
        error: dbError
      })

      await expect(setApplicationContext(applicationId)).rejects.toEqual(dbError)
    })

    it('should handle RPC function not found error', async () => {
      const applicationId = 'app-123'
      const rpcError = {
        message: 'function set_application_context() does not exist',
        code: '42883',
        details: 'RPC function not found'
      }
      
      mockRpc.mockResolvedValue({
        data: null,
        error: rpcError
      })

      await expect(setApplicationContext(applicationId)).rejects.toEqual(rpcError)
    })
  })

  describe('getApplicationContext', () => {
    it('should successfully get application context', async () => {
      const mockContextData = 'app-123'
      
      mockRpc.mockResolvedValue({
        data: mockContextData,
        error: null
      })

      const result = await getApplicationContext()

      expect(result).toBe(mockContextData)
      expect(mockRpc).toHaveBeenCalledWith('get_application_context')
    })

    it('should return null when no context is set', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await getApplicationContext()

      expect(result).toBeNull()
      expect(mockRpc).toHaveBeenCalledWith('get_application_context')
    })

    it('should return undefined when data is undefined', async () => {
      mockRpc.mockResolvedValue({
        data: undefined,
        error: null
      })

      const result = await getApplicationContext()

      expect(result).toBeUndefined()
      expect(mockRpc).toHaveBeenCalledWith('get_application_context')
    })

    it('should return complex context data', async () => {
      const complexContext = {
        applicationId: 'app-123',
        userId: 'user-456',
        permissions: ['read', 'write'],
        metadata: {
          version: '1.0.0',
          environment: 'production'
        }
      }
      
      mockRpc.mockResolvedValue({
        data: complexContext,
        error: null
      })

      const result = await getApplicationContext()

      expect(result).toEqual(complexContext)
      expect(mockRpc).toHaveBeenCalledWith('get_application_context')
    })

    it('should throw error when RPC fails', async () => {
      const mockError = new Error('RPC failed')
      
      mockRpc.mockResolvedValue({
        data: null,
        error: mockError
      })

      await expect(getApplicationContext()).rejects.toThrow('RPC failed')

      expect(mockRpc).toHaveBeenCalledWith('get_application_context')
    })

    it('should handle permission denied errors', async () => {
      const permissionError = {
        message: 'permission denied for function get_application_context',
        code: '42501',
        details: 'Insufficient privileges'
      }
      
      mockRpc.mockResolvedValue({
        data: null,
        error: permissionError
      })

      await expect(getApplicationContext()).rejects.toEqual(permissionError)
    })

    it('should handle network timeout errors', async () => {
      const timeoutError = {
        message: 'Request timeout',
        code: 'TIMEOUT',
        details: 'Network request timed out'
      }
      
      mockRpc.mockResolvedValue({
        data: null,
        error: timeoutError
      })

      await expect(getApplicationContext()).rejects.toEqual(timeoutError)
    })
  })

  describe('isAdmin', () => {
    it('should return true when user is admin', async () => {
      mockRpc.mockResolvedValue({
        data: true,
        error: null
      })

      const result = await isAdmin()

      expect(result).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('is_admin')
    })

    it('should return false when user is not admin', async () => {
      mockRpc.mockResolvedValue({
        data: false,
        error: null
      })

      const result = await isAdmin()

      expect(result).toBe(false)
      expect(mockRpc).toHaveBeenCalledWith('is_admin')
    })

    it('should return null when data is null', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await isAdmin()

      expect(result).toBeNull()
      expect(mockRpc).toHaveBeenCalledWith('is_admin')
    })

    it('should return undefined when data is undefined', async () => {
      mockRpc.mockResolvedValue({
        data: undefined,
        error: null
      })

      const result = await isAdmin()

      expect(result).toBeUndefined()
      expect(mockRpc).toHaveBeenCalledWith('is_admin')
    })

    it('should handle truthy non-boolean values', async () => {
      mockRpc.mockResolvedValue({
        data: 'admin',
        error: null
      })

      const result = await isAdmin()

      expect(result).toBe('admin')
      expect(mockRpc).toHaveBeenCalledWith('is_admin')
    })

    it('should handle falsy non-boolean values', async () => {
      mockRpc.mockResolvedValue({
        data: 0,
        error: null
      })

      const result = await isAdmin()

      expect(result).toBe(0)
      expect(mockRpc).toHaveBeenCalledWith('is_admin')
    })

    it('should return false when RPC fails', async () => {
      const mockError = new Error('RPC failed')
      
      mockRpc.mockResolvedValue({
        data: null,
        error: mockError
      })

      const result = await isAdmin()

      expect(result).toBe(false)
      expect(mockRpc).toHaveBeenCalledWith('is_admin')
    })

    it('should handle authentication errors gracefully', async () => {
      const authError = {
        message: 'JWT expired',
        code: 'PGRST301',
        details: 'Authentication token has expired'
      }
      
      mockRpc.mockResolvedValue({
        data: null,
        error: authError
      })

      const result = await isAdmin()

      expect(result).toBe(false)
    })

    it('should handle database connection errors gracefully', async () => {
      const dbError = {
        message: 'Connection refused',
        code: 'CONNECTION_ERROR',
        details: 'Unable to connect to database'
      }
      
      mockRpc.mockResolvedValue({
        data: null,
        error: dbError
      })

      const result = await isAdmin()

      expect(result).toBe(false)
    })

    it('should handle RLS policy violations', async () => {
      const rlsError = {
        message: 'new row violates row-level security policy',
        code: '42501',
        details: 'Row-level security policy violation'
      }
      
      mockRpc.mockResolvedValue({
        data: null,
        error: rlsError
      })

      const result = await isAdmin()

      expect(result).toBe(false)
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle RPC returning unexpected data types', async () => {
      const unexpectedData = { unexpected: 'structure' }
      
      mockRpc.mockResolvedValue({
        data: unexpectedData,
        error: null
      })

      const result = await getApplicationContext()

      expect(result).toEqual(unexpectedData)
    })

    it('should handle RPC throwing exceptions', async () => {
      const exception = new Error('Unexpected exception')
      
      mockRpc.mockRejectedValue(exception)

      await expect(setApplicationContext('app-123')).rejects.toThrow('Unexpected exception')
    })

    it('should handle concurrent RPC calls', async () => {
      mockRpc.mockResolvedValue({
        data: true,
        error: null
      })

      const promises = [
        isAdmin(),
        isAdmin(),
        isAdmin()
      ]

      const results = await Promise.all(promises)

      expect(results).toEqual([true, true, true])
      expect(mockRpc).toHaveBeenCalledTimes(3)
    })

    it('should handle mixed success and failure scenarios', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: null, error: new Error('Failed') })
        .mockResolvedValueOnce({ data: false, error: null })

      const results = await Promise.allSettled([
        isAdmin(),
        isAdmin(),
        isAdmin()
      ])

      expect(results[0]).toEqual({ status: 'fulfilled', value: true })
      expect(results[1]).toEqual({ status: 'fulfilled', value: false })
      expect(results[2]).toEqual({ status: 'fulfilled', value: false })
    })

    it('should handle very large data responses', async () => {
      const largeData = 'x'.repeat(100000)
      
      mockRpc.mockResolvedValue({
        data: largeData,
        error: null
      })

      const result = await getApplicationContext()

      expect(result).toBe(largeData)
      expect(result.length).toBe(100000)
    })

    it('should handle circular reference data', async () => {
      const circularData: any = { name: 'test' }
      circularData.self = circularData
      
      mockRpc.mockResolvedValue({
        data: circularData,
        error: null
      })

      const result = await getApplicationContext()

      expect(result.name).toBe('test')
      expect(result.self).toBe(result)
    })
  })

  describe('Performance and Reliability', () => {
    it('should handle rapid successive calls', async () => {
      mockRpc.mockResolvedValue({
        data: 'app-123',
        error: null
      })

      const promises = Array.from({ length: 100 }, () => getApplicationContext())
      const results = await Promise.all(promises)

      expect(results).toHaveLength(100)
      expect(results.every(result => result === 'app-123')).toBe(true)
      expect(mockRpc).toHaveBeenCalledTimes(100)
    })

    it('should handle timeout scenarios gracefully', async () => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 100)
      })

      mockRpc.mockImplementation(() => timeoutPromise)

      await expect(setApplicationContext('app-123')).rejects.toThrow('Timeout')
    })

    it('should handle memory pressure scenarios', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(1000)
      }))

      mockRpc.mockResolvedValue({
        data: largeArray,
        error: null
      })

      const result = await getApplicationContext()

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(10000)
    })
  })

  describe('Environment Variable Handling', () => {
    const originalEnv = process.env

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should handle missing NEXT_PUBLIC_SUPABASE_URL', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined()
    })

    it('should handle missing NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeUndefined()
    })

    it('should handle empty environment variables', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = ''
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''
      
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('')
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('')
    })
  })
})