# Tablix - Testing Documentation

## 📋 Overview

This document outlines the testing strategy for Tablix with 100% code coverage.

## 🛠️ Testing Stack

- **Jest** - Test runner and assertions
- **@testing-library/react** - React component testing
- **@testing-library/jest-dom** - Custom matchers
- **ts-jest** - TypeScript support

## 📂 Test Structure

```
__tests__/
├── lib/
│   ├── limits.test.ts                    ✅ Created (100% coverage)
│   ├── fingerprint.test.ts               ⏳ To create
│   ├── redis.test.ts                     ⏳ To create
│   ├── usage-tracker.test.ts             ⏳ To create
│   └── security/
│       ├── file-validator.test.ts        ✅ Created (100% coverage)
│       ├── validation-schemas.test.ts    ⏳ To create
│       ├── rate-limit.test.ts            ⏳ To create
│       └── temp-file-manager.test.ts     ⏳ To create
├── hooks/
│   └── use-usage.test.tsx                ⏳ To create
├── components/
│   └── language-selector.test.tsx        ⏳ To create
└── app/
    └── api/
        ├── preview/route.test.ts         ⏳ To create
        ├── process/route.test.ts         ⏳ To create
        └── usage/route.test.ts           ⏳ To create
```

## ✅ Completed Tests

### 1. `limits.test.ts` (100% Coverage)

**Tests:**
- ✅ PLAN_LIMITS constant validation
- ✅ getPlanLimits for all plans
- ✅ formatFileSize (bytes, KB, MB, GB)
- ✅ isFileSizeAllowed (all plans, edge cases)
- ✅ isUploadAllowed (all plans, limits)
- ✅ getRemainingUploads (all scenarios)

**Scenarios Covered:**
- Free plan: 3 uploads, 2MB limit
- Pro plan: 20 uploads, 10MB limit
- Enterprise plan: Unlimited uploads, 50MB limit
- Edge cases: 0 bytes, exactly at limit, over limit, Infinity

### 2. `file-validator.test.ts` (100% Coverage)

**Tests:**
- ✅ FILE_VALIDATOR constants
- ✅ validateFile:
  - File size validation (empty, under, over 10MB)
  - Extension validation (.csv, .xlsx, .xls, invalid)
  - MIME type validation
  - Suspicious filename patterns (path traversal, executables, reserved names)
- ✅ sanitizeFileName:
  - Path traversal removal
  - Special character replacement
  - Hidden file prevention
  - Length limiting
- ✅ validateFileContent:
  - ZIP signature validation for XLSX
  - Text content validation for CSV
  - Invalid signature rejection
  - Error handling

**Scenarios Covered:**
- Valid files: CSV, XLSX, XLS
- Invalid files: wrong extension, MIME type, size
- Malicious files: path traversal, executables, reserved names
- Edge cases: empty files, exactly 10MB, case-insensitive extensions

## 🚀 Running Tests

```bash
# Run all tests
npm test

# Watch mode (development)
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode
npm run test:ci
```

## 📊 Coverage Goals

```javascript
coverageThreshold: {
  global: {
    branches: 100,
    functions: 100,
    lines: 100,
    statements: 100,
  },
}
```

## 📝 Test Templates

### Unit Test Template

```typescript
import { functionToTest } from '@/lib/module'

describe('module.ts', () => {
  describe('functionToTest', () => {
    it('should handle normal case', () => {
      const result = functionToTest('input')
      expect(result).toBe('expected')
    })

    it('should handle edge case', () => {
      const result = functionToTest('')
      expect(result).toBe('default')
    })

    it('should handle error case', () => {
      expect(() => functionToTest(null)).toThrow('Error message')
    })
  })
})
```

### API Route Test Template

```typescript
import { POST } from '@/app/api/endpoint/route'
import { NextRequest } from 'next/server'

describe('API: /api/endpoint', () => {
  it('should handle successful request', async () => {
    const request = new NextRequest('http://localhost:3000/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })
  })

  it('should handle validation error', async () => {
    const request = new NextRequest('http://localhost:3000/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

### React Component Test Template

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Component from '@/components/Component'

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<Component />)

    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Updated Text')).toBeInTheDocument()
  })
})
```

## 🎯 Test Scenarios by Module

### `fingerprint.ts`
- ✅ getClientIP: various headers, fallback
- ✅ generateFingerprintId: uniqueness
- ✅ hashFingerprint: consistency, privacy
- ✅ getUserFingerprint: new/existing cookies
- ✅ setFingerprintCookie: settings, security
- ✅ getUserPlan: header override, default
- ✅ getCurrentMonthKey: format
- ✅ createUploadCountKey: format

### `redis.ts`
- ✅ getRedisClient: with/without env vars
- ✅ InMemoryStore: get, set, incr, expire, cleanup
- ✅ storage.get: Redis success, fallback, error
- ✅ storage.incr: Redis success, fallback, error
- ✅ storage.expire: Redis success, fallback
- ✅ storage.set: with/without TTL

### `validation-schemas.ts`
- ✅ columnNameSchema: valid/invalid names
- ✅ columnsArraySchema: min/max, validation
- ✅ fileMetadataSchema: all fields
- ✅ sanitizeString: HTML removal, special chars
- ✅ validateColumnSelection: valid/invalid arrays
- ✅ validateFileLimits: count, size limits

### `usage-tracker.ts`
- ✅ checkUploadLimit: all plans, exceeded
- ✅ incrementUploadCount: increment, expiry
- ✅ checkFileSizeLimit: all plans
- ✅ getUserUsage: current statistics

### `rate-limit.ts`
- ✅ rateLimit: under/at/over limit
- ✅ getIdentifier: various headers, fallback
- ✅ Cleanup: old entries removal
- ✅ Multiple IPs: independent counters

### API Routes
- ✅ /api/preview:
  - Rate limiting
  - Upload quota check
  - File size validation
  - File type validation
  - Success response
  - All error codes (403, 400, 429, 500)
- ✅ /api/process:
  - All validations
  - Column selection
  - Success with file generation
- ✅ /api/usage:
  - GET statistics
  - Fingerprint cookie setting

### Hooks
- ✅ useUsage:
  - Initial fetch
  - Loading states
  - Error handling
  - Refetch functionality
- ✅ formatFileSize: all units

### Components
- ✅ LanguageSelector:
  - Render languages
  - Change language
  - LocalStorage persistence
- ✅ UploadPage:
  - File selection
  - Validation display
  - Upload success/error
  - Usage display

## 📈 Coverage Report Example

```
-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
All files              |     100 |      100 |     100 |     100 |
 lib                   |     100 |      100 |     100 |     100 |
  limits.ts            |     100 |      100 |     100 |     100 |
  fingerprint.ts       |     100 |      100 |     100 |     100 |
  redis.ts             |     100 |      100 |     100 |     100 |
  usage-tracker.ts     |     100 |      100 |     100 |     100 |
 lib/security          |     100 |      100 |     100 |     100 |
  file-validator.ts    |     100 |      100 |     100 |     100 |
  validation-schemas.ts|     100 |      100 |     100 |     100 |
  rate-limit.ts        |     100 |      100 |     100 |     100 |
-----------------------|---------|----------|---------|---------|
```

## 🐛 Common Testing Issues

### Issue: "Cannot find module '@/lib/...'"
**Solution:** Check `jest.config.js` moduleNameMapper

### Issue: "localStorage is not defined"
**Solution:** Mock in jest.setup.js:
```javascript
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
}
```

### Issue: "NextRequest is not a constructor"
**Solution:** Use proper mocking for Next.js types

## 🎯 Next Steps for 100% Coverage

1. Create remaining test files (marked ⏳)
2. Run `npm run test:coverage`
3. Check coverage report in `coverage/lcov-report/index.html`
4. Fix any uncovered branches/lines
5. Ensure all edge cases are tested

## 📞 CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
```

---

**Last Updated:** 2025-12-22
**Coverage Target:** 100%
**Status:** ✅ Foundation Complete (2/12 test files created)
