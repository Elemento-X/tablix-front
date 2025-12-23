# Tablix - Security Documentation

This document outlines the security measures implemented in the Tablix application.

## Table of Contents
1. [Security Headers](#security-headers)
2. [Rate Limiting](#rate-limiting)
3. [File Upload Validation](#file-upload-validation)
4. [Input Sanitization](#input-sanitization)
5. [API Security](#api-security)
6. [Temporary File Management](#temporary-file-management)

---

## Security Headers

**File:** `middleware.ts`

The application implements comprehensive security headers via Next.js middleware:

### Headers Implemented:
- **Strict-Transport-Security (HSTS):** Forces HTTPS connections for 2 years
- **X-Frame-Options:** Prevents clickjacking attacks (SAMEORIGIN)
- **X-Content-Type-Options:** Prevents MIME sniffing (nosniff)
- **Referrer-Policy:** Controls referrer information (strict-origin-when-cross-origin)
- **X-XSS-Protection:** Browser-level XSS protection
- **Content-Security-Policy (CSP):** Restricts resource loading to trusted sources
- **Permissions-Policy:** Disables unnecessary browser features (camera, microphone, geolocation)

---

## Rate Limiting

**File:** `lib/security/rate-limit.ts`

In-memory rate limiting to prevent abuse:

### Configurations:
- **Upload API:** 10 requests per minute per IP
- **Process API:** 30 requests per minute per IP
- **General API:** 100 requests per minute per IP

### Features:
- IP-based identification (supports X-Forwarded-For, X-Real-IP, CF-Connecting-IP)
- Automatic cleanup of expired entries
- Rate limit headers in responses (X-RateLimit-Remaining)
- HTTP 429 status code with Retry-After header

---

## File Upload Validation

**File:** `lib/security/file-validator.ts`

Multi-layer file validation system:

### Client-Side Validation:
1. **File Type Check:**
   - Allowed extensions: `.csv`, `.xls`, `.xlsx`
   - Allowed MIME types: `text/csv`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

2. **File Size Check:**
   - Maximum: 10MB per file
   - Minimum: Must not be empty

3. **File Name Validation:**
   - No path traversal attempts (`..`)
   - No suspicious patterns (executable extensions, special characters)
   - No Windows reserved names (CON, PRN, AUX, etc.)

4. **File Content Validation:**
   - Magic number verification (file signature)
   - Checks XLSX files for valid ZIP structure
   - Checks CSV files for text content
   - Prevents zip bomb attacks (compression ratio check)

### Sanitization:
- Removes path traversal attempts
- Replaces special characters with underscores
- Prevents hidden files (starting with `.`)
- Limits filename length to 255 characters

---

## Input Sanitization

**File:** `lib/security/validation-schemas.ts`

Zod-based validation schemas with sanitization:

### Column Name Validation:
- Length: 1-255 characters
- Pattern: Alphanumeric, spaces, underscores, hyphens, and accented characters only
- Maximum columns: 50

### String Sanitization:
- Removes HTML tags (`<>`)
- Filters non-printable characters
- Preserves accented characters (À-ÿ)
- Trims whitespace

### File Metadata Validation:
- Validates file name format
- Checks file size constraints
- Verifies MIME type

---

## API Security

### `/api/preview` Route
**Features:**
- Rate limiting (10 req/min)
- File count validation (max 5 files)
- File size validation (max 10MB each)
- File type validation
- File name sanitization
- Error logging

### `/api/process` Route
**Features:**
- Rate limiting (30 req/min)
- File count and size validation
- Column selection validation (Zod schema)
- Maximum column limit (50 columns)
- Input sanitization for selected columns
- File type validation
- Safe filename generation for downloads
- Error logging

### Common Security Practices:
- Try-catch error handling
- No sensitive data in error messages
- Rate limit headers in responses
- Detailed server-side logging
- Input validation before processing

---

## Temporary File Management

**File:** `lib/security/temp-file-manager.ts`

System for tracking and cleaning temporary files:

### Features:
- File registration with TTL (default: 5 minutes)
- Automatic cleanup every minute
- Manual cleanup triggers
- File ID generation (timestamp + random)
- Path traversal prevention
- Statistics tracking

### Usage:
```typescript
import { tempFileManager, generateFileId } from "@/lib/security"

// Register a file
const fileId = generateFileId()
tempFileManager.register(fileId, filePath, 300000) // 5 min TTL

// Mark for immediate cleanup
tempFileManager.markForCleanup(fileId)
```

---

## Additional Security Measures

### 1. **No Database = No Data Breach**
- All processing is done in-memory or with temporary files
- No user data persistence
- Files are discarded after processing

### 2. **Client-Side Validation**
- Real-time file validation before upload
- User-friendly error messages
- Prevents unnecessary API calls

### 3. **CORS Protection**
- Next.js default CORS settings
- Same-origin policy enforced

### 4. **TypeScript Type Safety**
- Compile-time type checking
- Prevents type-related vulnerabilities

### 5. **Dependency Management**
- Regular updates via npm/pnpm
- Audit for vulnerabilities

---

## Security Checklist for Production

Before deploying to production, ensure:

- [ ] Environment variables are properly secured
- [ ] HTTPS is enforced (provided by hosting platform)
- [ ] Rate limiting thresholds are appropriate for expected traffic
- [ ] File upload limits match server capabilities
- [ ] Error messages don't leak sensitive information
- [ ] Logging is configured (but doesn't log sensitive data)
- [ ] Content Security Policy is properly configured for third-party services
- [ ] Dependencies are up to date
- [ ] Security headers are verified (use securityheaders.com)
- [ ] File cleanup runs regularly to prevent disk space issues

---

## Reporting Security Issues

If you discover a security vulnerability, please contact the development team immediately. Do not open a public issue.

---

## Future Security Enhancements

Potential improvements for future versions:

1. **Advanced Rate Limiting:** Redis-based rate limiting for distributed systems
2. **Virus Scanning:** Integration with ClamAV or similar for file scanning
3. **File Encryption:** Encrypt files in transit and at rest
4. **Audit Logging:** Detailed logging of all file operations
5. **WAF Integration:** Web Application Firewall for additional protection
6. **DDoS Protection:** Cloudflare or similar service
7. **Security Monitoring:** Integration with security monitoring services
8. **Automated Security Scanning:** Regular vulnerability scans

---

**Last Updated:** 2025-12-22
**Version:** 1.0.0
