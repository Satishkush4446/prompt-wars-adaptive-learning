import type { LearnerState } from "../state/learnerTypes";
import { initialLearnerState } from "../state/initialState";

const STORAGE_KEY = "adaptive-learning-state-v2";

const VALID_PHASES = new Set([
  "welcome",
  "timePreference",
  "intro",
  "learningModeSelection",
  "initialLearningContent",
  "practice",
  "recoveryDiagnosis",
  "recoverySelection",
  "recoveryContent",
  "retest",
  "mission",
  "missionResult",
  "nextAction"
]);

function isValidLearnerState(data: any): data is LearnerState {
  if (!data || typeof data !== "object") return false;

  // 1. Verify phase
  if (typeof data.phase !== "string" || !VALID_PHASES.has(data.phase)) {
    return false;
  }

  // 2. Verify currentConcept
  if (typeof data.currentConcept !== "string") {
    return false;
  }

  // 3. Verify concepts object structure
  if (!data.concepts || typeof data.concepts !== "object") {
    return false;
  }
  for (const [key, concept] of Object.entries(data.concepts)) {
    if (!concept || typeof concept !== "object") return false;
    const c = concept as any;
    if (c.id !== key) return false;
    if (typeof c.name !== "string") return false;
    if (typeof c.description !== "string") return false;
    if (typeof c.mastery !== "number") return false;
    if (typeof c.attempts !== "number") return false;
    if (typeof c.correctAttempts !== "number") return false;
    if (typeof c.incorrectAttempts !== "number") return false;
    if (c.recentOutcome !== null && c.recentOutcome !== "correct" && c.recentOutcome !== "incorrect") {
      return false;
    }
  }

  // 4. Verify attempts array
  if (!Array.isArray(data.attempts)) {
    return false;
  }
  for (const attempt of data.attempts) {
    if (!attempt || typeof attempt !== "object") return false;
    if (typeof attempt.id !== "string") return false;
    if (typeof attempt.questionId !== "string") return false;
    if (typeof attempt.concept !== "string") return false;
    if (typeof attempt.answer !== "string") return false;
    if (typeof attempt.correct !== "boolean") return false;
    if (typeof attempt.timestamp !== "number") return false;
  }

  // 5. Verify accessibility preferences
  if (!data.accessibility || typeof data.accessibility !== "object") {
    return false;
  }
  const acc = data.accessibility;
  if (
    typeof acc.largeText !== "boolean" ||
    typeof acc.highContrast !== "boolean" ||
    typeof acc.reducedMotion !== "boolean" ||
    typeof acc.enhancedFocus !== "boolean"
  ) {
    return false;
  }

  // 6. Verify other basic structure types
  if (typeof data.consecutiveFailures !== "number") return false;
  if (!data.recovery || typeof data.recovery !== "object") return false;
  if (!data.mission || typeof data.mission !== "object") return false;
  
  if (typeof data.topicInput !== "string") return false;
  if (typeof data.lessonStatus !== "string") return false;
  if (data.lesson !== null && typeof data.lesson !== "object") return false;

  // 7. Verify time preference
  if (data.learningDurationMinutes !== null && ![5, 10, 20, 30].includes(data.learningDurationMinutes)) {
    return false;
  }

  // 8. Verify initial learning mode preference
  if (data.initialLearningMode !== null && !["text", "story", "visual", "memory"].includes(data.initialLearningMode)) {
    return false;
  }

  return true;
}

export function saveLearnerState(state: LearnerState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error("Failed to save learner state to localStorage:", error);
  }
}

export function loadLearnerState(): LearnerState {
  try {
    // Graceful migration fallback: check and clear version 1 if present
    if (localStorage.getItem("adaptive-learning-state-v1")) {
      localStorage.removeItem("adaptive-learning-state-v1");
    }

    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return initialLearnerState;
    }
    const parsed = JSON.parse(serialized);
    if (isValidLearnerState(parsed)) {
      return parsed;
    } else {
      console.warn("Invalid learner state loaded from localStorage. Resetting to initial state.");
      return initialLearnerState;
    }
  } catch (error) {
    console.error("Failed to parse learner state from localStorage. Resetting to initial state:", error);
    return initialLearnerState;
  }
}

export function clearLearnerState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear learner state from localStorage:", error);
  }
}
