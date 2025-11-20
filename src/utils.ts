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

function normalizeERC8004(input) {
  const out = { ...input };

  // Normalize endpoints
  if (Array.isArray(out.endpoints)) {
    out.endpoints.forEach(ep => {
      if (!ep.name) return;
      const prefix = `endpoint_${ep.name}`;

      // direct values like "https://..."
      if (ep.endpoint) out[prefix] = ep.endpoint;

      // version
      if (ep.version) out[`${prefix}_version`] = ep.version;

      // if capabilities exist, store them as JSON (or break them out if desired)
      if (ep.capabilities)
        out[`${prefix}_capabilities`] = JSON.stringify(ep.capabilities);
    });

    delete out.endpoints;
  }

  // Normalize registrations
  if (Array.isArray(out.registrations)) {
    const chainIds = out.registrations
      .map(reg => {
        const parts = reg.agentRegistry?.split(":");
        return parts?.[1];  // extract chainId
      })
      .filter(Boolean); // remove undefined/null

    out.registrations = chainIds;
  }

  return out;
}

function extractERC8004Fields(input) {
  const allowed = new Set([
    "type",
    "name",
    "description",
    "image",
    "endpoints",
    "registrations"
  ]);

  return Object.fromEntries(
    Object.entries(input).filter(([key]) => allowed.has(key))
  );
};

export async function prepareERC8004ForSync(input) {
  const extracted = extractERC8004Fields(input);

  const agentCard = await fetchAgentCardFromErc8004(input);
  if (agentCard) {
    const a2aFields = extractRelevantA2AFields(agentCard);
    Object.assign(extracted, a2aFields);
  }

  const normalized = normalizeERC8004(extracted);

  const flattened = flattenToOneLevel(normalized);

  flattened['https://schema.org/keywords'] = [
    'ipfs://QmRp1abVgPBgN5dSVfRsSpUWa8gUz5PhmSJMCLCSqDpvSP', 
    'ipfs://bafkreifdd5zbyg2k26bqftkdyjox52m6yx5ncgapkbt6pu3qqcu5wsktky'
  ];

  return normalizeFlatValues(flattened);
}

/**
 * Extracts and fetches the A2A agent card JSON from ERC8004 metadata.
 * Assumes metadata has already been validated with isValidEIP8004.
 * 
 * @param metadata - Validated ERC8004 metadata object (not flattened)
 * @returns The A2A agent card JSON, or null if no A2A endpoint exists or fetch fails
 */
export async function fetchAgentCardFromErc8004(
  metadata: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const endpoints = metadata.endpoints as any[];
  
  // Find first A2A endpoint
  const a2aEndpoint = endpoints.find(
    (endpoint) => endpoint.name === "A2A" && endpoint.endpoint
  );

  if (!a2aEndpoint) {
    return null;
  }

  const a2aEndpointUrl = a2aEndpoint.endpoint;

  // Fetch the A2A agent card JSON
  try {
    const a2aAgentCard = await fetchJsonFromUri(a2aEndpointUrl);
    return a2aAgentCard;
  } catch (error) {
    return null; // Return null on fetch failure (non-blocking)
  }
}

/**
 * Extracts relevant fields from A2A agent card for syncing to Intuition.
 * 
 * @param a2aAgentCard - A2A agent card JSON object
 * @returns Object with extracted fields (skill_tags and provider:organization)
 */
export function extractRelevantA2AFields(
  a2aAgentCard: Record<string, unknown>
): {
  skill_tags: string[];
  "provider:organization"?: string;
} {
  const result: {
    skill_tags: string[];
    "provider:organization"?: string;
  } = {
    skill_tags: collectSkillTagsFromData(a2aAgentCard),
  };

  // Extract provider organization if it exists
  const provider = (a2aAgentCard as any).provider;
  if (provider && typeof provider === "object" && provider.organization) {
    result["provider_organization"] = provider.organization;
  }

  return result;
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
  const skillTags = new Set<string>();

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
    "mint_transaction_hash",
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

    if (predicate === "skill_tags") {
      const value = (objectLabel || objectData)?.trim?.();
      if (value) {
        skillTags.add(value);
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
  agentData["skillTags"] = Array.from(skillTags);

  return agentData;
}

/**
 * Extracts and validates token URI from request body.
 * Supports both raw string (text/plain) and JSON body formats.
 * 
 * @param body - Request body (can be string or object)
 * @returns The validated token URI string
 * @throws Error if token URI is missing or invalid
 */
export function extractTokenUriFromBody(body: unknown): string {
  let tokenUri: string | undefined;

  if (typeof body === "string") {
    tokenUri = body.trim();
  } else if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (typeof obj.tokenUri === "string") {
      tokenUri = obj.tokenUri.trim();
    }
  }

  if (!tokenUri) {
    throw new Error("Expected JSON body: { tokenUri: string } or raw text/plain token URI");
  }

  try {
    new URL(tokenUri);
    return tokenUri;
  } catch {
    throw new Error("Token URI must be a valid URI (https:// or ipfs://)");
  }
}

/**
 * Fetches and validates JSON from a URI (supports https:// and ipfs://).
 * Handles timeout, response validation, JSON parsing, and basic object validation.
 * 
 * @param uri - The URI to fetch JSON from
 * @param timeoutMs - Timeout in milliseconds (default: 15000)
 * @returns The validated JSON object
 * @throws Error if fetch fails, timeout occurs, or JSON is invalid
 */
export async function fetchJsonFromUri(
  uri: string,
  timeoutMs: number = 15000
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  let response: Response;
  try {
    response = await fetch(uri, {
      headers: { Accept: "application/json" },
      signal: controller.signal as AbortSignal,
    } as any);
  } catch (error: any) {
    clearTimeout(timeout);
    if (error?.name === "AbortError") {
      throw new Error(`Request to ${uri} timed out after ${timeoutMs}ms`);
    }
    throw new Error(`Failed to fetch ${uri}: ${error?.message || error}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response || !("ok" in response) || !response.ok) {
    const status = (response as any)?.status ?? 502;
    const statusText = (response as any)?.statusText ?? "Bad Gateway";
    throw new Error(`Failed to fetch ${uri}: ${status} ${statusText}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error: any) {
    throw new Error(`Expected JSON from ${uri} but could not parse: ${error?.message || error}`);
  }

  // Basic validation - ensure it's an object
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Fetched data from ${uri} is not a JSON object`);
  }

  return data as Record<string, unknown>;
}

export function isValidEIP8004(file: unknown): string | null {
  if (!file || typeof file !== "object") return null;

  const requiredFields = ["type", "name", "description", "image", "endpoints", "registrations"];
  for (const f of requiredFields) {
    if (!(f in file)) return null;
  }

  // Validate endpoints
  if (!Array.isArray((file as any).endpoints)) return null;
  if ((file as any).endpoints.length > 0 && !(file as any).endpoints.every((e: any) =>
    typeof e.name === "string" && typeof e.endpoint === "string"
  )) return null;

  // Validate registrations
  if (!Array.isArray((file as any).registrations) || (file as any).registrations.length === 0) return null;
  
  const registrations = (file as any).registrations;
  
  // Validate each registration structure AND ensure Sepolia ETH registration exists
  if (!registrations.every((r: any) =>
    typeof r.agentId === "number" && 
    typeof r.agentRegistry === "string" &&
    r.agentRegistry.trim().length > 0
  )) return null;
  
  const sepoliaChainId = 11155111;
  const expectedContractAddress = process.env.AGENT_IDENTITY_CONTRACT_ADDRESS!;

  // Ensure at least one Sepolia ETH registration exists
  const expectedAgentRegistry = `eip155:${sepoliaChainId}:${expectedContractAddress}`;
  const sepoliaRegistration = registrations.find((r: any) =>
    r.agentRegistry?.toLowerCase() === expectedAgentRegistry.toLowerCase()
  );

  if (!sepoliaRegistration || typeof sepoliaRegistration !== "object") return null;

  const reg = sepoliaRegistration as { agentId: number; agentRegistry: string };
  const tokenId = String(reg.agentId);

  // Format: chainId:contractAddress:tokenId
  const nftId = `${sepoliaChainId}:${expectedContractAddress}:${tokenId}`;
  return nftId;
}
