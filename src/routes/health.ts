import { Request, Response, Router } from "express";
import { account } from "../setup.js";

const router = Router();

// Health check endpoint for Heroku
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    account: account.address,
  });
});

// Root endpoint
router.get("/", (req: Request, res: Response) => {
  res.json({
    name: "Agent Registry API",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      webhook: "POST /v1/intuition/events",
    },
  });
});

export default router;
