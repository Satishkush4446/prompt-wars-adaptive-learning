export type ConceptId = string;

export type LearningPhase =
  | "welcome"
  | "timePreference"
  | "intro"
  | "learningModeSelection"
  | "initialLearningContent"
  | "practice"
  | "recoveryDiagnosis"
  | "recoverySelection"
  | "recoveryContent"
  | "retest"
  | "mission"
  | "missionResult"
  | "nextAction";

export type LearningDuration = 5 | 10 | 20 | 30;
export type LearningMode = "text" | "story" | "visual" | "memory";

export interface ConceptState {
  id: ConceptId;
  name: string;
  description: string;
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

export interface TextModeContent {
  explanation: string;
  example: string;
  keyTakeaway: string;
}

export interface StoryModeContent {
  title: string;
  story: string;
  connection: string;
  keyTakeaway: string;
}

export interface VisualStep {
  label: string;
  value: string;
  explanation: string;
}

export interface VisualModeContent {
  title: string;
  steps: VisualStep[];
  accessibleExplanation: string;
  keyTakeaway: string;
}

export interface MemoryModeContent {
  hook: string;
  meaning: string;
  example: string;
  keyTakeaway: string;
}

export interface LessonConcept {
  id: ConceptId;
  name: string;
  description: string;
  learningModes: {
    text: TextModeContent;
    story: StoryModeContent;
    visual: VisualModeContent;
    memory: MemoryModeContent;
  };
}

export interface LessonQuestion {
  id: string;
  conceptId: ConceptId;
  prompt: string;
  options: string[];
  correctAnswer: string;
  retryHint: string;
}

export interface LessonMission {
  title: string;
  goal: string;
  instructions: string;
  starterContent: string;
  rubric: string[];
}

export interface GeneratedLesson {
  topicTitle: string;
  intro: string;
  concepts: LessonConcept[];
  initialQuestion: LessonQuestion;
  mission: LessonMission;
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
  lesson: GeneratedLesson | null;
  lessonStatus: "idle" | "loading" | "success" | "error";
  topicInput: string;
  learningDurationMinutes: LearningDuration | null;
  initialLearningMode: LearningMode | null;
}
