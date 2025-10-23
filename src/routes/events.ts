import { sync } from "@0xintuition/sdk";
import { Request, Response, Router } from "express";
import { validateApiKey } from "../middleware/auth.js";
import { config } from "../setup.js";
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
        return res.status(400).json({
          success: false,
          error: "Invalid event structure",
          message: validation.error,
        });
      }

      // Handle different event types
      switch (event.type) {
        case "quiz_completed":
          await handleQuizCompletedEvent(event);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: "Unknown event type",
            message: `Event type "${event.type}" is not supported`,
          });
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
    console.error("❌ Failed to sync to blockchain:", error.message);
    throw error; // Re-throw to be caught by the main handler
  }
}

export default router;
