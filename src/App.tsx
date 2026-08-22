import { useReducer, useEffect, useState, useRef } from "react";
import { learnerReducer } from "./state/learnerReducer";
import { initialLearnerState } from "./state/initialState";
import { loadLearnerState, saveLearnerState } from "./lib/storage";
import {
  diagnoseMisconception,
  generateRecovery,
  evaluateMission,
  getNextBestAction,
  generateLesson
} from "./lib/aiClient";
import type { RecoveryContentData } from "./lib/aiClient";
import type { RecoveryMode as RecoveryModeType } from "./state/learnerTypes";

import LearnerStateCard from "./components/LearnerStateCard";
import QuestionCard from "./components/QuestionCard";
import RecoveryMode from "./components/RecoveryMode";
import RecoveryContent from "./components/RecoveryContent";
import MissionCard from "./components/MissionCard";
import NextActionCard from "./components/NextActionCard";
import ListenButton from "./components/ListenButton";

import "./App.css";

function App() {
  const [state, dispatch] = useReducer(learnerReducer, initialLearnerState, () => {
    return loadLearnerState();
  });

  const [showA11yMenu, setShowA11yMenu] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [topicText, setTopicText] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);

  const a11yButtonRef = useRef<HTMLButtonElement>(null);
  const a11yMenuRef = useRef<HTMLDivElement>(null);

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

  // Accessibility popover keyboard trap and escape handling
  useEffect(() => {
    if (showA11yMenu) {
      // Focus the first action in menu
      const firstItem = a11yMenuRef.current?.querySelector("button");
      if (firstItem instanceof HTMLElement) {
        firstItem.focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setShowA11yMenu(false);
          a11yButtonRef.current?.focus();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showA11yMenu]);

  // Stop active speech narration whenever the learning phase transitions
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [state.phase]);

  // Re-test state variables
  const [selectedRetestOption, setSelectedRetestOption] = useState<string>("");
  const [retestSubmitted, setRetestSubmitted] = useState<boolean>(false);

  // Dynamic retest variables
  const dynamicQuestion = state.recovery.recoveryContent?.reTestQuestion;
  const retestQuestionText = dynamicQuestion?.question || "Re-test verification question";
  const retestOptionsList = dynamicQuestion?.options || [];

  const handleRetestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetestOption) return;

    let correct = false;
    if (dynamicQuestion) {
      const correctIdx = dynamicQuestion.correctOptionIndex;
      const correctOptionText = dynamicQuestion.options[correctIdx];
      correct = selectedRetestOption === correctOptionText;
    }

    dispatch({
      type: "SUBMIT_RETEST",
      payload: {
        questionId: "qr_dynamic",
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

  // Lesson Generation trigger
  const handleBuildLesson = async (e?: React.FormEvent, suggestTopic?: string) => {
    if (e) e.preventDefault();
    const finalTopic = (suggestTopic || topicText).trim();
    
    // Topic text validations
    if (finalTopic.length < 2 || finalTopic.length > 100) {
      setInputError("Topic must be between 2 and 100 characters.");
      return;
    }
    
    setInputError(null);
    setApiError(null);
    dispatch({ type: "START_LESSON_GENERATION" });

    try {
      const lesson = await generateLesson({ topic: finalTopic });
      dispatch({ type: "SET_GENERATED_LESSON", payload: { lesson } });
    } catch (error: any) {
      console.error("Lesson generation failed:", error);
      dispatch({ type: "LESSON_GENERATION_ERROR" });
      setApiError(error.message || "Failed to generate lesson path. Please try again.");
    }
  };

  // 1. Real Misconception Diagnosis Workflow
  useEffect(() => {
    const lesson = state.lesson;
    if (state.phase === "recoveryDiagnosis" && state.recovery.diagnosisStatus === "idle" && lesson) {
      const runDiagnosis = async () => {
        dispatch({ type: "START_RECOVERY_DIAGNOSIS" });
        setApiError(null);
        try {
          const wrongAnswers = state.attempts
            .filter(a => a.concept === state.currentConcept && !a.correct)
            .map(a => a.answer);

          const result = await diagnoseMisconception({
            topic: lesson.topicTitle,
            concept: state.currentConcept,
            question: lesson.initialQuestion.prompt,
            correctAnswer: lesson.initialQuestion.correctAnswer,
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
  }, [state.phase, state.recovery.diagnosisStatus, state.currentConcept, state.attempts, state.lesson]);

  // 2. Real Recovery Content Selection & Generation
  const handleSelectMode = async (selectedMode: RecoveryModeType) => {
    if (!state.lesson) return;
    dispatch({ type: "SELECT_RECOVERY_MODE", payload: { selectedMode } });
    dispatch({ type: "START_RECOVERY_CONTENT" });
    setApiError(null);

    try {
      const wrongAnswers = state.attempts
        .filter(a => a.concept === state.currentConcept && !a.correct)
        .map(a => a.answer);

      const content = await generateRecovery({
        topic: state.lesson.topicTitle,
        concept: state.currentConcept,
        question: state.lesson.initialQuestion.prompt,
        learnerAnswers: wrongAnswers,
        misconception: state.recovery.misconception || "Struggling with conceptual workflow basics",
        mastery: state.concepts[state.currentConcept]?.mastery || 0,
        selectedMode
      });

      // Visual Mode verification: MUST include non-empty accessibleExplanation
      if (selectedMode === "visual") {
        const visualData = content as any;
        if (!visualData.accessibleExplanation || visualData.accessibleExplanation.trim().length === 0) {
          throw new Error("Visual representation generated is missing an accessible explanation.");
        }
      }

      dispatch({
        type: "SET_RECOVERY_CONTENT_SUCCESS",
        payload: { recoveryContent: content }
      });
    } catch (error: any) {
      console.error("Recovery generation failed:", error);
      dispatch({ type: "RECOVERY_CONTENT_ERROR" });
      setApiError(error.message || "Failed to generate recovery explanation.");
    }
  };

  // 3. Real Mission Evaluation
  const handleEvaluateMission = async () => {
    if (!state.lesson) return;
    dispatch({ type: "START_MISSION_EVALUATION" });
    setApiError(null);
    try {
      const evaluation = await evaluateMission({
        topic: state.lesson.topicTitle,
        concept: state.currentConcept,
        missionGoal: state.lesson.mission.goal,
        rubric: state.lesson.mission.rubric,
        learnerSubmission: state.mission.submission,
        learnerState: state
      });

      // Validate dynamic weakness concept ID
      let finalWeakness = null;
      if (evaluation.weakness && evaluation.weakness !== "none" && state.concepts[evaluation.weakness]) {
        finalWeakness = evaluation.weakness;
      }

      dispatch({
        type: "SET_MISSION_RESULT",
        payload: {
          passed: evaluation.passed,
          feedback: evaluation.feedback,
          weakness: finalWeakness
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

      // Validate concept matches one of generated concepts
      let finalRec = recommendation;
      if (!state.concepts[recommendation.concept]) {
        const firstConceptId = Object.keys(state.concepts)[0];
        finalRec = { ...recommendation, concept: firstConceptId };
      }

      dispatch({
        type: "SET_NEXT_ACTION",
        payload: { nextAction: finalRec }
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

  // Pre-configured developer mock topic helpers
  const handleMockDiagnosis = (mode: RecoveryModeType) => {
    dispatch({ type: "START_RECOVERY_DIAGNOSIS" });
    setTimeout(() => {
      dispatch({
        type: "SET_RECOVERY_DIAGNOSIS",
        payload: {
          misconception: "Learner is confusing variables with structural input declarations.",
          recommendedMode: mode,
        },
      });
    }, 600);
  };

  const handleMockRecoveryContent = (mode: RecoveryModeType) => {
    dispatch({ type: "START_RECOVERY_CONTENT" });
    const mockContent: RecoveryContentData = {
      mode: mode as any,
      title: `Tailored Explanation (${mode.toUpperCase()})`,
      keyTakeaway: "Inputs function as placeholders initialized at execution.",
      reTestQuestion: {
        question: "What value completes the workflow correctly?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctOptionIndex: 2
      },
      ...(mode === "story" ? {
        story: "Think of inputs like named folders. When values enter, they are saved in that specific folder.",
        connection: "Variables receive content mapped to their names."
      } : mode === "memory" ? {
        hook: "INPUTS",
        meaning: "Initial Names Parameterize User Triggers Safely.",
        example: "def process(item): where item is the input parameter."
      } : {
        steps: [{ label: "Data Input", value: "x = value", explanation: "Value is stored in variable" }],
        accessibleExplanation: "Visual diagram demonstrating input storage sequence."
      })
    } as any;

    setTimeout(() => {
      dispatch({ 
        type: "SET_RECOVERY_CONTENT_SUCCESS", 
        payload: { recoveryContent: mockContent } 
      });
    }, 600);
  };

  // Text builder for dynamic narration
  const getIntroSpeech = () => {
    if (!state.lesson) return "";
    const conceptTexts = state.lesson.concepts.map(c => `${c.name}: ${c.description}`).join(". ");
    return `Topic: ${state.lesson.topicTitle}. Introduction: ${state.lesson.intro}. Concepts covered are: ${conceptTexts}`;
  };

  const getRetestSpeech = () => {
    return `${retestQuestionText}. Options are: ${retestOptionsList.join(", ")}`;
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
            ref={a11yButtonRef}
            type="button"
            className="btn btn-secondary a11y-toggle"
            aria-expanded={showA11yMenu}
            aria-haspopup="true"
            onClick={() => setShowA11yMenu(!showA11yMenu)}
          >
            ♿ Accessibility Settings
          </button>

          {showA11yMenu && (
            <div 
              ref={a11yMenuRef}
              className="a11y-dropdown" 
              role="dialog"
              aria-label="Accessibility presentation modifier preferences"
            >
              <div className="a11y-dropdown-header">Visual & Interaction Modes</div>
              
              <button
                type="button"
                role="checkbox"
                aria-checked={state.accessibility.largeText}
                className={`a11y-dropdown-item ${state.accessibility.largeText ? "checked" : ""}`}
                onClick={() => toggleA11y("largeText")}
              >
                <span>Larger Text</span>
                <span className="checkbox-indicator">{state.accessibility.largeText ? "✓" : ""}</span>
              </button>

              <button
                type="button"
                role="checkbox"
                aria-checked={state.accessibility.highContrast}
                className={`a11y-dropdown-item ${state.accessibility.highContrast ? "checked" : ""}`}
                onClick={() => toggleA11y("highContrast")}
              >
                <span>High Contrast</span>
                <span className="checkbox-indicator">{state.accessibility.highContrast ? "✓" : ""}</span>
              </button>

              <button
                type="button"
                role="checkbox"
                aria-checked={state.accessibility.reducedMotion}
                className={`a11y-dropdown-item ${state.accessibility.reducedMotion ? "checked" : ""}`}
                onClick={() => toggleA11y("reducedMotion")}
              >
                <span>Reduced Motion</span>
                <span className="checkbox-indicator">{state.accessibility.reducedMotion ? "✓" : ""}</span>
              </button>

              <button
                type="button"
                role="checkbox"
                aria-checked={state.accessibility.enhancedFocus}
                className={`a11y-dropdown-item ${state.accessibility.enhancedFocus ? "checked" : ""}`}
                onClick={() => toggleA11y("enhancedFocus")}
              >
                <span>Enhanced Focus Ring</span>
                <span className="checkbox-indicator">{state.accessibility.enhancedFocus ? "✓" : ""}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm mt-4 w-full"
                onClick={() => setShowA11yMenu(false)}
              >
                Close Menu
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Progress Journey Indicator */}
      <nav className="progress-nav" aria-label="Learning Stage Progress">
        <ul className="progress-stages">
          {(["Learn", "Practice", "Recover", "Apply", "Guide"] as const).map((stage) => {
            const isActive = currentProgressStage === stage;
            return (
              <li 
                key={stage} 
                className={`stage-item ${isActive ? "active" : ""}`}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="stage-dot" />
                <span className="stage-name">
                  {isActive ? `Current: ${stage}` : stage}
                </span>
              </li>
            );
          })}
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
            {state.lessonStatus === "loading" ? (
              <div className="status-loading-spinner" role="status" aria-live="polite">
                <p className="loading-text text-xl font-bold">Building your learning path…</p>
                <p className="loading-sub text-sm">Please wait while Gemini creates your curriculum.</p>
              </div>
            ) : (
              <>
                <h2 className="welcome-headline">What do you want to learn?</h2>
                <p className="welcome-desc">
                  Enter a topic and we'll build a focused learning path that adapts as you go.
                </p>

                <form onSubmit={handleBuildLesson} className="topic-input-form mt-4 w-full max-w-lg">
                  <div className="form-group flex flex-col gap-2 align-left">
                    <label htmlFor="topic-input-field" className="topic-input-label text-left font-bold">
                      Target Topic
                    </label>
                    <input
                      id="topic-input-field"
                      type="text"
                      className="topic-text-input"
                      placeholder="e.g. Fractions, Photosynthesis, Python Functions..."
                      value={topicText}
                      onChange={(e) => setTopicText(e.target.value)}
                      maxLength={100}
                      required
                    />
                    {inputError && (
                      <p className="error-text text-danger text-sm mt-1" role="alert">
                        ⚠️ {inputError}
                      </p>
                    )}
                  </div>

                  {apiError && (
                    <div className="error-alert mt-4" role="alert">
                      <p className="error-msg">⚠️ We couldn't build your learning path right now.</p>
                      <p className="error-detail text-sm mt-1">{apiError}</p>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm mt-2" 
                        onClick={handleBuildLesson}
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary btn-large w-full mt-6"
                    disabled={state.lessonStatus as any === "loading"}
                  >
                    Build My Learning Path
                  </button>
                </form>

                {/* Pre-configured suggestion tags */}
                <div className="suggested-topics-container mt-6">
                  <span className="suggested-label text-sm font-semibold">Suggested Topics:</span>
                  <div className="suggestions-list flex gap-2 mt-2 justify-center">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm suggestion-tag-btn"
                      onClick={() => { setTopicText("Python Functions"); handleBuildLesson(undefined, "Python Functions"); }}
                    >
                      Python Functions
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm suggestion-tag-btn"
                      onClick={() => { setTopicText("Photosynthesis"); handleBuildLesson(undefined, "Photosynthesis"); }}
                    >
                      Photosynthesis
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm suggestion-tag-btn"
                      onClick={() => { setTopicText("Fractions"); handleBuildLesson(undefined, "Fractions"); }}
                    >
                      Fractions
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {state.phase === "intro" && state.lesson && (
          <div className="intro-stage learning-card">
            <div className="card-header">
              <span className="card-badge">Lesson Introduction</span>
              <ListenButton text={getIntroSpeech()} />
            </div>
            
            <h2 className="intro-title">{state.lesson.topicTitle}</h2>
            <div className="intro-explanation mt-4">
              <p>{state.lesson.intro}</p>
              
              <h3 className="intro-concepts-header mt-4 font-bold text-lg">Foundational Concepts Covered:</h3>
              <ul className="intro-concepts-list flex flex-col gap-3">
                {state.lesson.concepts.map((concept) => (
                  <li key={concept.id} className="concept-intro-item">
                    <strong>{concept.name}:</strong> {concept.description}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              className="btn btn-primary mt-6"
              onClick={() => dispatch({ type: "GO_TO_PRACTICE" })}
            >
              Try Practice Question
            </button>
          </div>
        )}

        {state.phase === "practice" && state.lesson && (
          <QuestionCard
            currentAttemptCount={state.concepts[state.lesson.initialQuestion.conceptId]?.attempts || 0}
            recentOutcome={state.concepts[state.lesson.initialQuestion.conceptId]?.recentOutcome || null}
            question={state.lesson.initialQuestion}
            onSubmitAnswer={(payload) => dispatch({ type: "SUBMIT_PRACTICE_ANSWER", payload })}
            onContinue={() => dispatch({ type: "START_MISSION" })}
            onHelpRequest={() => dispatch({ type: "REQUEST_HELP" })}
          />
        )}

        {state.phase === "recoveryDiagnosis" && state.lesson && (
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
                {apiError && <p className="error-detail text-sm mt-1">{apiError}</p>}
                <button 
                  type="button" 
                  className="btn btn-primary mt-4" 
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
              <div className="dev-banner mt-4">
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
              <ListenButton text={getRetestSpeech()} />
              {state.recovery.recovered === false && (
                <span className="retest-status-badge fail">Retest Failed</span>
              )}
            </div>

            <h3 className="retest-title">{retestQuestionText}</h3>
            <p className="retest-desc">
              Solve this related question to verify your understanding.
            </p>

            {!retestSubmitted ? (
              <form onSubmit={handleRetestSubmit} className="retest-form mt-4">
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
                  className="btn btn-primary mt-6" 
                  disabled={!selectedRetestOption}
                >
                  Submit Re-test
                </button>
              </form>
            ) : (
              <div className="feedback-section" role="status" aria-live="polite">
                {state.recovery.recovered ? (
                  <div className="feedback-correct">
                    <p className="feedback-msg">✓ Excellent! You successfully recovered the concept.</p>
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

        {state.phase === "mission" && state.lesson && (
          <div>
            {state.mission.evaluationStatus === "error" && (
              <div className="error-alert mb-4" role="alert">
                <p className="error-msg">⚠️ Evaluation failed: {apiError || "Unable to contact evaluation service."}</p>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm mt-2" 
                  onClick={handleEvaluateMission}
                >
                  Retry Evaluation
                </button>
              </div>
            )}

            <MissionCard
              missionState={state.mission}
              mission={state.lesson.mission}
              onSaveSubmission={(submission) => dispatch({ type: "SET_MISSION_SUBMISSION", payload: { submission } })}
              onUseHint={() => dispatch({ type: "SET_HINT_USED" })}
              onSubmitMission={handleEvaluateMission}
              onDevelopmentMockEvaluation={(passed) => {
                dispatch({
                  type: "SET_MISSION_RESULT",
                  payload: {
                    passed,
                    feedback: passed 
                      ? "Excellent work! Your submission successfully meets the grading criteria." 
                      : "The solution was close, but didn't completely cover all required rubric checks.",
                    weakness: null,
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

            <div className="evaluation-box mt-4" role="status" aria-live="polite">
              {state.mission.passed ? (
                <div className="eval-status pass">✓ MISSION PASSED</div>
              ) : (
                <div className="eval-status fail">✗ MISSION FAILED</div>
              )}

              <p className="eval-feedback"><strong>Feedback:</strong> {state.mission.feedback}</p>
              
              {state.mission.weakness && state.concepts[state.mission.weakness] && (
                <p className="eval-weakness text-danger">
                  <strong>Concept Focus Required:</strong> {state.concepts[state.mission.weakness].name}
                </p>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary mt-6"
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
                <button type="button" className="btn btn-primary btn-sm mt-2" onClick={handleGetNextAction}>
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
        Current phase is: {state.phase}. {state.lesson ? `Mastery is ${state.concepts[state.currentConcept]?.mastery || 0}% for ${state.concepts[state.currentConcept]?.name || state.currentConcept}.` : ""}
      </div>
    </div>
  );
}

export default App;
