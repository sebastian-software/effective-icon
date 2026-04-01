import { readFile } from "node:fs/promises"
import path from "node:path"

const DEFAULT_API_BASE_URL = "https://public-api.streamlinehq.com"

export interface BuilderConfig {
  apiBaseUrl: string
  apiKey: string
}

export async function loadBuilderConfig(rootDir: string): Promise<BuilderConfig> {
  const fileEnv = await loadEnvFiles(rootDir)
  const merged = {
    ...fileEnv,
    ...process.env,
  }

  const apiKey = merged.STREAMLINE_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      'Missing STREAMLINE_API_KEY. Define it in the shell environment or in ".env.local" / ".env" at the workspace root.'
    )
  }

  return {
    apiBaseUrl: normalizeBaseUrl(merged.STREAMLINE_API_BASE_URL ?? DEFAULT_API_BASE_URL),
    apiKey,
  }
}

async function loadEnvFiles(rootDir: string): Promise<Record<string, string>> {
  const files = [".env", ".env.local"]
  const values: Record<string, string> = {}

  for (const fileName of files) {
    const filePath = path.join(rootDir, fileName)

    try {
      const content = await readFile(filePath, "utf8")
      Object.assign(values, parseEnv(content))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error
      }
    }
  }

  return values
}

function parseEnv(input: string): Record<string, string> {
  const values: Record<string, string> = {}

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) {
      continue
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) {
      continue
    }

    const [, key, rawValue] = match
    values[key] = stripQuotes(rawValue.trim())
  }

  return values
}

function stripQuotes(input: string): string {
  if (
    (input.startsWith('"') && input.endsWith('"')) ||
    (input.startsWith("'") && input.endsWith("'"))
  ) {
    return input.slice(1, -1)
  }

  return input
}

function normalizeBaseUrl(input: string): string {
  return input.replace(/\/+$/, "")
}
