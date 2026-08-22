import { useReducer, useEffect, useState } from "react";
import { learnerReducer } from "./state/learnerReducer";
import { initialLearnerState } from "./state/initialState";
import { loadLearnerState, saveLearnerState } from "./lib/storage";
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
  const retestQuestionId = "q_add_retest";
  const retestCorrectAnswer = "5";
  const retestOptions = ["2", "3", "5", "6"];

  const handleRetestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetestOption) return;

    const correct = selectedRetestOption === retestCorrectAnswer;
    dispatch({
      type: "SUBMIT_RETEST",
      payload: {
        questionId: retestQuestionId,
        concept: "parameters",
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

  // Mocking AI diagnosis during P0 development
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

  const handleMockRecoveryContent = () => {
    dispatch({ type: "START_RECOVERY_CONTENT" });
    setTimeout(() => {
      dispatch({ type: "SET_RECOVERY_CONTENT_SUCCESS" });
    }, 600);
  };

  const mockRecoveryContent = state.recovery.selectedMode ? {
    title: `Tailored Parameter Explanation (${state.recovery.selectedMode.toUpperCase()})`,
    mode: state.recovery.selectedMode,
    shortExplanation: `Here is a custom ${state.recovery.selectedMode} explanation based on your struggle with Python function parameters.`,
    content: {
      text: state.recovery.selectedMode === "story" 
        ? "Imagine you are running a juice bar. A customer walks in and gives you a cup of apples. The apples are the parameters (inputs) you put into the juicer. The juicer runs, processes the apples, and pours out apple juice. In Python, parameters are like those apples: they are variables that receive whatever data you pass to the function when you call it."
        : state.recovery.selectedMode === "memory"
        ? "Think of PARAMS: Placeholder variables Receive Actual arguments to Machine Slots. Parameters are inside the function definition, arguments are the values you pass when calling it."
        : undefined,
      visualSteps: state.recovery.selectedMode === "visual"
        ? [
            { step: 1, label: "Define double(number)", accessibleExplanation: "We define a function double that takes a parameter named number." },
            { step: 2, label: "Call double(4)", accessibleExplanation: "We call the function, passing the value 4 as the input argument." },
            { step: 3, label: "number = 4", accessibleExplanation: "The parameter 'number' is assigned the value 4 inside the function." },
            { step: 4, label: "Return number * 2 = 8", accessibleExplanation: "The function calculates 4 times 2 and returns 8." }
          ]
        : undefined
    },
    keyTakeaway: "Parameters behave like local variables that are initialized with the values passed as arguments during a function call."
  } : null;

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
            <p className="recovery-desc">
              You've tried this twice. The next step is to diagnose the misconception and select a recovery explanation style.
            </p>
            <div className="dev-banner">
              <p><strong>P0 Development Status:</strong> Gemini Misconception Diagnosis is pending connection.</p>
              <p>Please select a mock diagnosis recommendation to proceed:</p>
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
          </div>
        )}

        {state.phase === "recoverySelection" && (
          <div className="learning-card">
            <RecoveryMode
              recommendedMode={state.recovery.recommendedMode}
              selectedMode={state.recovery.selectedMode}
              isLoading={state.recovery.contentStatus === "loading"}
              onSelectMode={(selectedMode) => {
                dispatch({ type: "SELECT_RECOVERY_MODE", payload: { selectedMode } });
                handleMockRecoveryContent();
              }}
            />
          </div>
        )}

        {state.phase === "recoveryContent" && (
          <RecoveryContent
            content={mockRecoveryContent}
            onContinueToRetest={() => dispatch({ type: "START_RETEST" })}
          />
        )}

        {state.phase === "retest" && (
          <div className="learning-card retest-stage">
            <div className="card-header recovery-header">
              <span className="card-badge recovery-badge">Recovery Verification</span>
              {state.recovery.recovered === false && (
                <span className="retest-status-badge fail">Retest Failed</span>
              )}
            </div>

            <h3 className="retest-title">Re-test: Verify parameter outputs</h3>
            <p className="retest-desc">
              Solve this related question to verify your understanding.
            </p>

            <pre className="code-block">
              <code>{`def add(a, b):
    return a + b

result = add(2, 3)`}</code>
            </pre>

            <p className="question-text">What value is stored in <code>result</code>?</p>

            {!retestSubmitted ? (
              <form onSubmit={handleRetestSubmit} className="retest-form">
                <fieldset className="options-fieldset">
                  <legend className="sr-only">Choose one answer option</legend>
                  <div className="options-list">
                    {retestOptions.map((option) => (
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
                      onClick={() => dispatch({ type: "START_MISSION" })}
                    >
                      Advance to Mission
                    </button>
                  </div>
                ) : (
                  <div className="feedback-incorrect">
                    <p className="feedback-msg">
                      Not quite. <code>add(2, 3)</code> sums the parameter inputs to produce <code>5</code>.
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
                        onClick={() => dispatch({ type: "START_MISSION" })}
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
          <MissionCard
            missionState={state.mission}
            onSaveSubmission={(submission) => dispatch({ type: "SET_MISSION_SUBMISSION", payload: { submission } })}
            onUseHint={() => dispatch({ type: "SET_HINT_USED" })}
            onSubmitMission={() => dispatch({ type: "START_MISSION_EVALUATION" })}
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
              onClick={() => dispatch({ type: "START_NEXT_ACTION" })}
            >
              Determine Next Step
            </button>
          </div>
        )}

        {state.phase === "nextAction" && (
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
