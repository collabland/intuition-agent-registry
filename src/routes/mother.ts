import { getAtomDetails, globalSearch, search, sync } from "@0xintuition/sdk";
import { Request, Response, Router, text } from "express";
import { validateApiKey } from "../middleware/auth.js";
import { account, intuitionConfig } from "../setup.js";
import {
  isAlreadyExistsError,
  mapAtomDetailsToAgentData,
  extractTokenUriFromBody,
  fetchJsonFromUri,
  isValidEIP8004,
  prepareERC8004ForSync,
} from "../utils.js";
import { isNftIdentifier } from "../services/nft.js";

const router = Router();

router.post(
  "/v1/mother/erc8004",
  text({ type: "text/plain" }),
  validateApiKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tokenUri = extractTokenUriFromBody(req.body);

      const metadata = await fetchJsonFromUri(tokenUri);
      const nftId = isValidEIP8004(metadata);
      
      if (!nftId) {
        res.status(400).json({
          success: false,
          error: "Invalid ERC-8004 identity card",
          message: "Metadata does not match ERC8004 specification"
        });
        return;
      }

      const prepared = await prepareERC8004ForSync(metadata);

      // Construct sync data with NFT ID as subject
      const syncData: Record<string, Record<string, string | string[]>> = {
        [nftId]: prepared,
      };

      try {
        await sync(intuitionConfig, syncData);
        res.status(200).json({
          success: true,
          message: "ERC8004 identity card processed and synced",
          nftId,
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (error: any) {
        if (isAlreadyExistsError(error)) {
          res.status(200).json({
            success: true,
            message: "ERC8004 identity card already synced",
            nftId,
            timestamp: new Date().toISOString(),
          });
          return;
        }
        throw error;
      }
    } catch (error: any) {
      const aborted = error?.name === "AbortError";
      console.error("ERC8004 identity card fetch error:", error);

      res.status(aborted ? 504: 500).json({
        success: false,
        error: aborted ? "Upstream timeout" : "Sync failed",
        message: error.message || "Unknown error occurred"
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