import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";

// Import routes
import eventRoutes from "./routes/events.js";
import healthRoutes from "./routes/health.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Register routes
app.use(healthRoutes);
app.use(eventRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Agent Registry API server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
