import { describe, test, expect, beforeEach } from "vitest";
import { 
  learnerReducer, 
  initializeConcepts, 
  computePracticeAnswerUpdate, 
  computeRetestAnswerUpdate, 
  computeMissionResultUpdate 
} from "./learnerReducer";
import { initialLearnerState } from "./initialState";
import type { LearnerState } from "./learnerTypes";
import { loadLearnerState, saveLearnerState, clearLearnerState } from "../lib/storage";

// Mock localStorage for Vitest environment if it does not exist
if (typeof window === "undefined") {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k in store) { delete store[k]; } },
    length: 0,
    key: (index: number) => Object.keys(store)[index] || null,
  };
}

const mockLesson = {
  topicTitle: "Python Functions",
  intro: "Learn inputs and outputs.",
  concepts: [
    { 
      id: "parameters", 
      name: "Parameters", 
      description: "Function inputs.",
      learningModes: {
        text: { explanation: "Exp text", example: "Ex text", keyTakeaway: "Take text" },
        story: { title: "Title", story: "Story text", connection: "Connection text", keyTakeaway: "Take text" },
        visual: { title: "Title", steps: [{ label: "Label", value: "Value", explanation: "Exp" }], accessibleExplanation: "Acc explanation", keyTakeaway: "Take text" },
        memory: { hook: "Hook", meaning: "Meaning", example: "Ex text", keyTakeaway: "Take text" }
      }
    },
    { 
      id: "returnValues", 
      name: "Return values", 
      description: "Function outputs.",
      learningModes: {
        text: { explanation: "Exp text", example: "Ex text", keyTakeaway: "Take text" },
        story: { title: "Title", story: "Story text", connection: "Connection text", keyTakeaway: "Take text" },
        visual: { title: "Title", steps: [{ label: "Label", value: "Value", explanation: "Exp" }], accessibleExplanation: "Acc explanation", keyTakeaway: "Take text" },
        memory: { hook: "Hook", meaning: "Meaning", example: "Ex text", keyTakeaway: "Take text" }
      }
    },
    { 
      id: "functionCalls", 
      name: "Function calls", 
      description: "Executing functions.",
      learningModes: {
        text: { explanation: "Exp text", example: "Ex text", keyTakeaway: "Take text" },
        story: { title: "Title", story: "Story text", connection: "Connection text", keyTakeaway: "Take text" },
        visual: { title: "Title", steps: [{ label: "Label", value: "Value", explanation: "Exp" }], accessibleExplanation: "Acc explanation", keyTakeaway: "Take text" },
        memory: { hook: "Hook", meaning: "Meaning", example: "Ex text", keyTakeaway: "Take text" }
      }
    }
  ],
  initialQuestion: {
    id: "q1",
    conceptId: "parameters",
    prompt: "What value is double(4)?",
    options: ["4", "6", "8", "10"],
    correctAnswer: "8",
    retryHint: "Think multiplying."
  },
  mission: {
    title: "Mission parameters",
    goal: "Write total function.",
    instructions: "Return inputs multiplied.",
    starterContent: "def total(p, q):",
    rubric: ["Calculates product", "Returns result"]
  }
};

describe("learnerReducer & storage tests", () => {
  let state: LearnerState;

  beforeEach(() => {
    state = learnerReducer(initialLearnerState, {
      type: "SET_GENERATED_LESSON",
      payload: { lesson: mockLesson }
    });
    localStorage.clear();
  });

  // Test 1: Correct practice answer
  test("Test 1: Correct practice answer increases mastery, records attempt, and resets consecutiveFailures", () => {
    state.consecutiveFailures = 1;
    const nextState = learnerReducer(state, {
      type: "SUBMIT_PRACTICE_ANSWER",
      payload: {
        questionId: "q1",
        concept: "parameters",
        answer: "correct_answer",
        correct: true,
      },
    });

    expect(nextState.attempts.length).toBe(1);
    expect(nextState.attempts[0].correct).toBe(true);
    expect(nextState.concepts.parameters.mastery).toBe(12);
    expect(nextState.consecutiveFailures).toBe(0);
    expect(nextState.recovery.triggered).toBe(false);
  });

  // Test 2: First incorrect answer
  test("Test 2: First incorrect answer decreases mastery, records attempt, increases failures, but doesn't trigger recovery", () => {
    state.concepts.parameters.mastery = 20;
    const nextState = learnerReducer(state, {
      type: "SUBMIT_PRACTICE_ANSWER",
      payload: {
        questionId: "q1",
        concept: "parameters",
        answer: "wrong_answer",
        correct: false,
      },
    });

    expect(nextState.attempts.length).toBe(1);
    expect(nextState.attempts[0].correct).toBe(false);
    expect(nextState.concepts.parameters.mastery).toBe(12); // 20 - 8
    expect(nextState.consecutiveFailures).toBe(1);
    expect(nextState.recovery.triggered).toBe(false);
  });

  // Test 3: Second consecutive incorrect answer
  test("Test 3: Second consecutive incorrect answer triggers recovery and sets diagnosis phase", () => {
    state.consecutiveFailures = 1;
    state.concepts.parameters.mastery = 20;

    const nextState = learnerReducer(state, {
      type: "SUBMIT_PRACTICE_ANSWER",
      payload: {
        questionId: "q2",
        concept: "parameters",
        answer: "wrong_answer_2",
        correct: false,
      },
    });

    expect(nextState.consecutiveFailures).toBe(2);
    expect(nextState.recovery.triggered).toBe(true);
    expect(nextState.recovery.triggerReason).toBe("two_failures");
    expect(nextState.phase).toBe("recoveryDiagnosis");
  });

  // Test 4: Explicit help
  test("Test 4: Requesting help triggers recovery immediately", () => {
    const nextState = learnerReducer(state, { type: "REQUEST_HELP" });

    expect(nextState.recovery.triggered).toBe(true);
    expect(nextState.recovery.triggerReason).toBe("learner_requested_help");
    expect(nextState.phase).toBe("recoveryDiagnosis");
  });

  // Test 5: Successful recovery re-test
  test("Test 5: Successful recovery re-test increases mastery and advances phase", () => {
    state.concepts.parameters.mastery = 10;
    state.phase = "retest";

    const nextState = learnerReducer(state, {
      type: "SUBMIT_RETEST",
      payload: {
        questionId: "qr1",
        concept: "parameters",
        answer: "correct_retest",
        correct: true,
      },
    });

    expect(nextState.concepts.parameters.mastery).toBe(28); // 10 + 18
    expect(nextState.recovery.recovered).toBe(true);
    expect(nextState.phase).toBe("mission");
  });

  // Test 6: Failed recovery re-test
  test("Test 6: Failed recovery re-test decreases mastery but stays in retest phase (for UI continuation)", () => {
    state.concepts.parameters.mastery = 10;
    state.phase = "retest";

    const nextState = learnerReducer(state, {
      type: "SUBMIT_RETEST",
      payload: {
        questionId: "qr1",
        concept: "parameters",
        answer: "wrong_retest",
        correct: false,
      },
    });

    expect(nextState.concepts.parameters.mastery).toBe(2); // 10 - 8
    expect(nextState.recovery.recovered).toBe(false);
    expect(nextState.phase).toBe("retest");
  });

  // Test 7: Mission pass
  test("Test 7: Mission pass increases mastery and records evaluation success", () => {
    state.currentConcept = "parameters";
    state.concepts.parameters.mastery = 50;

    const nextState = learnerReducer(state, {
      type: "SET_MISSION_RESULT",
      payload: {
        passed: true,
        feedback: "Great job!",
        weakness: null,
      },
    });

    expect(nextState.concepts.parameters.mastery).toBe(70); // 50 + 20
    expect(nextState.mission.passed).toBe(true);
    expect(nextState.mission.feedback).toBe("Great job!");
    expect(nextState.phase).toBe("missionResult");
  });

  // Test 8: Mission failure
  test("Test 8: Mission failure decreases mastery and records weakness", () => {
    state.currentConcept = "parameters";
    state.concepts.parameters.mastery = 50;

    const nextState = learnerReducer(state, {
      type: "SET_MISSION_RESULT",
      payload: {
        passed: false,
        feedback: "Try using parameters correctly.",
        weakness: "parameters",
      },
    });

    expect(nextState.concepts.parameters.mastery).toBe(40); // 50 - 10
    expect(nextState.mission.passed).toBe(false);
    expect(nextState.mission.weakness).toBe("parameters");
    expect(nextState.phase).toBe("missionResult");
  });

  // Test 9: Accessibility preference isolation
  test("Test 9: Accessibility preference does not affect learning metrics", () => {
    state.concepts.parameters.mastery = 50;
    state.attempts = [
      { id: "a1", questionId: "q1", concept: "parameters", answer: "ans", correct: true, timestamp: 123 }
    ];

    const nextState = learnerReducer(state, {
      type: "SET_ACCESSIBILITY_PREFERENCE",
      payload: {
        key: "largeText",
        value: true,
      },
    });

    expect(nextState.accessibility.largeText).toBe(true);
    expect(nextState.concepts.parameters.mastery).toBe(50);
    expect(nextState.attempts.length).toBe(1);
  });

  // Test 10: Mastery boundaries (0 - 100)
  test("Test 10: Mastery clamping logic works (never < 0, never > 100)", () => {
    state.concepts.parameters.mastery = 95;

    let nextState = learnerReducer(state, {
      type: "SUBMIT_PRACTICE_ANSWER",
      payload: {
        questionId: "q1",
        concept: "parameters",
        answer: "correct",
        correct: true,
      },
    });
    expect(nextState.concepts.parameters.mastery).toBe(100);

    state.concepts.parameters.mastery = 5;
    nextState = learnerReducer(state, {
      type: "SUBMIT_PRACTICE_ANSWER",
      payload: {
        questionId: "q1",
        concept: "parameters",
        answer: "incorrect",
        correct: false,
      },
    });
    expect(nextState.concepts.parameters.mastery).toBe(0);
  });

  // Test 11: Invalid localStorage data fallback
  test("Test 11: Invalid localStorage data does not crash and falls back safely", () => {
    clearLearnerState();
    const loadedFromEmpty = loadLearnerState();
    expect(loadedFromEmpty).toEqual(initialLearnerState);

    localStorage.setItem("adaptive-learning-state-v2", "corrupt-json-{");
    const loadedFromCorrupt = loadLearnerState();
    expect(loadedFromCorrupt).toEqual(initialLearnerState);

    localStorage.setItem("adaptive-learning-state-v2", JSON.stringify({ phase: "invalidPhase", concepts: {} }));
    const loadedFromInvalid = loadLearnerState();
    expect(loadedFromInvalid).toEqual(initialLearnerState);

    state.concepts.parameters.mastery = 42;
    state.phase = "practice";
    saveLearnerState(state);
    const loadedValidState = loadLearnerState();
    expect(loadedValidState.concepts.parameters.mastery).toBe(42);
    expect(loadedValidState.phase).toBe("practice");
  });

  // Test 12: Time Preference selection preference checks
  test("Test 12: Time preference does not alter knowledge state and resets correctly", () => {
    state.concepts.parameters.mastery = 50;

    const nextState = learnerReducer(state, {
      type: "SET_TIME_PREFERENCE",
      payload: { duration: 10 }
    });

    expect(nextState.learningDurationMinutes).toBe(10);
    expect(nextState.concepts.parameters.mastery).toBe(50);

    const resetState = learnerReducer(nextState, { type: "RESET_LEARNING_SESSION" });
    expect(resetState.learningDurationMinutes).toBeNull();
  });

  // Test 13: Learning Mode selection preference checks
  test("Test 13: Learning mode selection does not alter knowledge state and resets correctly", () => {
    state.concepts.parameters.mastery = 50;

    const nextState = learnerReducer(state, {
      type: "SET_INITIAL_LEARNING_MODE",
      payload: { mode: "visual" }
    });

    expect(nextState.initialLearningMode).toBe("visual");
    expect(nextState.concepts.parameters.mastery).toBe(50);
    expect(nextState.phase).toBe("initialLearningContent");

    const resetState = learnerReducer(nextState, { type: "RESET_LEARNING_SESSION" });
    expect(resetState.initialLearningMode).toBeNull();
  });

  // Test 14: Language Preference selection checks
  test("Test 14: Default language is English and free-text updates work for any language", () => {
    expect(state.learningLanguage).toBe("English");

    // SET_TOPIC_SUBMIT transitions to languagePreference phase
    const topicState = learnerReducer(state, {
      type: "SET_TOPIC_SUBMIT",
      payload: { topicInput: "Photosynthesis" }
    });
    expect(topicState.phase).toBe("languagePreference");

    // SET_LANGUAGE_PREFERENCE sets language and transitions to timePreference phase
    const testLanguages = ["English", "Spanish", "Hindi", "Tamil", "German"];
    for (const lang of testLanguages) {
      const langState = learnerReducer(topicState, {
        type: "SET_LANGUAGE_PREFERENCE",
        payload: { language: lang }
      });
      expect(langState.learningLanguage).toBe(lang);
      expect(langState.phase).toBe("timePreference");
      expect(langState.concepts.parameters?.mastery || 0).toBe(0);
    }

    // RESET_LEARNING_SESSION clears language back to English
    const finalLangState = learnerReducer(topicState, {
      type: "SET_LANGUAGE_PREFERENCE",
      payload: { language: "German" }
    });
    const resetState = learnerReducer(finalLangState, { type: "RESET_LEARNING_SESSION" });
    expect(resetState.learningLanguage).toBe("English");
  });
});


// ===========================================================================
// P0 FIX TESTS — Security, Payload Bounds, Recovery Resilience
// ===========================================================================
import * as fs from "fs";
import * as path from "path";

// Read the aiClient.ts source once for static security assertions
const aiClientPath = path.resolve(__dirname, "../lib/aiClient.ts");
const aiClientSource = fs.readFileSync(aiClientPath, "utf-8");

describe("P0 Security — aiClient.ts browser secret removal", () => {
  test("Test S1: aiClient.ts does not contain VITE_GEMINI_API_KEY", () => {
    expect(aiClientSource).not.toContain("VITE_GEMINI_API_KEY");
  });

  test("Test S2: aiClient.ts does not import @google/genai SDK", () => {
    expect(aiClientSource).not.toContain("@google/genai");
  });

  test("Test S3: aiClient.ts does not instantiate GoogleGenAI", () => {
    expect(aiClientSource).not.toContain("new GoogleGenAI");
    expect(aiClientSource).not.toContain("GoogleGenAI(");
  });

  test("Test S4: aiClient.ts does not reference callGeminiDirect", () => {
    expect(aiClientSource).not.toContain("callGeminiDirect");
  });

  test("Test S5: aiClient.ts routes all calls to /api/ai", () => {
    expect(aiClientSource).toContain('fetch("/api/ai"');
  });

  test("Test S6: aiClient.ts does not use import.meta.env for secrets", () => {
    // Comment references are allowed, but live code usage must not exist
    const liveEnvUsage = aiClientSource
      .split("\n")
      .filter(line => !line.trim().startsWith("//"))
      .join("\n");
    expect(liveEnvUsage).not.toContain("import.meta.env.VITE_GEMINI");
  });

  test("Test S7: evaluateMission signature does not include learnerState param", () => {
    expect(aiClientSource).not.toContain("learnerState");
  });
});

describe("P0 Adaptive Logic — two-strike recovery trigger", () => {
  let state: LearnerState;

  beforeEach(() => {
    state = learnerReducer(initialLearnerState, {
      type: "SET_GENERATED_LESSON",
      payload: {
        lesson: {
          topicTitle: "Python Functions",
          intro: "Learn inputs and outputs.",
          concepts: [
            {
              id: "parameters",
              name: "Parameters",
              description: "Function inputs.",
              learningModes: {
                text: { explanation: "E", example: "Ex", keyTakeaway: "K" },
                story: { title: "T", story: "S", connection: "C", keyTakeaway: "K" },
                visual: { title: "T", steps: [{ label: "L", value: "V", explanation: "E" }], accessibleExplanation: "A", keyTakeaway: "K" },
                memory: { hook: "H", meaning: "M", example: "Ex", keyTakeaway: "K" }
              }
            },
            {
              id: "return-values",
              name: "Return Values",
              description: "Function outputs.",
              learningModes: {
                text: { explanation: "E", example: "Ex", keyTakeaway: "K" },
                story: { title: "T", story: "S", connection: "C", keyTakeaway: "K" },
                visual: { title: "T", steps: [{ label: "L", value: "V", explanation: "E" }], accessibleExplanation: "A", keyTakeaway: "K" },
                memory: { hook: "H", meaning: "M", example: "Ex", keyTakeaway: "K" }
              }
            },
            {
              id: "function-calls",
              name: "Function Calls",
              description: "Executing functions.",
              learningModes: {
                text: { explanation: "E", example: "Ex", keyTakeaway: "K" },
                story: { title: "T", story: "S", connection: "C", keyTakeaway: "K" },
                visual: { title: "T", steps: [{ label: "L", value: "V", explanation: "E" }], accessibleExplanation: "A", keyTakeaway: "K" },
                memory: { hook: "H", meaning: "M", example: "Ex", keyTakeaway: "K" }
              }
            }
          ],
          initialQuestion: {
            id: "q1", conceptId: "parameters", prompt: "Q?",
            options: ["A", "B", "C", "D"], correctAnswer: "A", retryHint: "Hint."
          },
          mission: {
            title: "Mission", goal: "Goal", instructions: "Instructions",
            starterContent: "def f():", rubric: ["Rubric item"]
          }
        }
      }
    });
    localStorage.clear();
  });

  test("Test A1: Wrong answer #1 does NOT trigger recovery", () => {
    const next = learnerReducer(state, {
      type: "SUBMIT_PRACTICE_ANSWER",
      payload: { questionId: "q1", concept: "parameters", answer: "B", correct: false }
    });
    expect(next.consecutiveFailures).toBe(1);
    expect(next.recovery.triggered).toBe(false);
    expect(next.phase).toBe("intro"); // stays in same phase
  });

  test("Test A2: Wrong answer #2 triggers recovery and diagnosis phase", () => {
    const afterFirst = learnerReducer(state, {
      type: "SUBMIT_PRACTICE_ANSWER",
      payload: { questionId: "q1", concept: "parameters", answer: "B", correct: false }
    });
    const afterSecond = learnerReducer(afterFirst, {
      type: "SUBMIT_PRACTICE_ANSWER",
      payload: { questionId: "q1", concept: "parameters", answer: "C", correct: false }
    });
    expect(afterSecond.consecutiveFailures).toBe(2);
    expect(afterSecond.recovery.triggered).toBe(true);
    expect(afterSecond.recovery.triggerReason).toBe("two_failures");
    expect(afterSecond.phase).toBe("recoveryDiagnosis");
  });

  test("Test A3: Correct answer after 1 wrong resets consecutive failures", () => {
    const afterWrong = learnerReducer(state, {
      type: "SUBMIT_PRACTICE_ANSWER",
      payload: { questionId: "q1", concept: "parameters", answer: "B", correct: false }
    });
    const afterCorrect = learnerReducer(afterWrong, {
      type: "SUBMIT_PRACTICE_ANSWER",
      payload: { questionId: "q1", concept: "parameters", answer: "A", correct: true }
    });
    expect(afterCorrect.consecutiveFailures).toBe(0);
    expect(afterCorrect.recovery.triggered).toBe(false);
  });
});

describe("P0 Payload Bounds — AI context must not include full state", () => {
  test("Test P1: evaluateMission signature in aiClient.ts has no learnerState field", () => {
    // Static check — evaluateMission function body
    const match = aiClientSource.match(/export async function evaluateMission[\s\S]*?\}/);
    expect(match).not.toBeNull();
    const funcBody = match![0];
    expect(funcBody).not.toContain("learnerState");
  });

  test("Test P2: Mastery remains within 0–100 bounds after multiple wrong answers", () => {
    let s = learnerReducer(initialLearnerState, {
      type: "SET_GENERATED_LESSON",
      payload: {
        lesson: {
          topicTitle: "Test", intro: "I", concepts: [
            { id: "c1", name: "C1", description: "D",
              learningModes: {
                text: { explanation: "E", example: "Ex", keyTakeaway: "K" },
                story: { title: "T", story: "S", connection: "C", keyTakeaway: "K" },
                visual: { title: "T", steps: [{ label: "L", value: "V", explanation: "E" }], accessibleExplanation: "A", keyTakeaway: "K" },
                memory: { hook: "H", meaning: "M", example: "Ex", keyTakeaway: "K" }
              }
            },
            { id: "c2", name: "C2", description: "D",
              learningModes: {
                text: { explanation: "E", example: "Ex", keyTakeaway: "K" },
                story: { title: "T", story: "S", connection: "C", keyTakeaway: "K" },
                visual: { title: "T", steps: [{ label: "L", value: "V", explanation: "E" }], accessibleExplanation: "A", keyTakeaway: "K" },
                memory: { hook: "H", meaning: "M", example: "Ex", keyTakeaway: "K" }
              }
            },
            { id: "c3", name: "C3", description: "D",
              learningModes: {
                text: { explanation: "E", example: "Ex", keyTakeaway: "K" },
                story: { title: "T", story: "S", connection: "C", keyTakeaway: "K" },
                visual: { title: "T", steps: [{ label: "L", value: "V", explanation: "E" }], accessibleExplanation: "A", keyTakeaway: "K" },
                memory: { hook: "H", meaning: "M", example: "Ex", keyTakeaway: "K" }
              }
            }
          ],
          initialQuestion: { id: "q1", conceptId: "c1", prompt: "Q?", options: ["A","B","C","D"], correctAnswer: "A", retryHint: "H" },
          mission: { title: "M", goal: "G", instructions: "I", starterContent: "s", rubric: ["r"] }
        }
      }
    });
    // Submit 20 wrong answers — mastery must never go below 0
    for (let i = 0; i < 20; i++) {
      s = learnerReducer(s, {
        type: "SUBMIT_PRACTICE_ANSWER",
        payload: { questionId: "q1", concept: "c1", answer: "wrong", correct: false }
      });
    }
    expect(s.concepts["c1"].mastery).toBeGreaterThanOrEqual(0);
    expect(s.concepts["c1"].mastery).toBeLessThanOrEqual(100);
  });

  test("Test P3: attempts array grows but all entries are valid Attempt objects", () => {
    let s = learnerReducer(initialLearnerState, {
      type: "SET_GENERATED_LESSON",
      payload: {
        lesson: {
          topicTitle: "Test", intro: "I", concepts: [
            { id: "c1", name: "C1", description: "D",
              learningModes: {
                text: { explanation: "E", example: "Ex", keyTakeaway: "K" },
                story: { title: "T", story: "S", connection: "C", keyTakeaway: "K" },
                visual: { title: "T", steps: [{ label: "L", value: "V", explanation: "E" }], accessibleExplanation: "A", keyTakeaway: "K" },
                memory: { hook: "H", meaning: "M", example: "Ex", keyTakeaway: "K" }
              }
            },
            { id: "c2", name: "C2", description: "D",
              learningModes: {
                text: { explanation: "E", example: "Ex", keyTakeaway: "K" },
                story: { title: "T", story: "S", connection: "C", keyTakeaway: "K" },
                visual: { title: "T", steps: [{ label: "L", value: "V", explanation: "E" }], accessibleExplanation: "A", keyTakeaway: "K" },
                memory: { hook: "H", meaning: "M", example: "Ex", keyTakeaway: "K" }
              }
            },
            { id: "c3", name: "C3", description: "D",
              learningModes: {
                text: { explanation: "E", example: "Ex", keyTakeaway: "K" },
                story: { title: "T", story: "S", connection: "C", keyTakeaway: "K" },
                visual: { title: "T", steps: [{ label: "L", value: "V", explanation: "E" }], accessibleExplanation: "A", keyTakeaway: "K" },
                memory: { hook: "H", meaning: "M", example: "Ex", keyTakeaway: "K" }
              }
            }
          ],
          initialQuestion: { id: "q1", conceptId: "c1", prompt: "Q?", options: ["A","B","C","D"], correctAnswer: "A", retryHint: "H" },
          mission: { title: "M", goal: "G", instructions: "I", starterContent: "s", rubric: ["r"] }
        }
      }
    });
    for (let i = 0; i < 5; i++) {
      s = learnerReducer(s, {
        type: "SUBMIT_PRACTICE_ANSWER",
        payload: { questionId: `q${i}`, concept: "c1", answer: "wrong", correct: false }
      });
    }
    expect(s.attempts.length).toBe(5);
    for (const attempt of s.attempts) {
      expect(typeof attempt.id).toBe("string");
      expect(typeof attempt.answer).toBe("string");
      expect(typeof attempt.correct).toBe("boolean");
      expect(typeof attempt.timestamp).toBe("number");
    }
  });
});

describe("P0 Recovery Resilience — error handling and state preservation", () => {
  let stateInRecovery: LearnerState;

  beforeEach(() => {
    const base = learnerReducer(initialLearnerState, {
      type: "SET_GENERATED_LESSON",
      payload: {
        lesson: {
          topicTitle: "Python Functions", intro: "Learn.",
          concepts: [
            { id: "parameters", name: "Parameters", description: "Inputs.",
              learningModes: {
                text: { explanation: "E", example: "Ex", keyTakeaway: "K" },
                story: { title: "T", story: "S", connection: "C", keyTakeaway: "K" },
                visual: { title: "T", steps: [{ label: "L", value: "V", explanation: "E" }], accessibleExplanation: "A", keyTakeaway: "K" },
                memory: { hook: "H", meaning: "M", example: "Ex", keyTakeaway: "K" }
              }
            },
            { id: "return-values", name: "Return Values", description: "Outputs.",
              learningModes: {
                text: { explanation: "E", example: "Ex", keyTakeaway: "K" },
                story: { title: "T", story: "S", connection: "C", keyTakeaway: "K" },
                visual: { title: "T", steps: [{ label: "L", value: "V", explanation: "E" }], accessibleExplanation: "A", keyTakeaway: "K" },
                memory: { hook: "H", meaning: "M", example: "Ex", keyTakeaway: "K" }
              }
            },
            { id: "function-calls", name: "Function Calls", description: "Executing.",
              learningModes: {
                text: { explanation: "E", example: "Ex", keyTakeaway: "K" },
                story: { title: "T", story: "S", connection: "C", keyTakeaway: "K" },
                visual: { title: "T", steps: [{ label: "L", value: "V", explanation: "E" }], accessibleExplanation: "A", keyTakeaway: "K" },
                memory: { hook: "H", meaning: "M", example: "Ex", keyTakeaway: "K" }
              }
            }
          ],
          initialQuestion: { id: "q1", conceptId: "parameters", prompt: "Q?", options: ["A","B","C","D"], correctAnswer: "A", retryHint: "H." },
          mission: { title: "M", goal: "G", instructions: "I", starterContent: "s", rubric: ["r"] }
        }
      }
    });
    // Simulate 2 wrong answers → triggers recovery
    const afterFirst = learnerReducer(base, {
      type: "SUBMIT_PRACTICE_ANSWER",
      payload: { questionId: "q1", concept: "parameters", answer: "B", correct: false }
    });
    stateInRecovery = learnerReducer(afterFirst, {
      type: "SUBMIT_PRACTICE_ANSWER",
      payload: { questionId: "q1", concept: "parameters", answer: "C", correct: false }
    });
  });

  test("Test R1: Recovery is triggered after 2 wrong answers", () => {
    expect(stateInRecovery.recovery.triggered).toBe(true);
    expect(stateInRecovery.phase).toBe("recoveryDiagnosis");
  });

  test("Test R2: RECOVERY_DIAGNOSIS_ERROR sets status to error but keeps phase as recoveryDiagnosis", () => {
    const loading = learnerReducer(stateInRecovery, { type: "START_RECOVERY_DIAGNOSIS" });
    const errored = learnerReducer(loading, { type: "RECOVERY_DIAGNOSIS_ERROR" });

    expect(errored.recovery.diagnosisStatus).toBe("error");
    expect(errored.phase).toBe("recoveryDiagnosis");
    // Progress must be preserved
    expect(errored.consecutiveFailures).toBe(2);
    expect(errored.attempts.length).toBe(2);
  });

  test("Test R3: RECOVERY_DIAGNOSIS_ERROR does not alter mastery", () => {
    const masteryBefore = stateInRecovery.concepts["parameters"].mastery;
    const loading = learnerReducer(stateInRecovery, { type: "START_RECOVERY_DIAGNOSIS" });
    const errored = learnerReducer(loading, { type: "RECOVERY_DIAGNOSIS_ERROR" });

    expect(errored.concepts["parameters"].mastery).toBe(masteryBefore);
  });

  test("Test R4: RECOVERY_CONTENT_ERROR keeps learner in valid recovery phase (recoverySelection)", () => {
    const diagnosed = learnerReducer(stateInRecovery, {
      type: "SET_RECOVERY_DIAGNOSIS",
      payload: { misconception: "Confused about scope", recommendedMode: "story" }
    });
    const selected = learnerReducer(diagnosed, {
      type: "SELECT_RECOVERY_MODE",
      payload: { selectedMode: "story" }
    });
    const loading = learnerReducer(selected, { type: "START_RECOVERY_CONTENT" });
    const errored = learnerReducer(loading, { type: "RECOVERY_CONTENT_ERROR" });

    expect(errored.recovery.contentStatus).toBe("error");
    // Phase must still be recoverySelection — learner can retry
    expect(errored.phase).toBe("recoverySelection");
    // Attempts must not change — no double-counting
    expect(errored.attempts.length).toBe(2);
  });

  test("Test R5: RECOVERY_CONTENT_ERROR does not change mastery", () => {
    const masteryBefore = stateInRecovery.concepts["parameters"].mastery;
    const diagnosed = learnerReducer(stateInRecovery, {
      type: "SET_RECOVERY_DIAGNOSIS",
      payload: { misconception: "Confused about scope", recommendedMode: "story" }
    });
    const selected = learnerReducer(diagnosed, {
      type: "SELECT_RECOVERY_MODE",
      payload: { selectedMode: "story" }
    });
    const loading = learnerReducer(selected, { type: "START_RECOVERY_CONTENT" });
    const errored = learnerReducer(loading, { type: "RECOVERY_CONTENT_ERROR" });

    expect(errored.concepts["parameters"].mastery).toBe(masteryBefore);
  });

  test("Test R6: After RECOVERY_CONTENT_ERROR, learner can re-select mode (retry)", () => {
    const diagnosed = learnerReducer(stateInRecovery, {
      type: "SET_RECOVERY_DIAGNOSIS",
      payload: { misconception: "Confused about scope", recommendedMode: "story" }
    });
    const errored = learnerReducer(diagnosed, { type: "RECOVERY_CONTENT_ERROR" });

    // Re-selecting a mode must be possible (contentStatus resets to loading)
    const retryStart = learnerReducer(errored, {
      type: "SELECT_RECOVERY_MODE",
      payload: { selectedMode: "visual" }
    });
    const retryLoad = learnerReducer(retryStart, { type: "START_RECOVERY_CONTENT" });
    expect(retryLoad.recovery.contentStatus).toBe("loading");
    expect(retryLoad.recovery.selectedMode).toBe("visual");
  });

  test("Test R7: Successful Recovery proceeds to recoveryContent phase", () => {
    const diagnosed = learnerReducer(stateInRecovery, {
      type: "SET_RECOVERY_DIAGNOSIS",
      payload: { misconception: "Confused about scope", recommendedMode: "story" }
    });
    const selected = learnerReducer(diagnosed, {
      type: "SELECT_RECOVERY_MODE",
      payload: { selectedMode: "story" }
    });
    const loading = learnerReducer(selected, { type: "START_RECOVERY_CONTENT" });
    const success = learnerReducer(loading, {
      type: "SET_RECOVERY_CONTENT_SUCCESS",
      payload: {
        recoveryContent: {
          mode: "story",
          title: "Story Title",
          story: "Once upon a time...",
          connection: "This connects to parameters because...",
          keyTakeaway: "Remember this.",
          reTestQuestion: {
            question: "What does a parameter do?",
            options: ["A", "B", "C", "D"],
            correctOptionIndex: 0
          }
        }
      }
    });

    expect(success.phase).toBe("recoveryContent");
    expect(success.recovery.contentStatus).toBe("success");
    expect(success.recovery.recoveryContent).not.toBeNull();
  });

  test("Test R8: Successful retest proceeds to mission phase", () => {
    const retestState: LearnerState = { ...stateInRecovery, phase: "retest" };
    const passed = learnerReducer(retestState, {
      type: "SUBMIT_RETEST",
      payload: { questionId: "qr1", concept: "parameters", answer: "A", correct: true }
    });
    expect(passed.phase).toBe("mission");
    expect(passed.recovery.recovered).toBe(true);
  });

  test("Test R9: Failed retest does not advance to mission", () => {
    const retestState: LearnerState = { ...stateInRecovery, phase: "retest" };
    const failed = learnerReducer(retestState, {
      type: "SUBMIT_RETEST",
      payload: { questionId: "qr1", concept: "parameters", answer: "B", correct: false }
    });
    expect(failed.phase).toBe("retest");
    expect(failed.recovery.recovered).toBe(false);
  });

  test("Test R10: Mission passes → missionResult phase", () => {
    const missionState: LearnerState = { ...stateInRecovery, phase: "mission" };
    const result = learnerReducer(missionState, {
      type: "SET_MISSION_RESULT",
      payload: { passed: true, feedback: "Great!", weakness: null }
    });
    expect(result.phase).toBe("missionResult");
    expect(result.mission.passed).toBe(true);
  });

  test("Test R11: Next action dispatch transitions to nextAction phase", () => {
    const missionDone: LearnerState = { ...stateInRecovery, phase: "missionResult" };
    const started = learnerReducer(missionDone, { type: "START_NEXT_ACTION" });
    expect(started.phase).toBe("nextAction");
  });
});

describe("Extracted Pure Reducer Helpers", () => {
  test("Test H1: initializeConcepts sets up concepts correctly", () => {
    const concepts = [
      { id: "c1", name: "C1", description: "Desc1", learningModes: {} as any },
      { id: "c2", name: "C2", description: "Desc2", learningModes: {} as any }
    ];
    const initialMap = initializeConcepts(concepts);
    expect(initialMap["c1"]).toEqual({
      id: "c1",
      name: "C1",
      description: "Desc1",
      mastery: 0,
      attempts: 0,
      correctAttempts: 0,
      incorrectAttempts: 0,
      recentOutcome: null,
    });
  });

  test("Test H2: computePracticeAnswerUpdate correct answer", () => {
    const conceptState = {
      id: "c1", name: "C1", description: "D", mastery: 50,
      attempts: 2, correctAttempts: 1, incorrectAttempts: 1, recentOutcome: "incorrect" as const
    };
    const update = computePracticeAnswerUpdate(conceptState, true, 1, "q1", "c1", "ans");
    expect(update.newConceptState.mastery).toBe(62);
    expect(update.newConceptState.attempts).toBe(3);
    expect(update.newConceptState.correctAttempts).toBe(2);
    expect(update.newConceptState.recentOutcome).toBe("correct");
    expect(update.newConsecutiveFailures).toBe(0);
    expect(update.shouldTriggerRecovery).toBe(false);
  });

  test("Test H3: computePracticeAnswerUpdate incorrect answer triggers recovery at 2 failures", () => {
    const conceptState = {
      id: "c1", name: "C1", description: "D", mastery: 50,
      attempts: 2, correctAttempts: 1, incorrectAttempts: 1, recentOutcome: "correct" as const
    };
    const update = computePracticeAnswerUpdate(conceptState, false, 1, "q1", "c1", "ans");
    expect(update.newConceptState.mastery).toBe(42);
    expect(update.newConceptState.attempts).toBe(3);
    expect(update.newConceptState.incorrectAttempts).toBe(2);
    expect(update.newConceptState.recentOutcome).toBe("incorrect");
    expect(update.newConsecutiveFailures).toBe(2);
    expect(update.shouldTriggerRecovery).toBe(true);
  });

  test("Test H4: computeRetestAnswerUpdate correct answer", () => {
    const conceptState = {
      id: "c1", name: "C1", description: "D", mastery: 40,
      attempts: 2, correctAttempts: 1, incorrectAttempts: 1, recentOutcome: "incorrect" as const
    };
    const update = computeRetestAnswerUpdate(conceptState, true, 2, "q1", "c1", "ans");
    expect(update.newConceptState.mastery).toBe(58);
    expect(update.newConceptState.attempts).toBe(3);
    expect(update.newConsecutiveFailures).toBe(0);
    expect(update.nextPhase).toBe("mission");
  });

  test("Test H5: computeMissionResultUpdate updates mastery correctly with hint", () => {
    const conceptState = {
      id: "c1", name: "C1", description: "D", mastery: 50,
      attempts: 2, correctAttempts: 1, incorrectAttempts: 1, recentOutcome: "correct" as const
    };
    const newMastery = computeMissionResultUpdate(conceptState, true, true);
    expect(newMastery).toBe(67);
  });

  test("Test H6: computeMissionResultUpdate updates mastery correctly without hint", () => {
    const conceptState = {
      id: "c1", name: "C1", description: "D", mastery: 50,
      attempts: 2, correctAttempts: 1, incorrectAttempts: 1, recentOutcome: "correct" as const
    };
    const newMastery = computeMissionResultUpdate(conceptState, false, false);
    expect(newMastery).toBe(40);
  });
});


