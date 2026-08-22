import type { 
  LearnerState, 
  ConceptId, 
  Attempt, 
  RecoveryMode, 
  NextAction, 
  AccessibilityPreferences,
  LearningPhase,
  GeneratedLesson,
  LearningDuration,
  LearningMode,
  LearningLanguage,
  StateWithHistory,
  UndoableAction
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
  | { type: "SET_RECOVERY_CONTENT_SUCCESS"; payload: { recoveryContent: any } }
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
  | { type: "RESET_LEARNING_SESSION" }
  | { type: "SET_TOPIC_INPUT"; payload: { topicInput: string } }
  | { type: "SET_TOPIC_SUBMIT"; payload: { topicInput: string } }
  | { type: "SET_LANGUAGE_PREFERENCE"; payload: { language: LearningLanguage } }
  | { type: "SET_TIME_PREFERENCE"; payload: { duration: LearningDuration | null } }
  | { type: "START_LESSON_GENERATION" }
  | { type: "SET_GENERATED_LESSON"; payload: { lesson: GeneratedLesson } }
  | { type: "LESSON_GENERATION_ERROR" }
  | { type: "GO_TO_MODE_SELECTION" }
  | { type: "SET_INITIAL_LEARNING_MODE"; payload: { mode: LearningMode } }
  | { type: "TRY_INITIAL_CONTENT" };

const clampMastery = (value: number): number => {
  return Math.max(0, Math.min(100, value));
};

export function learnerReducer(state: LearnerState, action: LearnerAction): LearnerState {
  switch (action.type) {
    case "SET_TOPIC_INPUT":
      return {
        ...state,
        topicInput: action.payload.topicInput,
      };

    case "SET_TOPIC_SUBMIT":
      return {
        ...state,
        topicInput: action.payload.topicInput,
        phase: "languagePreference",
      };

    case "SET_LANGUAGE_PREFERENCE":
      return {
        ...state,
        learningLanguage: action.payload.language,
        phase: "timePreference",
      };

    case "SET_TIME_PREFERENCE":
      return {
        ...state,
        learningDurationMinutes: action.payload.duration,
      };

    case "START_LESSON_GENERATION":
      return {
        ...state,
        lessonStatus: "loading",
      };

    case "SET_GENERATED_LESSON": {
      const { lesson } = action.payload;
      const initialConcepts: Record<ConceptId, any> = {};
      
      // Initialize dynamic concept states
      lesson.concepts.forEach((concept) => {
        initialConcepts[concept.id] = {
          id: concept.id,
          name: concept.name,
          description: concept.description,
          mastery: 0,
          attempts: 0,
          correctAttempts: 0,
          incorrectAttempts: 0,
          recentOutcome: null,
        };
      });

      return {
        ...state,
        lesson,
        lessonStatus: "success",
        currentConcept: lesson.initialQuestion.conceptId,
        concepts: initialConcepts,
        phase: "intro",
      };
    }

    case "LESSON_GENERATION_ERROR":
      return {
        ...state,
        lessonStatus: "error",
      };

    case "START_LEARNING":
      return {
        ...state,
        phase: "intro",
      };

    case "GO_TO_MODE_SELECTION":
      return {
        ...state,
        phase: "learningModeSelection",
      };

    case "SET_INITIAL_LEARNING_MODE":
      return {
        ...state,
        initialLearningMode: action.payload.mode,
        phase: "initialLearningContent",
      };

    case "TRY_INITIAL_CONTENT":
      return {
        ...state,
        phase: "practice",
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

      const currentConceptState = state.concepts[concept] || {
        id: concept,
        name: concept,
        description: "",
        mastery: 0,
        attempts: 0,
        correctAttempts: 0,
        incorrectAttempts: 0,
        recentOutcome: null,
      };
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
        newRecoveryState.diagnosisStatus = "idle";
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
          recoveryContent: action.payload.recoveryContent,
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

      const currentConceptState = state.concepts[concept] || {
        id: concept,
        name: concept,
        description: "",
        mastery: 0,
        attempts: 0,
        correctAttempts: 0,
        incorrectAttempts: 0,
        recentOutcome: null,
      };
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
      const currentConceptState = state.concepts[state.currentConcept] || {
        id: state.currentConcept,
        name: state.currentConcept,
        description: "",
        mastery: 0,
        attempts: 0,
        correctAttempts: 0,
        incorrectAttempts: 0,
        recentOutcome: null,
      };

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

export function learnerReducerWithHistory(
  state: StateWithHistory<LearnerState>,
  action: UndoableAction<LearnerAction>
): StateWithHistory<LearnerState> {
  if ("type" in action && action.type === "STEP_BACK") {
    if (state.past.length === 0) return state;

    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);

    return {
      past: newPast,
      present: previous,
      future: [state.present, ...state.future],
    };
  }

  // Handle all other actions
  const newPresent = learnerReducer(state.present, action as LearnerAction);

  // Optimization: Don't push to past if the state hasn't changed (e.g. some ignored action)
  if (newPresent === state.present) {
    return state;
  }

  return {
    past: [...state.past, state.present],
    present: newPresent,
    future: [],
  };
}
