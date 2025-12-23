import { type NextRequest, NextResponse } from "next/server"
import { rateLimiters } from "@/lib/security/rate-limit"
import { sanitizeFileName } from "@/lib/security/file-validator"
import { validateFileLimits } from "@/lib/security/validation-schemas"
import { checkUploadLimit, incrementUploadCount, checkFileSizeLimit } from "@/lib/usage-tracker"
import { getUserFingerprint, setFingerprintCookie, getUserPlan } from "@/lib/fingerprint"

const MAX_FILES = 1 // Only 1 file per upload

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (anti-DDoS protection)
    const rateLimitResult = await rateLimiters.upload.check(request)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60",
          },
        }
      )
    }

    // Get user fingerprint and plan
    const { isNew, cookieId } = getUserFingerprint(request)
    const plan = getUserPlan(request)

    // Check upload limit (monthly quota)
    const uploadCheck = await checkUploadLimit(request)

    if (!uploadCheck.allowed) {
      const response = NextResponse.json(
        {
          error: uploadCheck.error,
          errorCode: uploadCheck.errorCode,
          usage: {
            current: uploadCheck.currentUploads,
            max: uploadCheck.maxUploads,
            remaining: uploadCheck.remainingUploads,
          },
        },
        { status: 403 }
      )

      // Set cookie even on error to track user
      if (isNew) {
        setFingerprintCookie(response, cookieId)
      }

      return response
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    // Validate file count (only 1 file allowed)
    if (files.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: "Only 1 file allowed per upload" }, { status: 400 })
    }

    const file = files[0]

    // Check file size against plan limit
    const fileSizeCheck = checkFileSizeLimit(file.size, plan)

    if (!fileSizeCheck.allowed) {
      return NextResponse.json(
        {
          error: fileSizeCheck.error,
          errorCode: fileSizeCheck.errorCode,
          maxSize: fileSizeCheck.maxSize,
        },
        { status: 403 }
      )
    }

    // Validate file types
    const allowedTypes = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type. Only CSV and XLSX files are allowed.` }, { status: 400 })
    }

    // Validate file extension
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return NextResponse.json({ error: `Invalid file extension. Only .csv and .xlsx files are allowed.` }, { status: 400 })
    }

    // Sanitize file name
    const sanitizedName = sanitizeFileName(file.name)
    if (sanitizedName !== file.name) {
      console.warn(`File name sanitized: ${file.name} -> ${sanitizedName}`)
    }

    // TODO: Implement actual file parsing logic
    // For now, simulate column detection
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Example columns - replace with actual parsing logic
    const columns = [
      "ID",
      "Nome",
      "Email",
      "Telefone",
      "Endereço",
      "Cidade",
      "Estado",
      "CEP",
      "Data de Cadastro",
      "Status",
    ]

    // ✅ INCREMENT UPLOAD COUNTER (only after successful validation)
    const newUploadCount = await incrementUploadCount(request)
    console.log(`[Upload] User uploaded file. New count: ${newUploadCount}/${uploadCheck.maxUploads}`)

    // Create response with usage info
    const response = NextResponse.json(
      {
        columns,
        usage: {
          current: newUploadCount,
          max: uploadCheck.maxUploads,
          remaining: uploadCheck.maxUploads - newUploadCount,
        },
      },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    )

    // Set fingerprint cookie if new user
    if (isNew) {
      setFingerprintCookie(response, cookieId)
    }

    return response
  } catch (error) {
    console.error("Preview API error:", error)
    return NextResponse.json({ error: "Error processing file" }, { status: 500 })
  }
}
