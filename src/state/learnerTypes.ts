export type ConceptId = "parameters" | "returnValues" | "functionCalls";

export type LearningPhase =
  | "welcome"
  | "intro"
  | "practice"
  | "recoveryDiagnosis"
  | "recoverySelection"
  | "recoveryContent"
  | "retest"
  | "mission"
  | "missionResult"
  | "nextAction";

export interface ConceptState {
  id: ConceptId;
  mastery: number;
  attempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  recentOutcome: "correct" | "incorrect" | null;
}

export interface Attempt {
  id: string;
  questionId: string;
  concept: ConceptId;
  answer: string;
  correct: boolean;
  timestamp: number;
}

export type RecoveryMode = "story" | "visual" | "memory";

export interface RecoveryState {
  triggered: boolean;
  triggerReason: "two_failures" | "learner_requested_help" | null;
  diagnosisStatus: "idle" | "loading" | "success" | "error";
  misconception: string | null;
  recommendedMode: RecoveryMode | null;
  selectedMode: RecoveryMode | null;
  contentStatus: "idle" | "loading" | "success" | "error";
  recovered: boolean | null;
  recoveryContent: any | null;
}

export interface MissionState {
  attempted: boolean;
  submission: string;
  evaluationStatus: "idle" | "loading" | "success" | "error";
  passed: boolean | null;
  hintUsed: boolean;
  feedback: string | null;
  weakness: ConceptId | null;
}

export type NextActionType = "practice" | "review" | "challenge";

export interface NextAction {
  concept: ConceptId;
  actionType: NextActionType;
  title: string;
  reason: string;
  durationMinutes: number;
}

export interface AccessibilityPreferences {
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  enhancedFocus: boolean;
}

export interface LearnerState {
  phase: LearningPhase;
  currentConcept: ConceptId;
  concepts: Record<ConceptId, ConceptState>;
  attempts: Attempt[];
  consecutiveFailures: number;
  recovery: RecoveryState;
  mission: MissionState;
  nextAction: NextAction | null;
  accessibility: AccessibilityPreferences;
}
