import type { LearnerState, ConceptId } from "../state/learnerTypes";
import { initialLearnerState } from "../state/initialState";

const STORAGE_KEY = "adaptive-learning-state-v1";

const VALID_PHASES = new Set([
  "welcome",
  "intro",
  "practice",
  "recoveryDiagnosis",
  "recoverySelection",
  "recoveryContent",
  "retest",
  "mission",
  "missionResult",
  "nextAction"
]);

const VALID_CONCEPTS = new Set<ConceptId>([
  "parameters",
  "returnValues",
  "functionCalls"
]);

function isValidLearnerState(data: any): data is LearnerState {
  if (!data || typeof data !== "object") return false;

  // 1. Verify phase
  if (typeof data.phase !== "string" || !VALID_PHASES.has(data.phase)) {
    return false;
  }

  // 2. Verify currentConcept
  if (typeof data.currentConcept !== "string" || !VALID_CONCEPTS.has(data.currentConcept)) {
    return false;
  }

  // 3. Verify concepts object structure
  if (!data.concepts || typeof data.concepts !== "object") {
    return false;
  }
  for (const key of Array.from(VALID_CONCEPTS)) {
    const concept = data.concepts[key];
    if (!concept || typeof concept !== "object") return false;
    if (concept.id !== key) return false;
    if (typeof concept.mastery !== "number") return false;
    if (typeof concept.attempts !== "number") return false;
    if (typeof concept.correctAttempts !== "number") return false;
    if (typeof concept.incorrectAttempts !== "number") return false;
    if (concept.recentOutcome !== null && concept.recentOutcome !== "correct" && concept.recentOutcome !== "incorrect") {
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
    if (!VALID_CONCEPTS.has(attempt.concept)) return false;
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

  // 6. Verify other basic structure types just in case
  if (typeof data.consecutiveFailures !== "number") return false;
  if (!data.recovery || typeof data.recovery !== "object") return false;
  if (!data.mission || typeof data.mission !== "object") return false;

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
