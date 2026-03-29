import { generateUnificationToken, consumeUnificationToken } from '@/lib/security/unification-token'
import { storage } from '@/lib/redis'

jest.mock('@/lib/redis', () => ({
  storage: {
    set: jest.fn(),
    getAndDel: jest.fn(),
  },
}))

describe('unification-token.ts', () => {
  const mockStorage = storage as jest.Mocked<typeof storage>

  beforeEach(() => {
    jest.clearAllMocks()
    mockStorage.set.mockResolvedValue(undefined)
  })

  describe('generateUnificationToken', () => {
    it('should generate a 64-character hex token', async () => {
      const token = await generateUnificationToken('test-fingerprint')

      expect(token).toMatch(/^[a-f0-9]{64}$/)
      expect(token.length).toBe(64)
    })

    it('should generate different tokens on each call', async () => {
      const token1 = await generateUnificationToken('test-fingerprint')
      const token2 = await generateUnificationToken('test-fingerprint')

      expect(token1).not.toBe(token2)
    })

    it('should store token with correct key format', async () => {
      const fingerprint = 'abc123def456'
      const token = await generateUnificationToken(fingerprint)

      expect(mockStorage.set).toHaveBeenCalledWith(
        `front:unification-token:${fingerprint}:${token}`,
        1,
        300, // 5 minutes TTL
      )
    })

    it('should use 5-minute TTL (300 seconds)', async () => {
      await generateUnificationToken('fp')

      const [, , ttl] = mockStorage.set.mock.calls[0]
      expect(ttl).toBe(300)
    })

    it('should store value 1 as the marker', async () => {
      await generateUnificationToken('fp')

      const [, value] = mockStorage.set.mock.calls[0]
      expect(value).toBe(1)
    })

    it('should include token_prefix "front:unification-token:" in key', async () => {
      const fingerprint = 'my-fingerprint'
      const token = await generateUnificationToken(fingerprint)

      const [key] = mockStorage.set.mock.calls[0]
      expect(key.startsWith('front:unification-token:')).toBe(true)
      expect(key).toContain(fingerprint)
      expect(key).toContain(token)
    })

    it('should generate different keys for different fingerprints', async () => {
      const token1 = await generateUnificationToken('fingerprint-A')
      const token2 = await generateUnificationToken('fingerprint-B')

      const key1 = mockStorage.set.mock.calls[0][0] as string
      const key2 = mockStorage.set.mock.calls[1][0] as string

      expect(key1).not.toBe(key2)
      expect(key1).toContain('fingerprint-A')
      expect(key2).toContain('fingerprint-B')
    })

    it('should call storage.set exactly once per call', async () => {
      await generateUnificationToken('fp1')
      await generateUnificationToken('fp2')

      expect(mockStorage.set).toHaveBeenCalledTimes(2)
    })

    it('should propagate storage errors', async () => {
      mockStorage.set.mockRejectedValue(new Error('Redis unavailable'))

      await expect(generateUnificationToken('fp')).rejects.toThrow('Redis unavailable')
    })
  })

  describe('consumeUnificationToken', () => {
    describe('valid tokens', () => {
      it('should return true for a valid 64-char token when storage returns a value', async () => {
        mockStorage.getAndDel.mockResolvedValue('1')

        const validToken = 'a'.repeat(64)
        const result = await consumeUnificationToken(validToken, 'my-fingerprint')

        expect(result).toBe(true)
      })

      it('should call getAndDel with correct key', async () => {
        mockStorage.getAndDel.mockResolvedValue('1')

        const token = 'b'.repeat(64)
        const fingerprint = 'test-fp-123'
        await consumeUnificationToken(token, fingerprint)

        expect(mockStorage.getAndDel).toHaveBeenCalledWith(
          `front:unification-token:${fingerprint}:${token}`,
        )
      })

      it('should return false when token is not found in storage (expired/used)', async () => {
        mockStorage.getAndDel.mockResolvedValue(null)

        const validToken = 'c'.repeat(64)
        const result = await consumeUnificationToken(validToken, 'fingerprint')

        expect(result).toBe(false)
      })

      it('should consume token (getAndDel is called once — atomic)', async () => {
        mockStorage.getAndDel.mockResolvedValue('1')

        const token = 'd'.repeat(64)
        await consumeUnificationToken(token, 'fp')

        expect(mockStorage.getAndDel).toHaveBeenCalledTimes(1)
      })

      it('should reject replay: second call returns false after first consumed it', async () => {
        mockStorage.getAndDel
          .mockResolvedValueOnce('1') // first call: token found
          .mockResolvedValueOnce(null) // second call: already consumed

        const token = 'e'.repeat(64)
        const first = await consumeUnificationToken(token, 'fp')
        const second = await consumeUnificationToken(token, 'fp')

        expect(first).toBe(true)
        expect(second).toBe(false)
      })
    })

    describe('invalid tokens — early rejection (no storage call)', () => {
      it('should return false for empty string token', async () => {
        const result = await consumeUnificationToken('', 'fingerprint')

        expect(result).toBe(false)
        expect(mockStorage.getAndDel).not.toHaveBeenCalled()
      })

      it('should return false for token shorter than 64 chars', async () => {
        const result = await consumeUnificationToken('abc123', 'fingerprint')

        expect(result).toBe(false)
        expect(mockStorage.getAndDel).not.toHaveBeenCalled()
      })

      it('should return false for token longer than 64 chars', async () => {
        const longToken = 'a'.repeat(65)
        const result = await consumeUnificationToken(longToken, 'fingerprint')

        expect(result).toBe(false)
        expect(mockStorage.getAndDel).not.toHaveBeenCalled()
      })

      it('should return false for exactly 63-char token', async () => {
        const result = await consumeUnificationToken('a'.repeat(63), 'fp')

        expect(result).toBe(false)
        expect(mockStorage.getAndDel).not.toHaveBeenCalled()
      })

      it('should return false for token that is not a string (number coerced)', async () => {
        // TypeScript won't allow this easily but we test runtime behavior for security
        const result = await consumeUnificationToken(12345 as unknown as string, 'fp')

        expect(result).toBe(false)
        expect(mockStorage.getAndDel).not.toHaveBeenCalled()
      })

      it('should return false for null token', async () => {
        const result = await consumeUnificationToken(null as unknown as string, 'fp')

        expect(result).toBe(false)
        expect(mockStorage.getAndDel).not.toHaveBeenCalled()
      })

      it('should return false for undefined token', async () => {
        const result = await consumeUnificationToken(undefined as unknown as string, 'fp')

        expect(result).toBe(false)
        expect(mockStorage.getAndDel).not.toHaveBeenCalled()
      })
    })

    describe('fingerprint binding', () => {
      it('should NOT validate token for wrong fingerprint', async () => {
        // Token bound to fingerprint-A should not validate for fingerprint-B
        // getAndDel returns null because key is different for fingerprint-B
        mockStorage.getAndDel.mockResolvedValue(null)

        const token = 'f'.repeat(64)
        const result = await consumeUnificationToken(token, 'fingerprint-B')

        expect(result).toBe(false)
      })

      it('should generate different keys for different fingerprints', async () => {
        mockStorage.getAndDel.mockResolvedValue('1')

        const token = 'a'.repeat(64)
        await consumeUnificationToken(token, 'fp-alpha')
        await consumeUnificationToken(token, 'fp-beta')

        const key1 = mockStorage.getAndDel.mock.calls[0][0] as string
        const key2 = mockStorage.getAndDel.mock.calls[1][0] as string

        expect(key1).not.toBe(key2)
        expect(key1).toContain('fp-alpha')
        expect(key2).toContain('fp-beta')
      })
    })

    describe('edge cases', () => {
      it('should accept token with exactly 64 hex chars', async () => {
        mockStorage.getAndDel.mockResolvedValue('1')

        const hexToken = '0123456789abcdef'.repeat(4) // exactly 64 chars
        const result = await consumeUnificationToken(hexToken, 'fp')

        expect(result).toBe(true)
      })

      it('should reject non-hex chars in token', async () => {
        mockStorage.getAndDel.mockResolvedValue('1')

        const nonHexToken = 'z'.repeat(64)
        const result = await consumeUnificationToken(nonHexToken, 'fp')

        expect(result).toBe(false)
        expect(mockStorage.getAndDel).not.toHaveBeenCalled()
      })
    })
  })

  describe('integration: generate then consume', () => {
    it('should generate a token and allow consuming it once', async () => {
      // Simulate: generate stores to redis, consume reads it back
      let storedKey: string
      mockStorage.set.mockImplementation(async (key) => {
        storedKey = key
      })
      mockStorage.getAndDel.mockImplementation(async (key) => {
        return key === storedKey ? '1' : null
      })

      const fingerprint = 'user-fp-123'
      const token = await generateUnificationToken(fingerprint)
      const result = await consumeUnificationToken(token, fingerprint)

      expect(result).toBe(true)
    })

    it('should fail consuming token for wrong fingerprint', async () => {
      let storedKey: string
      mockStorage.set.mockImplementation(async (key) => {
        storedKey = key
      })
      mockStorage.getAndDel.mockImplementation(async (key) => {
        return key === storedKey ? '1' : null
      })

      const token = await generateUnificationToken('correct-fp')
      const result = await consumeUnificationToken(token, 'wrong-fp')

      expect(result).toBe(false)
    })
  })
})
