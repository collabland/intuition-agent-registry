import { sync } from '@0xintuition/sdk'
import { config } from './setup'

function flattenToOneLevel(
  input: unknown,
  parentKey = '',
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const newKey = parentKey ? `${parentKey}:${key}` : key
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          // Preserve arrays; if they contain objects, stringify them to keep one-level structure
          result[newKey] = value.map((v) =>
            v && typeof v === 'object' ? JSON.stringify(v) : v
          )
        } else {
          flattenToOneLevel(value, newKey, result)
        }
      } else {
        result[newKey] = value
      }
    }
  }
  return result
}

async function main() {
  const url = process.argv[2]
  if (!url) {
    throw new Error('Usage: tsx src/upload.ts <url>')
  }

  console.log(`Fetching JSON from ${url}...`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
  }
  const payload = await response.json()

  const flattened = flattenToOneLevel(payload)

  // Normalize to Record<string, string | string[]>
  const normalized: Record<string, string | string[]> = {}
  for (const [k, v] of Object.entries(flattened)) {
    if (Array.isArray(v)) {
      normalized[k] = v.map((item) =>
        typeof item === 'string' ? item : String(item)
      )
    } else if (typeof v === 'string') {
      normalized[k] = v
    } else if (v !== undefined) {
      normalized[k] = String(v)
    }
  }

  // Posts Agent card with predicate "has tag" and object "AI Agent"
  normalized["https://schema.org/keywords"] = ["ipfs://QmRp1abVgPBgN5dSVfRsSpUWa8gUz5PhmSJMCLCSqDpvSP", "ipfs://bafkreifdd5zbyg2k26bqftkdyjox52m6yx5ncgapkbt6pu3qqcu5wsktky"]

  const data: Record<string, Record<string, string | string[]>> = {
    [`${payload.name}`]: normalized,
  }

  console.log('Syncing data...')
  await sync(config, data)
  console.log('Done.')
}

main().catch((e) => console.error(e))


