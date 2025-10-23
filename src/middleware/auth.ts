import { NextFunction, Request, Response } from "express";

// Helper function to get all allowed API keys from environment variables
function getAllowedApiKeys(): string[] {
  const apiKeys: string[] = [];

  // Check for single API_KEY (backward compatibility)
  if (process.env.API_KEY) {
    apiKeys.push(process.env.API_KEY);
  }

  // Check for multiple API keys (API_KEY_1, API_KEY_2, etc.)
  let keyIndex = 1;
  while (process.env[`API_KEY_${keyIndex}`]) {
    apiKeys.push(process.env[`API_KEY_${keyIndex}`]!);
    keyIndex++;
  }

  // Check for comma-separated API keys in API_KEYS
  if (process.env.API_KEYS) {
    const commaSeparatedKeys = process.env.API_KEYS.split(",")
      .map((key) => key.trim())
      .filter((key) => key.length > 0);
    apiKeys.push(...commaSeparatedKeys);
  }

  // Remove duplicates
  return [...new Set(apiKeys)];
}

// API Key validation middleware
export function validateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers["x-api-key"] as string;
  const allowedApiKeys = getAllowedApiKeys();

  // Check if any API keys are configured
  if (allowedApiKeys.length === 0) {
    console.error("No API keys configured in environment variables");
    return res.status(500).json({
      success: false,
      error: "Server configuration error",
      message: "API authentication not configured",
    });
  }

  // Check if API key is provided
  if (!apiKey) {
    console.warn("Request received without API key");
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "API key is required. Please provide 'x-api-key' header",
    });
  }

  // Validate API key
  if (!allowedApiKeys.includes(apiKey)) {
    console.warn("Invalid API key attempt:", apiKey.substring(0, 8) + "...");
    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "Invalid API key",
    });
  }

  // API key is valid, proceed
  next();
}

// Optional: Multiple API keys support
export function validateApiKeyMultiple(validKeys: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "API key is required",
      });
    }

    if (!validKeys.includes(apiKey)) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "Invalid API key",
      });
    }

    next();
  };
}
