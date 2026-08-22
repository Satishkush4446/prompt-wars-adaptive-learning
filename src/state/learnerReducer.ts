import type { 
  LearnerState, 
  ConceptId, 
  Attempt, 
  RecoveryMode, 
  NextAction, 
  AccessibilityPreferences,
  LearningPhase
} from "./learnerTypes";
import { initialLearnerState } from "./initialState";

export type LearnerAction =
  | { type: "START_LEARNING" }
  | { type: "GO_TO_PRACTICE" }
  | { 
      type: "SUBMIT_PRACTICE_ANSWER"; 
      payload: { questionId: string; concept: ConceptId; answer: string; correct: boolean } 
    }
  | { type: "REQUEST_HELP" }
  | { type: "START_RECOVERY_DIAGNOSIS" }
  | { 
      type: "SET_RECOVERY_DIAGNOSIS"; 
      payload: { misconception: string; recommendedMode: RecoveryMode } 
    }
  | { type: "RECOVERY_DIAGNOSIS_ERROR" }
  | { type: "SELECT_RECOVERY_MODE"; payload: { selectedMode: RecoveryMode } }
  | { type: "START_RECOVERY_CONTENT" }
  | { type: "SET_RECOVERY_CONTENT_SUCCESS" }
  | { type: "RECOVERY_CONTENT_ERROR" }
  | { type: "START_RETEST" }
  | { 
      type: "SUBMIT_RETEST"; 
      payload: { questionId: string; concept: ConceptId; answer: string; correct: boolean } 
    }
  | { type: "START_MISSION" }
  | { type: "SET_MISSION_SUBMISSION"; payload: { submission: string } }
  | { type: "SET_HINT_USED" }
  | { type: "START_MISSION_EVALUATION" }
  | { 
      type: "SET_MISSION_RESULT"; 
      payload: { passed: boolean; feedback: string | null; weakness: ConceptId | null } 
    }
  | { type: "MISSION_EVALUATION_ERROR" }
  | { type: "START_NEXT_ACTION" }
  | { type: "SET_NEXT_ACTION"; payload: { nextAction: NextAction } }
  | { type: "NEXT_ACTION_ERROR" }
  | { 
      type: "SET_ACCESSIBILITY_PREFERENCE"; 
      payload: { key: keyof AccessibilityPreferences; value: boolean } 
    }
  | { type: "RESET_LEARNING_SESSION" };

const clampMastery = (value: number): number => {
  return Math.max(0, Math.min(100, value));
};

export function learnerReducer(state: LearnerState, action: LearnerAction): LearnerState {
  switch (action.type) {
    case "START_LEARNING":
      return {
        ...state,
        phase: "intro",
      };

    case "GO_TO_PRACTICE":
      return {
        ...state,
        phase: "practice",
      };

    case "SUBMIT_PRACTICE_ANSWER": {
      const { questionId, concept, answer, correct } = action.payload;
      const newAttempt: Attempt = {
        id: Math.random().toString(36).substring(2, 9),
        questionId,
        concept,
        answer,
        correct,
        timestamp: Date.now(),
      };

      const currentConceptState = state.concepts[concept];
      const newAttempts = currentConceptState.attempts + 1;
      const newCorrectAttempts = currentConceptState.correctAttempts + (correct ? 1 : 0);
      const newIncorrectAttempts = currentConceptState.incorrectAttempts + (correct ? 0 : 1);

      let newMastery = currentConceptState.mastery;
      let newConsecutiveFailures = state.consecutiveFailures;
      let nextPhase: LearningPhase = state.phase;
      const newRecoveryState = { ...state.recovery };

      if (correct) {
        newMastery = clampMastery(newMastery + 12);
        newConsecutiveFailures = 0;
      } else {
        newMastery = clampMastery(newMastery - 8);
        newConsecutiveFailures += 1;
      }

      if (newConsecutiveFailures >= 2) {
        newRecoveryState.triggered = true;
        newRecoveryState.triggerReason = "two_failures";
        newRecoveryState.diagnosisStatus = "idle"; // reset for the diagnosis step
        nextPhase = "recoveryDiagnosis";
      }

      return {
        ...state,
        phase: nextPhase,
        consecutiveFailures: newConsecutiveFailures,
        attempts: [...state.attempts, newAttempt],
        concepts: {
          ...state.concepts,
          [concept]: {
            ...currentConceptState,
            attempts: newAttempts,
            correctAttempts: newCorrectAttempts,
            incorrectAttempts: newIncorrectAttempts,
            recentOutcome: correct ? "correct" : "incorrect",
            mastery: newMastery,
          },
        },
        recovery: newRecoveryState,
      };
    }

    case "REQUEST_HELP":
      return {
        ...state,
        phase: "recoveryDiagnosis",
        recovery: {
          ...state.recovery,
          triggered: true,
          triggerReason: "learner_requested_help",
          diagnosisStatus: "idle",
        },
      };

    case "START_RECOVERY_DIAGNOSIS":
      return {
        ...state,
        recovery: {
          ...state.recovery,
          diagnosisStatus: "loading",
        },
      };

    case "SET_RECOVERY_DIAGNOSIS": {
      const { misconception, recommendedMode } = action.payload;
      return {
        ...state,
        phase: "recoverySelection",
        recovery: {
          ...state.recovery,
          diagnosisStatus: "success",
          misconception,
          recommendedMode,
        },
      };
    }

    case "RECOVERY_DIAGNOSIS_ERROR":
      return {
        ...state,
        recovery: {
          ...state.recovery,
          diagnosisStatus: "error",
        },
      };

    case "SELECT_RECOVERY_MODE":
      return {
        ...state,
        recovery: {
          ...state.recovery,
          selectedMode: action.payload.selectedMode,
        },
      };

    case "START_RECOVERY_CONTENT":
      return {
        ...state,
        recovery: {
          ...state.recovery,
          contentStatus: "loading",
        },
      };

    case "SET_RECOVERY_CONTENT_SUCCESS":
      return {
        ...state,
        phase: "recoveryContent",
        recovery: {
          ...state.recovery,
          contentStatus: "success",
        },
      };

    case "START_RETEST":
      return {
        ...state,
        phase: "retest",
      };

    case "RECOVERY_CONTENT_ERROR":
      return {
        ...state,
        recovery: {
          ...state.recovery,
          contentStatus: "error",
        },
      };

    case "SUBMIT_RETEST": {
      const { questionId, concept, answer, correct } = action.payload;
      const newAttempt: Attempt = {
        id: Math.random().toString(36).substring(2, 9),
        questionId,
        concept,
        answer,
        correct,
        timestamp: Date.now(),
      };

      const currentConceptState = state.concepts[concept];
      let newMastery = currentConceptState.mastery;
      let nextPhase: LearningPhase = state.phase;
      let newConsecutiveFailures = state.consecutiveFailures;

      if (correct) {
        newMastery = clampMastery(newMastery + 18);
        newConsecutiveFailures = 0;
        nextPhase = "mission";
      } else {
        newMastery = clampMastery(newMastery - 8);
      }

      return {
        ...state,
        phase: nextPhase,
        consecutiveFailures: newConsecutiveFailures,
        attempts: [...state.attempts, newAttempt],
        concepts: {
          ...state.concepts,
          [concept]: {
            ...currentConceptState,
            attempts: currentConceptState.attempts + 1,
            correctAttempts: currentConceptState.correctAttempts + (correct ? 1 : 0),
            incorrectAttempts: currentConceptState.incorrectAttempts + (correct ? 0 : 1),
            recentOutcome: correct ? "correct" : "incorrect",
            mastery: newMastery,
          },
        },
        recovery: {
          ...state.recovery,
          recovered: correct,
        },
      };
    }

    case "START_MISSION":
      return {
        ...state,
        phase: "mission",
      };

    case "SET_MISSION_SUBMISSION":
      return {
        ...state,
        mission: {
          ...state.mission,
          attempted: true,
          submission: action.payload.submission,
        },
      };

    case "SET_HINT_USED":
      return {
        ...state,
        mission: {
          ...state.mission,
          hintUsed: true,
        },
      };

    case "START_MISSION_EVALUATION":
      return {
        ...state,
        mission: {
          ...state.mission,
          evaluationStatus: "loading",
        },
      };

    case "SET_MISSION_RESULT": {
      const { passed, feedback, weakness } = action.payload;
      const currentConceptState = state.concepts[state.currentConcept];

      let masteryChange = passed ? 20 : -10;
      let newMastery = clampMastery(currentConceptState.mastery + masteryChange);

      if (state.mission.hintUsed) {
        newMastery = clampMastery(newMastery - 3);
      }

      return {
        ...state,
        phase: "missionResult",
        concepts: {
          ...state.concepts,
          [state.currentConcept]: {
            ...currentConceptState,
            mastery: newMastery,
          },
        },
        mission: {
          ...state.mission,
          evaluationStatus: "success",
          passed,
          feedback,
          weakness,
        },
      };
    }

    case "MISSION_EVALUATION_ERROR":
      return {
        ...state,
        mission: {
          ...state.mission,
          evaluationStatus: "error",
        },
      };

    case "START_NEXT_ACTION":
      return {
        ...state,
        phase: "nextAction",
      };

    case "SET_NEXT_ACTION":
      return {
        ...state,
        phase: "nextAction",
        nextAction: action.payload.nextAction,
      };

    case "NEXT_ACTION_ERROR":
      return state;

    case "SET_ACCESSIBILITY_PREFERENCE": {
      const { key, value } = action.payload;
      return {
        ...state,
        accessibility: {
          ...state.accessibility,
          [key]: value,
        },
      };
    }

    case "RESET_LEARNING_SESSION":
      return {
        ...initialLearnerState,
        accessibility: state.accessibility, // Preserve accessibility settings
      };

    default:
      return state;
  }
}
