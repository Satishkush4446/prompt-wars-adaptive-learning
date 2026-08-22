import { describe, test, expect, beforeEach } from "vitest";
import { learnerReducer } from "./learnerReducer";
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
    { id: "parameters", name: "Parameters", description: "Function inputs." },
    { id: "returnValues", name: "Return values", description: "Function outputs." },
    { id: "functionCalls", name: "Function calls", description: "Executing functions." }
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
    // Initialize concepts state dynamically using mockLesson
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
    expect(nextState.phase).toBe("retest"); // Preserved failed recovery state without loop
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

    // Correct answer pushes over 100
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

    // Incorrect answer pushes below 0
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
    // 1. Missing data should return initial state
    clearLearnerState();
    const loadedFromEmpty = loadLearnerState();
    expect(loadedFromEmpty).toEqual(initialLearnerState);

    // 2. Corrupt string that fails JSON.parse should fallback safely
    localStorage.setItem("adaptive-learning-state-v2", "corrupt-json-{");
    const loadedFromCorrupt = loadLearnerState();
    expect(loadedFromCorrupt).toEqual(initialLearnerState);

    // 3. Valid JSON but invalid structure (missing fields or wrong types) should fallback safely
    localStorage.setItem("adaptive-learning-state-v2", JSON.stringify({ phase: "invalidPhase", concepts: {} }));
    const loadedFromInvalid = loadLearnerState();
    expect(loadedFromInvalid).toEqual(initialLearnerState);

    // 4. Valid save and load should work perfectly
    state.concepts.parameters.mastery = 42;
    state.phase = "practice";
    saveLearnerState(state);
    const loadedValidState = loadLearnerState();
    expect(loadedValidState.concepts.parameters.mastery).toBe(42);
    expect(loadedValidState.phase).toBe("practice");
  });
});
