import { type NextRequest, NextResponse } from "next/server"
import { rateLimiters } from "@/lib/security/rate-limit"
import { sanitizeFileName } from "@/lib/security/file-validator"
import { validateFileLimits, validateColumnSelection, sanitizeString } from "@/lib/security/validation-schemas"

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_COLUMNS = 50

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.process.check(request)

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

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const columnsJson = formData.get("columns") as string

    // Validate file count and size
    const fileLimitValidation = validateFileLimits(files, MAX_FILES, MAX_FILE_SIZE)
    if (!fileLimitValidation.valid) {
      return NextResponse.json({ error: fileLimitValidation.error }, { status: 400 })
    }

    // Validate and parse columns JSON
    let selectedColumns: string[]
    try {
      const parsedColumns = JSON.parse(columnsJson)
      const columnValidation = validateColumnSelection(parsedColumns)

      if (!columnValidation.valid) {
        return NextResponse.json({ error: columnValidation.error }, { status: 400 })
      }

      selectedColumns = columnValidation.data!
    } catch (error) {
      return NextResponse.json({ error: "Invalid columns format" }, { status: 400 })
    }

    // Additional column limit check
    if (selectedColumns.length > MAX_COLUMNS) {
      return NextResponse.json({ error: `Too many columns selected (max ${MAX_COLUMNS})` }, { status: 400 })
    }

    // Validate file types
    const allowedTypes = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: `Invalid file type: ${file.name}` }, { status: 400 })
      }

      // Sanitize file name
      const sanitizedName = sanitizeFileName(file.name)
      if (sanitizedName !== file.name) {
        console.warn(`File name sanitized: ${file.name} -> ${sanitizedName}`)
      }
    }

    // TODO: Implement actual file processing logic
    // For now, simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Create example response file
    const content = `File processed successfully.\nSelected columns: ${selectedColumns.join(", ")}`
    const blob = new Blob([content], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

    // Sanitize output filename
    const outputFileName = sanitizeString("tablix-output.xlsx")

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${outputFileName}"`,
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    })
  } catch (error) {
    console.error("Process API error:", error)
    return NextResponse.json({ error: "Error processing files" }, { status: 500 })
  }
}
