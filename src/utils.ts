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

export function normalizeFlatValues(
  flat: Record<string, unknown>
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (v == null) {
      // out[k] = "";
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        item == null
          ? ""
          : typeof item === "string"
          ? item
          : typeof item === "number" || typeof item === "boolean"
          ? String(item)
          : JSON.stringify(item)
      );
      continue;
    }
    switch (typeof v) {
      case "string":
        out[k] = v;
        break;
      case "number":
      case "boolean":
        out[k] = String(v);
        break;
      default:
        out[k] = JSON.stringify(v);
        break;
    }
  }
  return out;
}

export function collectSkillTagsFromData(data: unknown): string[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  const skills = (data as any).skills;
  if (!Array.isArray(skills)) {
    return [];
  }

  const tags = new Set<string>();
  for (const skill of skills) {
    if (!skill) {
      continue;
    }

    let skillObj = skill;
    if (typeof skill === "string") {
      try {
        skillObj = JSON.parse(skill);
      } catch {
        continue;
      }
    }

    if (!skillObj || typeof skillObj !== "object") {
      continue;
    }

    const skillTags = Array.isArray((skillObj as any).tags)
      ? (skillObj as any).tags
      : [];

    for (const tag of skillTags) {
      if (typeof tag === "string" && tag.trim()) {
        tags.add(tag.trim());
      }
    }
  }

  return Array.from(tags);
}

// Detects common "already exists" errors returned by Intuition protocol when
// attempting to create atoms/triples that are already present on-chain.
export function isAlreadyExistsError(error: any): boolean {
  const msg = String(error?.message || error || "").toLowerCase();
  if (msg.includes("multivault_atomexists") || msg.includes("atomexists")) {
    return true;
  }

  // viem wraps revert reasons; check nested fields too
  const causeMsg = String(error?.cause?.message || "").toLowerCase();
  if (causeMsg.includes("multivault_atomexists") || causeMsg.includes("atomexists")) {
    return true;
  }
  return false;
}

function extractSkillTagsFromTriple(triple: any): string[] {
  if (!triple?.object?.data) return [];

  try {
    const parsed = JSON.parse(triple.object.data);
    if (!Array.isArray(parsed?.tags)) return [];

    return parsed.tags
      .filter((tag: unknown): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Maps atomDetails.as_subject_triples to a flat key-value object for UI display
 * - Uses predicate.data as the key (not predicate.label)
 * - Uses object.label or object.data as the value
 * - Special handling for keywords → tags array
 * - Handles multi-value fields (arrays)
 * - Handles boolean fields (from "true"/"false" strings)
 */
export function mapAtomDetailsToAgentData(atomDetails: any): Record<string, any> {
  const agentData: Record<string, any> = {};
  const tags: string[] = []; // Special handling for keywords
  const skillTags: string[] = [];

  // Fields to include in the output (whitelist)
  const fieldsToInclude = [
    "name",
    "description",
    "url",
    "version",
    "protocolVersion",
    "agent_card_url",
    "provider:organization",
    "provider:url",
  ];

  // Fields that should be arrays (multiple values expected)
  const arrayFields = [
    "authentication:schemes",
    "skills",
  ];

  // Fields that should be booleans (from "true"/"false" strings)
  const booleanFields = [
    "capabilities:stateTransitionHistory",
  ];

  if (!atomDetails?.as_subject_triples) {
    return agentData;
  }

  for (const triple of atomDetails.as_subject_triples) {
    const predicate = triple.predicate?.data || triple.predicate?.label;
    const objectLabel = triple.object?.label;
    const objectData = triple.object?.data;

    if (!predicate || objectData == null) continue;

    // Special case: keywords become "tags" array (always include)
    if (predicate === "https://schema.org/keywords") {
      const tagValue = objectLabel || objectData;
      if (tagValue && !tags.includes(tagValue)) {
        tags.push(tagValue);
      }
      continue; // Skip normal mapping for keywords
    }

    if (predicate === "skills_tags") {
      const value = (objectLabel || objectData)?.trim?.();
      if (value) {
        skillTags.push(value);
      }
      continue;
    }

    // Skip fields not in the whitelist
    if (!fieldsToInclude.includes(predicate)) {
      continue;
    }

    // Handle array fields
    if (arrayFields.includes(predicate)) {
      if (!agentData[predicate]) {
        agentData[predicate] = [];
      }

      // For skills, parse JSON string
      if (predicate === "skills") {
        const existing = Array.isArray(agentData.skills) ? agentData.skills : [];
        const tags = extractSkillTagsFromTriple(triple);
        agentData.skills = Array.from(new Set([...existing, ...tags]));
        continue;
      } else {
        // For other arrays, add if not duplicate
        const value = objectLabel || objectData;
        if (!agentData[predicate].includes(value)) {
          agentData[predicate].push(value);
        }
      }
    }
    // Handle boolean fields
    else if (booleanFields.includes(predicate)) {
      // Only set if not already set (first one wins)
      if (!(predicate in agentData)) {
        agentData[predicate] = objectData === "true";
      }
    }
    // Handle single-value fields (first one wins)
    else {
      if (!(predicate in agentData)) {
        agentData[predicate] = objectLabel || objectData;
      }
    }
  }

  // Add tags as a separate field
  agentData["tags"] = tags;
  agentData["skill_tags"] = skillTags;

  return agentData;
}

