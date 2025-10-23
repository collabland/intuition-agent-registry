import { sync } from "@0xintuition/sdk";
import { Request, Response, Router } from "express";
import { validateApiKey } from "../middleware/auth.js";
import { config, account } from "../setup.js";
import {
  IntuitionEvent,
  QuizCompletedEvent,
  validateEvent,
} from "../types/events.js";

const router = Router();

// Webhook endpoint (for external integrations)
// Protected with API key authentication
router.post(
  "/v1/intuition/events",
  validateApiKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const event = req.body as IntuitionEvent;

      // Log the incoming POST data
      console.log("========================================");
      console.log("Webhook received at:", new Date().toISOString());
      console.log("Event Type:", event.type);
      console.log("Body:", JSON.stringify(req.body, null, 2));
      console.log("========================================");

      // Validate event structure
      const validation = validateEvent(event);
      if (!validation.valid) {
        console.error("Validation failed:", validation.error);
        res.status(400).json({
          success: false,
          error: "Invalid event structure",
          message: validation.error,
        });
        return;
      }

      // Handle different event types
      switch (event.type) {
        case "quiz_completed":
          await handleQuizCompletedEvent(event);
          break;

        default:
          res.status(400).json({
            success: false,
            error: "Unknown event type",
            message: `Event type "${event.type}" is not supported`,
          });
          return;
      }

      // Send success response
      res.status(200).json({
        success: true,
        message: `Event '${event.type}' received and processed`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(500).json({
        success: false,
        error: "Webhook processing failed",
        message: error.message || "Unknown error occurred",
      });
    }
  }
);

// Handler for quiz_completed events
async function handleQuizCompletedEvent(event: QuizCompletedEvent) {
  console.log("Processing quiz_completed event:");
  console.log("  User Address:", event.userAddress);
  console.log("  Community ID:", event.communityId);
  console.log("  Quiz ID:", event.metadata.quizId);
  console.log("  Completed At:", event.metadata.completedAt);
  console.log("  Version:", event.version);

  // Transform event data into Intuition protocol format
  // Use user address as the DID
  const did = `did:eth:${event.userAddress.toLowerCase()}`;

  const syncData = {
    [did]: {
      type: "quiz_completion",
      user_address: event.userAddress,
      community_id: event.communityId,
      quiz_id: event.metadata.quizId,
      completed_at: event.metadata.completedAt,
      event_version: event.version,
    },
  };

  console.log("Syncing to blockchain...");
  console.log("  DID:", did);
  console.log("  Data:", JSON.stringify(syncData, null, 2));

  try {
    await sync(config, syncData);
    console.log("✅ Successfully synced to blockchain");
  } catch (error: any) {
    if (isAlreadyExistsError(error)) {
      console.log("ℹ️ Idempotent no-op: data already exists; treating as success");
      return;
    }
    console.error("❌ Failed to sync to blockchain:", error?.message || error);
    throw error; // Re-throw to be caught by the main handler
  }
}

export default router;

// New endpoint: POST /v1/intuition/
// Accepts any-level-deep JSON payload, flattens to one-level key/value pairs,
// and syncs under the DID derived from SIGNER (account.address)
router.post(
  "/v1/intuition/",
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

      // Flatten nested objects into a single-level key/value map.
      // Arrays are kept as-is. Nested objects inside arrays will be stringified.
      const flatData = flattenToOneLevel(payload);

      if (Object.keys(flatData).length === 0) {
        res.status(400).json({
          success: false,
          error: "Empty payload",
          message: "Provided object did not contain any usable key/value pairs",
        });
        return;
      }

      const did = `did:eth:${account.address.toLowerCase()}`;
      const normalized: Record<string, string | string[]> = normalizeFlatValues(flatData);
      const syncData: Record<string, Record<string, string | string[]>> = {
        [did]: normalized,
      };

      console.log("Syncing generic data to blockchain...");
      console.log("  DID:", did);
      console.log("  Data:", JSON.stringify(syncData, null, 2));

      try {
        await sync(config, syncData);
        res.status(200).json({
          success: true,
          message: "Data received and synced",
          did,
          keys: Object.keys(flatData).length,
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (error: any) {
        if (isAlreadyExistsError(error)) {
          res.status(200).json({
            success: true,
            message: "Idempotent no-op: data already exists",
            did,
            keys: Object.keys(flatData).length,
            timestamp: new Date().toISOString(),
          });
          return;
        }
        throw error;
      }
    } catch (error: any) {
      console.error("Generic intuition sync error:", error);
      res.status(500).json({
        success: false,
        error: "Sync failed",
        message: error.message || "Unknown error occurred",
      });
    }
  }
);

// New endpoint: POST /v1/intuition/agent
// Body: { url: string } → fetches JSON from the URL, flattens with ':' joiner,
// and syncs under the DID derived from SIGNER (account.address)
router.post(
  "/v1/intuition/agent",
  validateApiKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { url } = req.body ?? {};

      if (!url || typeof url !== "string") {
        res.status(400).json({
          success: false,
          error: "Invalid payload",
          message: "Expected JSON body: { url: string }",
        });
        return;
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

      const flatData = flattenToOneLevel(data);
      if (Object.keys(flatData).length === 0) {
        res.status(400).json({
          success: false,
          error: "Empty data",
          message: "Fetched JSON did not contain any usable key/value pairs",
        });
        return;
      }

      const did = `did:eth:${account.address.toLowerCase()}`;
      const normalized: Record<string, string | string[]> = normalizeFlatValues(flatData);
      const syncData: Record<string, Record<string, string | string[]>> = {
        [did]: normalized,
      };

      console.log("Syncing agent data from URL to blockchain...");
      console.log("  Source URL:", url);
      console.log("  DID:", did);
      console.log("  Data:", JSON.stringify(syncData, null, 2));

      try {
        await sync(config, syncData);
        res.status(200).json({
          success: true,
          message: "Agent data fetched and synced",
          did,
          keys: Object.keys(flatData).length,
          source: url,
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (error: any) {
        if (isAlreadyExistsError(error)) {
          res.status(200).json({
            success: true,
            message: "Idempotent no-op: data already exists",
            did,
            keys: Object.keys(flatData).length,
            source: url,
            timestamp: new Date().toISOString(),
          });
          return;
        }
        throw error;
      }
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

function flattenToOneLevel(
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

function normalizeFlatValues(
  flat: Record<string, unknown>
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (v == null) {
      out[k] = "";
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

// Detects common "already exists" errors returned by Intuition protocol when
// attempting to create atoms/triples that are already present on-chain.
function isAlreadyExistsError(error: any): boolean {
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
