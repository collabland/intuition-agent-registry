export function flattenToOneLevel(
  input: unknown,
  parentKey = "",
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const newKey = parentKey ? `${parentKey}:${key}` : key;
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          // Preserve arrays; if they contain objects, stringify them to keep one-level structure
          result[newKey] = value.map((v) =>
            v && typeof v === "object" ? JSON.stringify(v) : v
          );
        } else {
          flattenToOneLevel(value, newKey, result);
        }
      } else {
        result[newKey] = value;
      }
    }
  }
  return result;
}

