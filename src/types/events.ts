// Event types for Intuition webhook events

export interface QuizCompletedEvent {
  type: "quiz_completed";
  userAddress: string;
  communityId: string;
  metadata: {
    quizId: string;
    completedAt: string;
  };
  version: string;
}

// Union type for all possible event types (can add more later)
export type IntuitionEvent = QuizCompletedEvent;

// Type guard to check if the event is valid
export function isQuizCompletedEvent(event: any): event is QuizCompletedEvent {
  return (
    event &&
    typeof event === "object" &&
    event.type === "quiz_completed" &&
    typeof event.userAddress === "string" &&
    typeof event.communityId === "string" &&
    event.metadata &&
    typeof event.metadata.quizId === "string" &&
    typeof event.metadata.completedAt === "string" &&
    typeof event.version === "string"
  );
}

// Validate event structure
export function validateEvent(event: any): {
  valid: boolean;
  error?: string;
} {
  if (!event || typeof event !== "object") {
    return { valid: false, error: "Event must be an object" };
  }

  if (!event.type) {
    return { valid: false, error: "Missing 'type' field" };
  }

  switch (event.type) {
    case "quiz_completed":
      if (!isQuizCompletedEvent(event)) {
        return {
          valid: false,
          error: "Invalid quiz_completed event structure",
        };
      }
      return { valid: true };

    default:
      return {
        valid: false,
        error: `Unknown event type: ${event.type}`,
      };
  }
}
