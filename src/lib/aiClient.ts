export interface AIResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
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
  id: string;
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
  conceptId: string;
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

export interface MisconceptionDiagnosis {
  misconception: string;
  recoveryFocus: string;
  recommendedMode: "story" | "visual" | "memory";
  confidence: "low" | "medium" | "high";
}

export interface StoryRecoveryData {
  mode: "story";
  title: string;
  story: string;
  connection: string;
  keyTakeaway: string;
  reTestQuestion: {
    question: string;
    options: string[];
    correctOptionIndex: number;
  };
}

export interface MemoryRecoveryData {
  mode: "memory";
  hook: string;
  meaning: string;
  example: string;
  recallQuestion: string;
  reTestQuestion: {
    question: string;
    options: string[];
    correctOptionIndex: number;
  };
}

export interface VisualRecoveryData {
  mode: "visual";
  title: string;
  steps: {
    label: string;
    value: string;
    explanation: string;
  }[];
  accessibleExplanation: string;
  keyTakeaway: string;
  reTestQuestion: {
    question: string;
    options: string[];
    correctOptionIndex: number;
  };
}

export type RecoveryContentData = StoryRecoveryData | MemoryRecoveryData | VisualRecoveryData;

export interface MissionEvaluation {
  passed: boolean;
  conceptApplication: "weak" | "developing" | "strong";
  strength: string;
  weakness: string; // English Concept ID or 'none'
  feedback: string;
}

export interface NextActionRecommendation {
  concept: string; // English Concept ID
  actionType: "practice" | "review" | "challenge";
  title: string;
  reason: string;
  durationMinutes: number;
}

async function callApi<T>(action: string, context: Record<string, any>): Promise<T> {
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, context }),
    });

    if (!response.ok) {
      let errBody;
      try {
        errBody = await response.json();
      } catch (_) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
      throw new Error(errBody?.error?.message || `Server returned HTTP ${response.status}`);
    }

    const json: AIResponse<T> = await response.json();
    if (!json.ok || !json.data) {
      throw new Error(json.error?.message || "Failed to parse API response");
    }

    return json.data;
  } catch (error: any) {
    console.error(`AI Client call failed for action '${action}':`, error);
    throw new Error(error?.message || "Network request failed. Please check your connection.");
  }
}

export async function generateLesson(context: { 
  topic: string; 
  learningDurationMinutes?: number | null; 
  learningLanguage: string;
}): Promise<GeneratedLesson> {
  return callApi<GeneratedLesson>("generateLesson", context);
}

export async function diagnoseMisconception(context: {
  topic: string;
  concept: string;
  question: string;
  correctAnswer: string;
  learnerAnswers: string[];
  attemptCount: number;
  mastery: number;
  recoveryHistory: string[];
  initialLearningMode?: string | null;
  learningLanguage: string;
}): Promise<MisconceptionDiagnosis> {
  return callApi<MisconceptionDiagnosis>("diagnose", context);
}

export async function generateRecovery(context: {
  topic: string;
  concept: string;
  question: string;
  learnerAnswers: string[];
  misconception: string;
  mastery: number;
  selectedMode: "story" | "visual" | "memory";
  learningLanguage: string;
}): Promise<RecoveryContentData> {
  return callApi<RecoveryContentData>("recovery", context);
}

export async function evaluateMission(context: {
  topic: string;
  concept: string;
  missionGoal: string;
  rubric: string[];
  learnerSubmission: string;
  learnerState: any;
  learningLanguage: string;
}): Promise<MissionEvaluation> {
  return callApi<MissionEvaluation>("evaluateMission", context);
}

export async function getNextBestAction(context: {
  concepts: Record<string, any>;
  recentAttempts: any[];
  recoveryResult: boolean | null;
  recoveryMode: string | null;
  missionResult: boolean | null;
  missionWeakness: string | null;
  hintUsed: boolean;
  learningDurationMinutes?: number | null;
  learningLanguage: string;
}): Promise<NextActionRecommendation> {
  return callApi<NextActionRecommendation>("nextAction", context);
}
