import { useReducer, useEffect, useState } from "react";
import { learnerReducer } from "./state/learnerReducer";
import { initialLearnerState } from "./state/initialState";
import { loadLearnerState, saveLearnerState } from "./lib/storage";
import {
  diagnoseMisconception,
  generateRecovery,
  evaluateMission,
  getNextBestAction
} from "./lib/aiClient";
import type { RecoveryContentData } from "./lib/aiClient";
import type { RecoveryMode as RecoveryModeType } from "./state/learnerTypes";

import LearnerStateCard from "./components/LearnerStateCard";
import QuestionCard from "./components/QuestionCard";
import RecoveryMode from "./components/RecoveryMode";
import RecoveryContent from "./components/RecoveryContent";
import MissionCard from "./components/MissionCard";
import NextActionCard from "./components/NextActionCard";

import "./App.css";

function App() {
  const [state, dispatch] = useReducer(learnerReducer, initialLearnerState, () => {
    return loadLearnerState();
  });

  const [showA11yMenu, setShowA11yMenu] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    saveLearnerState(state);
  }, [state]);

  // Apply accessibility classes to root element
  useEffect(() => {
    const root = document.documentElement;
    if (state.accessibility.largeText) root.classList.add("large-text");
    else root.classList.remove("large-text");

    if (state.accessibility.highContrast) root.classList.add("high-contrast");
    else root.classList.remove("high-contrast");

    if (state.accessibility.reducedMotion) root.classList.add("reduced-motion");
    else root.classList.remove("reduced-motion");

    if (state.accessibility.enhancedFocus) root.classList.add("enhanced-focus");
    else root.classList.remove("enhanced-focus");
  }, [state.accessibility]);

  // Re-test state variables
  const [selectedRetestOption, setSelectedRetestOption] = useState<string>("");
  const [retestSubmitted, setRetestSubmitted] = useState<boolean>(false);

  // Dynamic retest variables
  const dynamicQuestion = state.recovery.recoveryContent?.reTestQuestion;
  const retestQuestionText = dynamicQuestion?.question || "Re-test: Verify parameter outputs";
  const retestOptionsList = dynamicQuestion?.options || ["2", "3", "5", "6"];

  const handleRetestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetestOption) return;

    let correct = false;
    if (dynamicQuestion) {
      const correctIdx = dynamicQuestion.correctOptionIndex;
      const correctOptionText = dynamicQuestion.options[correctIdx];
      correct = selectedRetestOption === correctOptionText;
    } else {
      correct = selectedRetestOption === "5";
    }

    dispatch({
      type: "SUBMIT_RETEST",
      payload: {
        questionId: dynamicQuestion ? "qr_dynamic" : "q_add_retest",
        concept: state.currentConcept,
        answer: selectedRetestOption,
        correct,
      },
    });
    setRetestSubmitted(true);
  };

  const handleRetestReset = () => {
    setSelectedRetestOption("");
    setRetestSubmitted(false);
  };

  // 1. Real Misconception Diagnosis Workflow
  useEffect(() => {
    if (state.phase === "recoveryDiagnosis" && state.recovery.diagnosisStatus === "idle") {
      const runDiagnosis = async () => {
        dispatch({ type: "START_RECOVERY_DIAGNOSIS" });
        setApiError(null);
        try {
          const wrongAnswers = state.attempts
            .filter(a => a.concept === state.currentConcept && !a.correct)
            .map(a => a.answer);

          const result = await diagnoseMisconception({
            topic: "Python Functions",
            concept: state.currentConcept,
            question: "What value is stored in `answer`? (def double(number): result = number * 2; return result; answer = double(4))",
            correctAnswer: "8",
            learnerAnswers: wrongAnswers,
            attemptCount: wrongAnswers.length,
            mastery: state.concepts[state.currentConcept]?.mastery || 0,
            recoveryHistory: []
          });

          dispatch({
            type: "SET_RECOVERY_DIAGNOSIS",
            payload: {
              misconception: result.misconception,
              recommendedMode: result.recommendedMode
            }
          });
        } catch (error: any) {
          console.error("Diagnosis request failed:", error);
          dispatch({ type: "RECOVERY_DIAGNOSIS_ERROR" });
          setApiError(error.message || "Failed to diagnose misconception.");
        }
      };
      runDiagnosis();
    }
  }, [state.phase, state.recovery.diagnosisStatus, state.currentConcept, state.attempts]);

  // 2. Real Recovery Content Selection & Generation
  const handleSelectMode = async (selectedMode: RecoveryModeType) => {
    dispatch({ type: "SELECT_RECOVERY_MODE", payload: { selectedMode } });
    dispatch({ type: "START_RECOVERY_CONTENT" });
    setApiError(null);

    try {
      const wrongAnswers = state.attempts
        .filter(a => a.concept === state.currentConcept && !a.correct)
        .map(a => a.answer);

      const content = await generateRecovery({
        topic: "Python Functions",
        concept: state.currentConcept,
        question: "What value is stored in `answer`?",
        learnerAnswers: wrongAnswers,
        misconception: state.recovery.misconception || "Struggling with passing values to arguments",
        mastery: state.concepts[state.currentConcept]?.mastery || 0,
        selectedMode
      });

      dispatch({
        type: "SET_RECOVERY_CONTENT_SUCCESS",
        payload: { recoveryContent: content }
      });
    } catch (error: any) {
      console.error("Recovery generation failed:", error);
      dispatch({ type: "RECOVERY_CONTENT_ERROR" });
      setApiError(error.message || "Failed to generate recovery content.");
    }
  };

  // 3. Real Mission Evaluation
  const handleEvaluateMission = async () => {
    dispatch({ type: "START_MISSION_EVALUATION" });
    setApiError(null);
    try {
      const evaluation = await evaluateMission({
        topic: "Python Functions",
        concept: state.currentConcept,
        missionGoal: "Make total(price, quantity) calculate amount = price * quantity and return amount so total(5, 3) produces 15.",
        rubric: "Verify that the code calculates amount correctly and uses the return keyword to return amount or (price * quantity). Do not accept code that hardcodes 15 or lacks a return statement.",
        learnerSubmission: state.mission.submission,
        learnerState: state
      });

      dispatch({
        type: "SET_MISSION_RESULT",
        payload: {
          passed: evaluation.passed,
          feedback: evaluation.feedback,
          weakness: evaluation.weakness === "none" ? null : evaluation.weakness
        }
      });
    } catch (error: any) {
      console.error("Mission evaluation failed:", error);
      dispatch({ type: "MISSION_EVALUATION_ERROR" });
      setApiError(error.message || "Failed to evaluate mission.");
    }
  };

  // 4. Real Next Best Action Generation
  const handleGetNextAction = async () => {
    dispatch({ type: "START_NEXT_ACTION" });
    setApiError(null);
    try {
      const wrongAttempts = state.attempts.filter(a => !a.correct);
      const recommendation = await getNextBestAction({
        concepts: state.concepts,
        recentAttempts: wrongAttempts.map(a => ({ concept: a.concept, correct: a.correct, answer: a.answer })),
        recoveryResult: state.recovery.recovered,
        recoveryMode: state.recovery.selectedMode,
        missionResult: state.mission.passed,
        missionWeakness: state.mission.weakness,
        hintUsed: state.mission.hintUsed
      });

      dispatch({
        type: "SET_NEXT_ACTION",
        payload: { nextAction: recommendation }
      });
    } catch (error: any) {
      console.error("Next action request failed:", error);
      dispatch({ type: "NEXT_ACTION_ERROR" });
      setApiError(error.message || "Failed to determine next best action.");
    }
  };

  // Map phases to progress indicator
  const getProgressStage = (): "Learn" | "Practice" | "Recover" | "Apply" | "Guide" => {
    const { phase } = state;
    if (phase === "welcome" || phase === "intro") return "Learn";
    if (phase === "practice") return "Practice";
    if (
      phase === "recoveryDiagnosis" ||
      phase === "recoverySelection" ||
      phase === "recoveryContent" ||
      phase === "retest"
    ) {
      return "Recover";
    }
    if (phase === "mission" || phase === "missionResult") return "Apply";
    return "Guide";
  };

  const currentProgressStage = getProgressStage();

  // Accessibility toggle helpers
  const toggleA11y = (key: "largeText" | "highContrast" | "reducedMotion" | "enhancedFocus") => {
    dispatch({
      type: "SET_ACCESSIBILITY_PREFERENCE",
      payload: {
        key,
        value: !state.accessibility[key],
      },
    });
  };

  // Mock handlers only rendered in local DEV mode
  const handleMockDiagnosis = (mode: RecoveryModeType) => {
    dispatch({ type: "START_RECOVERY_DIAGNOSIS" });
    setTimeout(() => {
      dispatch({
        type: "SET_RECOVERY_DIAGNOSIS",
        payload: {
          misconception: "Learner believes parameters are hardcoded and not variable inputs.",
          recommendedMode: mode,
        },
      });
    }, 600);
  };

  const handleMockRecoveryContent = (mode: RecoveryModeType) => {
    dispatch({ type: "START_RECOVERY_CONTENT" });
    const mockContent: RecoveryContentData = {
      mode: mode as any,
      title: `Tailored Parameter Explanation (${mode.toUpperCase()})`,
      keyTakeaway: "Parameters are placeholders initialized with passed argument values.",
      reTestQuestion: {
        question: "What value is returned by add(2, 3)?",
        options: ["2", "3", "5", "6"],
        correctOptionIndex: 2
      },
      ...(mode === "story" ? {
        story: "Think of parameters like mailbox slots. When you call double(4), you drop 4 in the mailbox slot.",
        connection: "The slot variable receives 4."
      } : mode === "memory" ? {
        hook: "PARAMS",
        meaning: "Placeholder variables Receive Actual Arguments.",
        example: "def double(number): where number is parameter."
      } : {
        steps: [{ label: "Input", value: "4", explanation: "4 is passed as argument" }],
        accessibleExplanation: "Visual diagram of value flow."
      })
    } as any;

    setTimeout(() => {
      dispatch({ 
        type: "SET_RECOVERY_CONTENT_SUCCESS", 
        payload: { recoveryContent: mockContent } 
      });
    }, 600);
  };

  return (
    <div className="app-container">
      {/* Persistent App Header */}
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-logo" aria-hidden="true">⇄</span>
          <h1>Adapt <span className="brand-sub">AI Learning</span></h1>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary a11y-toggle"
            aria-expanded={showA11yMenu}
            aria-haspopup="true"
            onClick={() => setShowA11yMenu(!showA11yMenu)}
          >
            ♿ Accessibility Settings
          </button>

          {showA11yMenu && (
            <div className="a11y-dropdown" role="menu">
              <div className="a11y-dropdown-header">Visual & Interaction Modes</div>
              
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={state.accessibility.largeText}
                className={`a11y-dropdown-item ${state.accessibility.largeText ? "checked" : ""}`}
                onClick={() => toggleA11y("largeText")}
              >
                <span>Larger Text</span>
                <span className="checkbox-indicator">{state.accessibility.largeText ? "✓" : ""}</span>
              </button>

              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={state.accessibility.highContrast}
                className={`a11y-dropdown-item ${state.accessibility.highContrast ? "checked" : ""}`}
                onClick={() => toggleA11y("highContrast")}
              >
                <span>High Contrast</span>
                <span className="checkbox-indicator">{state.accessibility.highContrast ? "✓" : ""}</span>
              </button>

              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={state.accessibility.reducedMotion}
                className={`a11y-dropdown-item ${state.accessibility.reducedMotion ? "checked" : ""}`}
                onClick={() => toggleA11y("reducedMotion")}
              >
                <span>Reduced Motion</span>
                <span className="checkbox-indicator">{state.accessibility.reducedMotion ? "✓" : ""}</span>
              </button>

              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={state.accessibility.enhancedFocus}
                className={`a11y-dropdown-item ${state.accessibility.enhancedFocus ? "checked" : ""}`}
                onClick={() => toggleA11y("enhancedFocus")}
              >
                <span>Enhanced Focus Ring</span>
                <span className="checkbox-indicator">{state.accessibility.enhancedFocus ? "✓" : ""}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Progress Journey Indicator */}
      <nav className="progress-nav" aria-label="Learning Stage Progress">
        <ul className="progress-stages">
          {(["Learn", "Practice", "Recover", "Apply", "Guide"] as const).map((stage) => (
            <li 
              key={stage} 
              className={`stage-item ${currentProgressStage === stage ? "active" : ""}`}
              aria-current={currentProgressStage === stage ? "step" : undefined}
            >
              <span className="stage-dot" />
              <span className="stage-name">{stage}</span>
            </li>
          ))}
        </ul>
      </nav>

      {/* Learner State Card Summary */}
      <div className="state-card-container">
        <LearnerStateCard state={state} />
      </div>

      {/* Main Experience Container */}
      <main className="main-content">
        {state.phase === "welcome" && (
          <div className="welcome-stage centered-card">
            <h2 className="welcome-headline">Learning that adapts when you need it most.</h2>
            <p className="welcome-desc">
              We notice where you're struggling, change the approach, and guide your next step.
            </p>
            <div className="welcome-subject-box">
              <span className="subject-label">Primary Topic</span>
              <h3 className="subject-title">Python Functions</h3>
              <p className="subject-concepts">Parameters · Return values · Function calls</p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={() => dispatch({ type: "START_LEARNING" })}
            >
              Start Learning
            </button>
          </div>
        )}

        {state.phase === "intro" && (
          <div className="intro-stage learning-card">
            <div className="card-header">
              <span className="card-badge">Today's Focus</span>
            </div>
            <h2 className="intro-title">Understand how information moves through a Python function.</h2>
            
            <div className="intro-explanation">
              <p>A Python function is like a reusable assembly machine. It follows a simple three-step cycle:</p>
              <ol className="intro-flow-list">
                <li>
                  <strong>Parameters (Inputs):</strong> Values you pass into the function to work with.
                </li>
                <li>
                  <strong>Function Body (Processing):</strong> The action or calculation performed inside the function.
                </li>
                <li>
                  <strong>Return Value (Outputs):</strong> The final resulting data sent back to the rest of your program.
                </li>
              </ol>
            </div>

            <div className="intro-diagram" aria-hidden="true">
              <div className="diagram-box">INPUT (Parameters)</div>
              <div className="diagram-arrow">↓</div>
              <div className="diagram-box highlighted">FUNCTION BODY</div>
              <div className="diagram-arrow">↓</div>
              <div className="diagram-box">OUTPUT (Return Value)</div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => dispatch({ type: "GO_TO_PRACTICE" })}
            >
              Try Practice Question
            </button>
          </div>
        )}

        {state.phase === "practice" && (
          <QuestionCard
            currentAttemptCount={state.concepts.parameters.attempts}
            recentOutcome={state.concepts.parameters.recentOutcome}
            onSubmitAnswer={(payload) => dispatch({ type: "SUBMIT_PRACTICE_ANSWER", payload })}
            onContinue={() => dispatch({ type: "START_MISSION" })}
            onHelpRequest={() => dispatch({ type: "REQUEST_HELP" })}
          />
        )}

        {state.phase === "recoveryDiagnosis" && (
          <div className="learning-card recovery-diagnosis-pending">
            <div className="card-header recovery-header">
              <span className="card-badge recovery-badge">Struggle Detected</span>
            </div>
            <h3 className="recovery-title">Let's change the approach.</h3>
            
            {state.recovery.diagnosisStatus === "loading" ? (
              <div className="status-loading-spinner" role="status" aria-live="polite">
                <p className="loading-text">Understanding where you're stuck…</p>
              </div>
            ) : state.recovery.diagnosisStatus === "error" ? (
              <div className="error-alert" role="alert">
                <p className="error-msg">
                  ⚠️ We couldn't diagnose your misconception right now. Your progress is saved.
                </p>
                {apiError && <p className="error-detail">{apiError}</p>}
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => dispatch({ type: "REQUEST_HELP" })}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <p className="recovery-desc">
                Analyzing your wrong answers to customize the learning experience...
              </p>
            )}

            {import.meta.env.DEV && (
              <div className="dev-banner">
                <p><strong>Dev Mocks:</strong> Bypasses real diagnosis call</p>
                <div className="button-group dev-buttons">
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleMockDiagnosis("story")}
                  >
                    Mock Diagnose "Story"
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleMockDiagnosis("visual")}
                  >
                    Mock Diagnose "Visual"
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleMockDiagnosis("memory")}
                  >
                    Mock Diagnose "Memory"
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {state.phase === "recoverySelection" && (
          <div className="learning-card">
            {apiError && (
              <div className="error-alert mb-4" role="alert">
                <p className="error-msg">⚠️ Failed to generate custom recovery: {apiError}</p>
              </div>
            )}

            <RecoveryMode
              recommendedMode={state.recovery.recommendedMode}
              selectedMode={state.recovery.selectedMode}
              isLoading={state.recovery.contentStatus === "loading"}
              onSelectMode={handleSelectMode}
            />

            {import.meta.env.DEV && (
              <div className="dev-banner mt-4">
                <p><strong>Dev Mocks:</strong> Bypass real explanation generation</p>
                <div className="button-group dev-buttons">
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleMockRecoveryContent("story")}
                  >
                    Mock Story Content
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleMockRecoveryContent("visual")}
                  >
                    Mock Visual Content
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleMockRecoveryContent("memory")}
                  >
                    Mock Memory Content
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {state.phase === "recoveryContent" && (
          <div className="learning-card">
            {state.recovery.contentStatus === "loading" ? (
              <div className="status-loading-spinner" role="status" aria-live="polite">
                <p className="loading-text">Creating a different explanation…</p>
              </div>
            ) : (
              <RecoveryContent
                content={state.recovery.recoveryContent}
                onContinueToRetest={() => dispatch({ type: "START_RETEST" })}
              />
            )}
          </div>
        )}

        {state.phase === "retest" && (
          <div className="learning-card retest-stage">
            <div className="card-header recovery-header">
              <span className="card-badge recovery-badge">Recovery Verification</span>
              {state.recovery.recovered === false && (
                <span className="retest-status-badge fail">Retest Failed</span>
              )}
            </div>

            <h3 className="retest-title">{retestQuestionText}</h3>
            <p className="retest-desc">
              Solve this related question to verify your understanding.
            </p>

            {!dynamicQuestion && (
              <pre className="code-block">
                <code>{`def add(a, b):
    return a + b

result = add(2, 3)`}</code>
              </pre>
            )}

            {!retestSubmitted ? (
              <form onSubmit={handleRetestSubmit} className="retest-form">
                <fieldset className="options-fieldset">
                  <legend className="sr-only">Choose one answer option</legend>
                  <div className="options-list">
                    {retestOptionsList.map((option: string) => (
                      <label 
                        key={option} 
                        className={`option-label ${selectedRetestOption === option ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="retest-option"
                          value={option}
                          checked={selectedRetestOption === option}
                          onChange={(e) => setSelectedRetestOption(e.target.value)}
                          className="sr-only"
                        />
                        <span className="custom-radio" aria-hidden="true" />
                        <span className="option-text">{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={!selectedRetestOption}
                >
                  Submit Re-test
                </button>
              </form>
            ) : (
              <div className="feedback-section" role="status" aria-live="polite">
                {state.recovery.recovered ? (
                  <div className="feedback-correct">
                    <p className="feedback-msg">✓ Excellent! You successfully recovered the concept of parameters.</p>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={() => {
                        dispatch({ type: "START_MISSION" });
                        handleRetestReset();
                      }}
                    >
                      Advance to Mission
                    </button>
                  </div>
                ) : (
                  <div className="feedback-incorrect">
                    <p className="feedback-msg">
                      Not quite. That answer was incorrect.
                    </p>
                    <div className="button-group">
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={handleRetestReset}
                      >
                        Try Retest Again
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => {
                          dispatch({ type: "START_MISSION" });
                          handleRetestReset();
                        }}
                      >
                        Continue to Mission (Skip Retest)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {state.phase === "mission" && (
          <div>
            {state.mission.evaluationStatus === "error" && (
              <div className="error-alert mb-4" role="alert">
                <p className="error-msg">⚠️ Evaluation failed: {apiError || "Unable to contact evaluation service."}</p>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm" 
                  onClick={handleEvaluateMission}
                >
                  Retry Evaluation
                </button>
              </div>
            )}

            <MissionCard
              missionState={state.mission}
              onSaveSubmission={(submission) => dispatch({ type: "SET_MISSION_SUBMISSION", payload: { submission } })}
              onUseHint={() => dispatch({ type: "SET_HINT_USED" })}
              onSubmitMission={handleEvaluateMission}
              onDevelopmentMockEvaluation={(passed) => {
                dispatch({
                  type: "SET_MISSION_RESULT",
                  payload: {
                    passed,
                    feedback: passed 
                      ? "Great job returning the calculated amount!" 
                      : "The function calculates the amount, but fails to send it back using return.",
                    weakness: passed ? null : "returnValues",
                  },
                });
              }}
            />
          </div>
        )}

        {state.phase === "missionResult" && (
          <div className="learning-card mission-result-card">
            <div className="card-header mission-header">
              <span className="card-badge mission-badge">Mission Evaluation</span>
            </div>

            <h3 className="mission-title">Mission Results</h3>

            <div className="evaluation-box" role="status" aria-live="polite">
              {state.mission.passed ? (
                <div className="eval-status pass">✓ MISSION PASSED</div>
              ) : (
                <div className="eval-status fail">✗ MISSION FAILED</div>
              )}

              <p className="eval-feedback"><strong>Feedback:</strong> {state.mission.feedback}</p>
              
              {state.mission.weakness && (
                <p className="eval-weakness text-danger">
                  <strong>Concept Focus Required:</strong> Return Values
                </p>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGetNextAction}
            >
              Determine Next Step
            </button>
          </div>
        )}

        {state.phase === "nextAction" && (
          <div>
            {apiError && (
              <div className="error-alert mb-4" role="alert">
                <p className="error-msg">⚠️ Failed to determine next step: {apiError}</p>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleGetNextAction}>
                  Retry Action Gen
                </button>
              </div>
            )}

            <NextActionCard
              nextAction={state.nextAction}
              onReset={() => dispatch({ type: "RESET_LEARNING_SESSION" })}
              onDevelopmentMockNextAction={(action) => {
                dispatch({
                  type: "SET_NEXT_ACTION",
                  payload: { nextAction: action },
                });
              }}
            />
          </div>
        )}
      </main>

      {/* Global polite announcer for accessibility */}
      <div className="sr-only" role="status" aria-live="polite">
        Current phase: {state.phase}. Mastery score is {state.concepts[state.currentConcept]?.mastery || 0}% for {state.currentConcept}.
      </div>
    </div>
  );
}

export default App;
