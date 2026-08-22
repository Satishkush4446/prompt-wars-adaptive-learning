import { useState, useEffect } from "react";
import type { MissionState } from "../state/learnerTypes";
import ListenButton from "./ListenButton";

interface MissionCardProps {
  missionState: MissionState;
  mission: {
    title: string;
    goal: string;
    instructions: string;
    starterContent: string;
    rubric: string[];
  };
  onSaveSubmission: (submission: string) => void;
  onUseHint: () => void;
  onSubmitMission: () => void;
  onDevelopmentMockEvaluation: (passed: boolean) => void;
  lang?: string;
}

export default function MissionCard({
  missionState,
  mission,
  onSaveSubmission,
  onUseHint,
  onSubmitMission,
  onDevelopmentMockEvaluation,
  lang = "English",
}: MissionCardProps) {
  const [submissionText, setSubmissionText] = useState<string>("");

  // Initialize submissionText from state or starterContent
  useEffect(() => {
    if (missionState.submission) {
      setSubmissionText(missionState.submission);
    } else {
      setSubmissionText(mission.starterContent);
      onSaveSubmission(mission.starterContent);
    }
  }, [missionState.submission, mission.starterContent]);

  const [showHint, setShowHint] = useState<boolean>(missionState.hintUsed);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSubmissionText(val);
    onSaveSubmission(val);
  };

  const handleHintClick = () => {
    setShowHint(true);
    onUseHint();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitMission();
  };

  const speechText = `Mission: ${mission.title}. Goal: ${mission.goal}. Instructions: ${mission.instructions}`;

  return (
    <div className="learning-card mission-card">
      <div className="card-header mission-header">
        <div className="header-badges">
          <span className="card-badge mission-badge">MISSION UNLOCKED</span>
        </div>
        <ListenButton text={speechText} lang={lang} />
      </div>

      <h3 className="mission-title">{mission.title}</h3>
      <p className="text-secondary text-sm mt-1 font-medium">Apply what you learned.</p>
      
      <div className="mission-instructions">
        <p><strong>Goal:</strong> {mission.goal}</p>
        <p><strong>Instructions:</strong> {mission.instructions}</p>
      </div>

      <form onSubmit={handleSubmit} className="mission-form mt-4">
        <div className="textarea-container">
          <label htmlFor="mission-response-input" className="code-input-label">
            Write your solution below:
          </label>
          <textarea
            id="mission-response-input"
            className="mission-textarea code-block"
            value={submissionText}
            onChange={handleTextareaChange}
            maxLength={4000}
            rows={10}
            spellCheck={false}
          />
          <div className="char-count">{submissionText.length}/4000 characters</div>
        </div>

        {showHint ? (
          <div className="hint-box mt-4" role="status" aria-live="polite">
            <p className="hint-text">
              <strong>Hint:</strong> Focus on satisfying the following criteria:
            </p>
            <ul className="rubric-list-hint">
              {mission.rubric.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <button 
            type="button" 
            className="btn btn-secondary btn-hint mt-4" 
            onClick={handleHintClick}
          >
            Use a Hint (-3 Mastery penalty)
          </button>
        )}

        <div className="button-group mission-buttons mt-4">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={missionState.evaluationStatus === "loading" || submissionText.trim().length === 0}
          >
            {missionState.evaluationStatus === "loading" ? "Evaluating..." : "Submit Mission Solution"}
          </button>
        </div>
      </form>

      {/* Show evaluation status/error */}
      {missionState.evaluationStatus === "loading" && (
        <div className="evaluation-status-alert status-loading mt-4" role="status" aria-live="polite">
          <p>AI Evaluator is inspecting your submission...</p>
        </div>
      )}

      {import.meta.env.DEV && missionState.evaluationStatus === "idle" && (
        <div className="evaluation-status-alert status-pending mt-4">
          <p><strong>Note:</strong> Dev Mocks: Bypass real evaluation call</p>
          <div className="button-group dev-buttons">
            <button 
              type="button" 
              className="btn btn-success btn-sm" 
              onClick={() => onDevelopmentMockEvaluation(true)}
            >
              Mock PASS (+20 Mastery)
            </button>
            <button 
              type="button" 
              className="btn btn-danger btn-sm" 
              onClick={() => onDevelopmentMockEvaluation(false)}
            >
              Mock FAIL (-10 Mastery)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
