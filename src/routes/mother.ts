import { getAtomDetails, globalSearch, search, sync } from "@0xintuition/sdk";
import { Request, Response, Router, text } from "express";
import { validateApiKey } from "../middleware/auth.js";
import { account, intuitionConfig } from "../setup.js";
import {
  flattenToOneLevel,
  normalizeFlatValues,
  isAlreadyExistsError,
  mapAtomDetailsToAgentData,
  collectSkillTagsFromData,
} from "../utils.js";
import { checkUrlExists, mintAgentIdentity, isNftIdentifier } from "../services/nft.js";

const router = Router();

type ProcessAgentOptions = {
  agentCardUrl?: string;
};

async function processAgentPayload(
  payload: Record<string, unknown>,
  options: ProcessAgentOptions = {}
): Promise<{ nftId: string; mintTransaction: string | null; timestamp: string }> {
  const flatData = flattenToOneLevel(payload);
  flatData.skill_tags = collectSkillTagsFromData(payload);

  if (Object.keys(flatData).length === 0) {
    throw new Error("Provided JSON object did not contain any usable key/value pairs");
  }

  const normalized: Record<string, string | string[]> = normalizeFlatValues(flatData);

  const agentCardUrl = options.agentCardUrl;
  if (agentCardUrl) {
    normalized["agent_card_url"] = agentCardUrl;
  } else {
    delete normalized["agent_card_url"];
  }

  normalized["https://schema.org/keywords"] = [
    "ipfs://QmRp1abVgPBgN5dSVfRsSpUWa8gUz5PhmSJMCLCSqDpvSP",
    "ipfs://bafkreifdd5zbyg2k26bqftkdyjox52m6yx5ncgapkbt6pu3qqcu5wsktky",
  ];

  let nftId: string;
  let mintTransactionHash: string | undefined;

  if (agentCardUrl) {
    const urlCheck = await checkUrlExists(agentCardUrl);
    if (urlCheck.exists && urlCheck.nftId) {
      nftId = urlCheck.nftId;
      console.log("NFT ID already exists for provided agent_card_url:", nftId);
    } else {
      console.log(`Minting new NFT for agent_card_url: ${agentCardUrl}`);
      const mintResult = await mintAgentIdentity(agentCardUrl);
      nftId = mintResult.nftId;
      mintTransactionHash = mintResult.transactionHash;
      console.log("New NFT minted:", nftId);
    }
  } else {
    console.log("Minting new NFT for raw JSON submission without agent_card_url");
    const mintResult = await mintAgentIdentity("raw-json");
    nftId = mintResult.nftId;
    mintTransactionHash = mintResult.transactionHash;
    console.log("New NFT minted:", nftId);
  }

  if (mintTransactionHash) {
    normalized["mint_transaction_hash"] = mintTransactionHash;
  }

  const syncData: Record<string, Record<string, string | string[]>> = {
    [nftId]: normalized,
  };

  console.log("Syncing agent data to blockchain...");
  console.log("  NFT ID (subject):", nftId);

  try {
    await sync(intuitionConfig, syncData);
    return {
      nftId,
      mintTransaction: mintTransactionHash ?? null,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    if (isAlreadyExistsError(error)) {
      return {
        nftId,
        mintTransaction: null,
        timestamp: new Date().toISOString(),
      };
    }
    throw error;
  }
}

// POST /v1/mother - Accept raw JSON payloads, mint an NFT, and sync to Intuition
router.post(
  "/v1/mother",
  validateApiKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = req.body as unknown;

      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        res.status(400).json({
          success: false,
          error: "Invalid payload",
          message: "Expected a JSON object with key/value pairs",
        });
        return;
      }

      const result = await processAgentPayload(payload as Record<string, unknown>);

      res.status(200).json({
        success: true,
        message: "Agent data received and synced",
        ...result,
      });
      return;
    } catch (error: any) {
      console.error("Raw JSON agent sync error:", error);
      res.status(500).json({
        success: false,
        error: "Sync failed",
        message: error?.message || "Unknown error occurred",
      });
    }
  }
);

// New endpoint: POST /v1/mother/agent
// Body: { url: string } → fetches JSON from the URL, flattens with ':' joiner,
// and syncs under the DID derived from SIGNER (account.address)
router.post(
  "/v1/mother/agent",
  // Allow raw string bodies (text/plain) for direct URL payloads
  text({ type: "text/plain" }),
  validateApiKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      let url: string | undefined;
      if (typeof (req.body as any) === "string") {
        const candidate = (req.body as string).trim();
        try {
          // Validate URL format
          // eslint-disable-next-line no-new
          new URL(candidate);
          url = candidate;
        } catch {
          res.status(400).json({
            success: false,
            error: "Invalid URL",
            message: "When sending a raw string body, it must be a valid URL",
          });
          return;
        }
      } else {
        const body = (req.body as any) ?? {};
        url = typeof body?.url === "string" ? body.url : undefined;
        if (!url) {
          res.status(400).json({
            success: false,
            error: "Invalid payload",
            message: "Expected JSON body: { url: string } or raw text/plain URL",
          });
          return;
        }
      }

      // Fetch JSON from the provided URL with a simple timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      let response;
      try {
        response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal as AbortSignal,
        } as any);
      } finally {
        clearTimeout(timeout);
      }

      if (!response || !("ok" in response) || !(response as any).ok) {
        const status = (response as any)?.status ?? 502;
        const statusText = (response as any)?.statusText ?? "Bad Gateway";
        res.status(502).json({
          success: false,
          error: "Upstream fetch failed",
          message: `Failed to fetch ${url}: ${status} ${statusText}`,
        });
        return;
      }

      // Try to parse JSON regardless of content-type; surface parse errors cleanly
      let data: unknown;
      try {
        data = await (response as any).json();
      } catch (e: any) {
        res.status(415).json({
          success: false,
          error: "Invalid upstream content",
          message: `Expected JSON from URL but could not parse: ${e?.message || e}`,
        });
        return;
      }

      if (!data || typeof data !== "object") {
        res.status(415).json({
          success: false,
          error: "Unsupported upstream data",
          message: "Fetched payload is not a JSON object",
        });
        return;
      }

      const result = await processAgentPayload(data as Record<string, unknown>, {
        agentCardUrl: url,
      });

      res.status(200).json({
        success: true,
        message: "Agent data fetched and synced",
        ...result,
      });
      return;
    } catch (error: any) {
      const aborted = error?.name === "AbortError";
      console.error("Agent URL sync error:", error);

      res.status(aborted ? 504 : 500).json({
        success: false,
        error: aborted ? "Upstream timeout" : "Sync failed",
        message: error.message || "Unknown error occurred",
      });
    }
  }
);

// GET /v1/mother/agents - Get all Mother-registered agents
// Query params: ?page=1&limit=20 (optional - if not provided, returns all agents)
router.get(
  "/v1/mother/agents",
  validateApiKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Parse pagination parameters
      // Only paginate if page or limit are explicitly provided
      const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
      const page = hasPagination ? Math.max(1, parseInt(req.query.page as string) || 1) : 1;
      const limit = hasPagination 
        ? Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20))
        : Number.MAX_SAFE_INTEGER; // No limit if pagination not requested
      const offset = hasPagination ? (page - 1) * limit : 0;

      // Search for agents tagged with Mother Open Registry keyword
      const result = await search(
        [
          { "https://schema.org/keywords": "ipfs://bafkreifdd5zbyg2k26bqftkdyjox52m6yx5ncgapkbt6pu3qqcu5wsktky" }
        ],
        [account.address]
      );

      // Transform results to include nftId for each agent
      // NOTE: Maybe update to use validateNftIdentifier instead of isNftIdentifier
      const allAgents = Object.entries(result)
        .filter(([subject]) => isNftIdentifier(subject))
        .map(([nftId, data]) => {        
          return {
            nftId,
            ...data,
          };
        });

      // Calculate pagination metadata
      const total = allAgents.length;
      const totalPages = hasPagination ? Math.ceil(total / limit) : 1;

      // Only slice if pagination was requested
      const paginatedAgents = hasPagination 
        ? allAgents.slice(offset, offset + limit)
        : allAgents;

      res.status(200).json({
        success: true,
        count: paginatedAgents.length,
        total,
        ...(hasPagination ? { page, limit, totalPages } : {}), // Only include pagination metadata if pagination was used
        agents: paginatedAgents,
      });
    } catch (error: any) {
      console.error("Get agents error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch agents",
        message: error?.message || "Unknown error",
      });
    }
  }
);

// GET /v1/mother/agent/:nftId - Get agent details by NFT ID (subject)
router.get(
  "/v1/mother/agent/:nftId",
  validateApiKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const nftId = req.params.nftId; // NFT ID (subject)

      // Step 1: Get term_id from NFT ID using globalSearch
      const searchResult = await globalSearch(nftId, {
        atomsLimit: 1,
        triplesLimit: 0, // Don't need triples here
      });

      if (!searchResult?.atoms?.[0]) {
        res.status(404).json({
          success: false,
          error: "Agent not found",
          message: `No atom found with subject: ${nftId}`,
        });
        return;
      }

      const termId = searchResult.atoms[0].term_id;

      // Step 2: Get atom details using term_id
      const atomDetails = await getAtomDetails(termId);

      if (!atomDetails) {
        res.status(404).json({
          success: false,
          error: "Agent not found",
          message: `No atom details found for term_id: ${termId}`,
        });
        return;
      }
      console.dir(atomDetails, { depth: null });
      // Step 3: Map atomDetails.as_subject_triples to flat key-value object for UI
      const agentData = mapAtomDetailsToAgentData(atomDetails);

      res.status(200).json({
        success: true,
        nftId,
        agent: agentData,
      });
    } catch (error: any) {
      console.error("Get agent details error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch agent details",
        message: error?.message || "Unknown error",
      });
    }
  }
);

export default router;